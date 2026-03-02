
# Seleção em Massa de Candidatos no Kanban

## Objetivo
Adicionar checkboxes nos cards do Kanban de candidatos dentro das vagas, permitindo selecionar multiplos candidatos para executar ações em massa: **enviar email**, **reprovar** ou **aprovar para a próxima etapa**.

## Mudanças Planejadas

### 1. Estado de seleção no JobDetail
- Adicionar estado `selectedApplicationIds: Set<string>` no `JobDetail.tsx`
- Passar esse estado e funções de toggle para o `CandidateKanban`
- Renderizar a **barra de ações em massa** quando houver candidatos selecionados

### 2. Checkbox nos cards do Kanban (`CandidateKanban.tsx`)
- Adicionar uma prop `selectedIds` e `onToggleSelect` ao `CandidateKanban` e ao `CandidateCard`
- Inserir um `Checkbox` no canto superior esquerdo de cada card (antes do Avatar)
- O clique no checkbox nao deve abrir o detalhe do candidato (`stopPropagation`)
- Adicionar um checkbox "selecionar todos" no header de cada coluna do Kanban

### 3. Barra de ações em massa (no `JobDetail.tsx`)
- Quando `selectedIds.size > 0`, exibir uma barra fixa na parte superior da aba "Candidatos" com:
  - Contagem: "X candidatos selecionados"
  - Botao **"Enviar Email"** -- abre `mailto:` com todos os emails dos selecionados
  - Botao **"Reprovar"** -- altera status para `rejected` em todos os selecionados
  - Botao **"Aprovar para Próxima Etapa"** -- move cada candidato para a etapa seguinte no pipeline (baseado na posição atual + 1)
  - Botao **"Limpar Seleção"**
- Usar `AlertDialog` para confirmar ações destrutivas (reprovar)

### 4. Lógica de ações em massa
- **Email**: coletar `email_raw` dos parties selecionados e abrir `mailto:` com BCC
- **Reprovar**: loop chamando `useUpdateApplicationStatus` para cada ID selecionado
- **Aprovar próxima etapa**: para cada candidato, encontrar o stage atual, buscar o próximo stage (position + 1), e chamar `useUpdateApplicationStage`
- Após cada ação, limpar a seleção

## Detalhes Técnicos

### Arquivos modificados:
1. **`src/components/jobs/CandidateKanban.tsx`** -- Adicionar props de seleção, checkbox nos cards e "selecionar todos" nas colunas
2. **`src/components/jobs/JobDetail.tsx`** -- Estado de seleção, barra de ações em massa, handlers de ações bulk

### Nenhuma mudança de banco de dados necessaria
As ações usam os hooks existentes (`useUpdateApplicationStatus`, `useUpdateApplicationStage`). O email usa `mailto:` nativo.

### Fluxo do usuario:
1. Marca checkboxes nos candidatos desejados (ou "selecionar todos" da coluna)
2. Barra de ações aparece no topo
3. Clica na ação desejada
4. Confirmação para ações destrutivas
5. Execução e limpeza da seleção
