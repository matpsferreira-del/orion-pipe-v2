

# Reestruturação da UI de Candidatos na Vaga: Triagem (Lista) + Etapas (Kanban)

## Objetivo
Reorganizar a aba "Candidatos" dentro do detalhe da vaga em **duas sub-abas**:
1. **Triagem** — Lista tabular de todos os candidatos (como na imagem de referência), com checkboxes para seleção em massa e ações (triar para etapa, reprovar, email)
2. **Etapas** — O Kanban existente com as colunas do pipeline

## Mudanças Planejadas

### 1. Reestruturar tabs no `JobDetail.tsx`
- Substituir a tab "Candidatos" por duas sub-tabs aninhadas: **"Triagem"** e **"Etapas"**
- A tab "Triagem" mostra a lista tabular; a tab "Etapas" mostra o `CandidateKanban` existente
- Manter a tab "Detalhes" como está
- A barra de ações em massa (`BulkActionBar`) funciona em ambas as sub-tabs

### 2. Criar componente `CandidateListView.tsx` (novo arquivo)
Componente de lista tabular inspirado na imagem de referência:
- **Tabela** com colunas: Checkbox, Candidato (nome + idade + localização + ícones de contato), Situação (status da application), Data inscrição, Ações
- **Checkbox** em cada linha + checkbox "selecionar todos" no header
- **Coluna "Ações"**: dropdown com opções para triar o candidato para uma etapa específica do Kanban (lista as etapas do pipeline), reprovar, ou abrir detalhes
- Ao clicar no nome do candidato, abre o `CandidateDetailDialog` existente
- Reutiliza os mesmos `selectedIds` e `onToggleSelect` do `JobDetail`

### 3. Adicionar ação "Triar para Etapa" no `BulkActionBar`
- Além de "Próxima Etapa" e "Reprovar", adicionar um dropdown **"Mover para Etapa"** que lista todas as etapas do pipeline
- Permite mover os candidatos selecionados diretamente para qualquer etapa (não apenas a próxima)

### Arquivos modificados:
1. **`src/components/jobs/CandidateListView.tsx`** — Novo componente com tabela de triagem
2. **`src/components/jobs/JobDetail.tsx`** — Reestruturar tabs com sub-tabs Triagem/Etapas
3. **`src/components/jobs/BulkActionBar.tsx`** — Adicionar dropdown "Mover para Etapa"

### Nenhuma mudança de banco necessária
Toda a lógica usa os hooks existentes (`useUpdateApplicationStage`, `useUpdateApplicationStatus`).

