

# Mapeamento de Vagas — Limite de Visibilidade + Colunas Cidade/Estado

## Problema 1: Limite de visibilidade
A query atual usa `supabase.from('job_postings').select('*')` sem paginação. O Supabase limita queries a 1000 linhas por padrão, truncando silenciosamente os resultados. Atualmente há apenas 11 registros, mas conforme o Manus gerar mais vagas, o limite será atingido. A solução é usar o utilitário `fetchAllRows` que já existe no projeto (`src/lib/fetchAllRows.ts`) para buscar todos os registros em lotes.

## Problema 2: Cidade e Estado em uma coluna só
Atualmente a tabela mostra "Local" como uma única coluna combinando cidade e estado. O pedido é separar em duas colunas distintas.

## Mudanças

### `src/pages/MapeamentoVagas.tsx`
1. **Importar `fetchAllRows`** e usá-lo na `queryFn` em vez do `supabase.from().select()` direto
2. **Separar a coluna "Local"** em duas colunas: "Cidade" e "Estado" (UF)
3. Manter responsividade: no mobile, esconder a coluna Estado (`hidden md:table-cell`)

Apenas 1 arquivo modificado.

