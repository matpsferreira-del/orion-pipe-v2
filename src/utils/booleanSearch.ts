/**
 * Boolean search parser supporting AND, OR, quotes for exact phrases, and parentheses.
 * Default operator between terms is AND.
 * Case-insensitive matching.
 */

type ASTNode =
  | { type: 'term'; value: string }
  | { type: 'and'; left: ASTNode; right: ASTNode }
  | { type: 'or'; left: ASTNode; right: ASTNode };

function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < query.length) {
    if (query[i] === ' ' || query[i] === '\t') { i++; continue; }
    if (query[i] === '(' || query[i] === ')') {
      tokens.push(query[i]); i++; continue;
    }
    if (query[i] === '"') {
      const end = query.indexOf('"', i + 1);
      if (end === -1) {
        tokens.push(query.slice(i + 1).toLowerCase());
        i = query.length;
      } else {
        tokens.push(query.slice(i + 1, end).toLowerCase());
        i = end + 1;
      }
      continue;
    }
    let end = i;
    while (end < query.length && query[end] !== ' ' && query[end] !== '(' && query[end] !== ')') end++;
    const word = query.slice(i, end);
    const upper = word.toUpperCase();
    if (upper === 'AND' || upper === 'OR' || upper === 'E' || upper === 'OU') {
      tokens.push(upper === 'E' ? 'AND' : upper === 'OU' ? 'OR' : upper);
    } else {
      tokens.push(word.toLowerCase());
    }
    i = end;
  }
  return tokens;
}

function parse(tokens: string[]): ASTNode | null {
  let pos = 0;

  function parseOr(): ASTNode | null {
    let left = parseAnd();
    while (pos < tokens.length && tokens[pos] === 'OR') {
      pos++;
      const right = parseAnd();
      if (left && right) left = { type: 'or', left, right };
    }
    return left;
  }

  function parseAnd(): ASTNode | null {
    let left = parsePrimary();
    while (pos < tokens.length && tokens[pos] !== ')' && tokens[pos] !== 'OR') {
      if (tokens[pos] === 'AND') pos++;
      const right = parsePrimary();
      if (left && right) left = { type: 'and', left, right };
      else if (right) left = right;
    }
    return left;
  }

  function parsePrimary(): ASTNode | null {
    if (pos >= tokens.length) return null;
    if (tokens[pos] === '(') {
      pos++;
      const node = parseOr();
      if (pos < tokens.length && tokens[pos] === ')') pos++;
      return node;
    }
    if (tokens[pos] === ')' || tokens[pos] === 'AND' || tokens[pos] === 'OR') return null;
    const value = tokens[pos++];
    return { type: 'term', value };
  }

  return parseOr();
}

function evaluate(node: ASTNode, text: string): boolean {
  switch (node.type) {
    case 'term': return text.includes(node.value);
    case 'and': return evaluate(node.left, text) && evaluate(node.right, text);
    case 'or': return evaluate(node.left, text) || evaluate(node.right, text);
  }
}

/**
 * Creates a matcher function from a boolean search query.
 * Returns a function that tests if a given text matches the query.
 * Empty query matches everything.
 */
export function createBooleanMatcher(query: string): (text: string) => boolean {
  const trimmed = query.trim();
  if (!trimmed) return () => true;
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return () => true;
  const ast = parse(tokens);
  if (!ast) return () => true;
  return (text: string) => evaluate(ast, text.toLowerCase());
}
