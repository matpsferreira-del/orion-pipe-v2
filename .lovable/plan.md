

# Plano: Ordenação e filtro avançado de candidatos nas vagas

## Resumo
Adicionar controles de ordenação por coluna em cada etapa (Kanban e lista) e um campo de busca/filtro textual que pesquisa em nome, cidade, estado, cargo, empresa, headline e notas do candidato.

## Alterações

### 1. `CandidateListView.tsx` — Ordenação por colunas + filtro textual

- Adicionar estado local `sortField` (nome, cargo, empresa, etapa, pretensão, data) e `sortDirection` (asc/desc).
- Tornar os `TableHead` clicáveis para alternar a ordenação, exibindo um ícone de seta indicando a direção.
- Adicionar um `Input` de busca acima da tabela que filtra candidatos por: `full_name`, `current_title`, `current_company`, `headline`, `city`, `state` (do party), `notes` (da application).
- Aplicar `useMemo` para filtrar e ordenar as applications antes de renderizar.

### 2. `CandidateKanban.tsx` — Ordenação dentro de cada coluna

- Adicionar um `Select` compacto no header de cada coluna Kanban para escolher a ordenação (Nome A-Z, Nome Z-A, Rating, Data de inscrição, Pretensão salarial).
- Ordenar o array de applications dentro de cada coluna com `useMemo`.

### 3. `JobDetail.tsx` — Filtro global propagado

- Adicionar um `Input` de busca textual acima das abas (Mapeados/Triagem/Etapas) que filtra `applications` antes de passá-las aos componentes filhos.
- O filtro pesquisa em: `full_name`, `current_title`, `current_company`, `headline`, `email_raw`, `city` (campo do party — já disponível? Precisa verificar).

### 4. `useApplications.ts` — Incluir `city` e `state` no fetch de parties

- Na função `fetchAllParties`, adicionar `city, state` ao `.select()` para que esses campos estejam disponíveis no frontend para filtragem.

### 5. `ApplicationWithRelations` type (`src/types/ats.ts`)

- Adicionar `city` e `state` opcionais ao tipo `_party` dentro de `ApplicationWithRelations`.

## Detalhes técnicos

- Nenhuma alteração de banco de dados necessária — `city` e `state` já existem na tabela `party`.
- A ordenação e filtragem são 100% client-side (os dados já estão carregados em memória).
- Arquivos modificados: `CandidateListView.tsx`, `CandidateKanban.tsx`, `JobDetail.tsx`, `useApplications.ts`, `src/types/ats.ts`.

