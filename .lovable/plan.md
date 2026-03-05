

# Plano: Busca avançada com campos estruturados e pesquisa booleana

## Resumo
Substituir o campo de busca simples de candidatos por um painel de busca avançada expansível com campos individuais (como na imagem de referência) e suporte a operadores booleanos (AND, OR, aspas para frase exata, parênteses) no campo de texto principal.

## Alterações

### 1. Novo componente `AdvancedCandidateSearch.tsx`
Criar um componente colapsável (usando Collapsible) com:
- **Campo de busca booleana** no topo — aceita operadores `AND`, `OR`, `()`, `""` para combinar termos livremente em todos os campos do candidato
- **Campos individuais (dropdowns e inputs):**
  - Cargo (input texto — filtra `current_title`)
  - Empresa (input texto — filtra `current_company`)
  - Localidade (select com cidades/estados disponíveis nos candidatos da vaga)
  - Competências/Tags (multi-select com tags existentes nos candidatos)
  - Pretensão salarial (range min/max)
  - Fonte/Origem (select com opções: Manual, Indicação, LinkedIn, etc.)
  - Rating (select: 1-5 estrelas mínimo)
- Botões "Aplicar Filtros" e "Limpar"
- Exibir badges removíveis para filtros ativos

### 2. Lógica de parsing booleano (`src/utils/booleanSearch.ts`)
Criar um parser simples que:
- Divide a query em tokens respeitando aspas (`"full stack"`)
- Interpreta `AND` (padrão entre termos), `OR`, e parênteses para agrupamento
- Retorna uma função `(text: string) => boolean` para testar cada candidato
- Exemplo: `"gerente AND (São Paulo OR Curitiba)"` → match se contém "gerente" E ("São Paulo" OU "Curitiba")

### 3. Atualizar `JobDetail.tsx`
- Substituir o `Input` de busca simples pelo novo `AdvancedCandidateSearch`
- Receber os filtros estruturados + query booleana como estado
- Atualizar o `filteredApplications` useMemo para aplicar todos os filtros combinados

### 4. Atualizar `useApplications.ts` — incluir `tags` no fetch
- Adicionar `tags` ao `.select()` do `fetchAllParties` para suportar filtragem por competências/tags

### 5. Atualizar `ApplicationWithRelations` em `src/types/ats.ts`
- Adicionar `tags: string[]` ao tipo `_party`

## Detalhes técnicos
- Sem alterações no banco de dados — `tags` já existe na tabela `party`
- Toda a filtragem é client-side (dados já em memória)
- O parser booleano é uma função pura, testável e reutilizável
- Arquivos criados: `AdvancedCandidateSearch.tsx`, `src/utils/booleanSearch.ts`
- Arquivos modificados: `JobDetail.tsx`, `useApplications.ts`, `src/types/ats.ts`

