

# Pretensão Salarial — Sempre Visível e Editável

## Problema
O campo de pretensão salarial só aparece quando já tem valor preenchido (`salary_expectation != null`). Como nenhum candidato tem esse dado preenchido no banco, o campo nunca é exibido. Além disso, no diálogo de detalhes do candidato, o campo é apenas leitura — não há como o recrutador preencher ou editar.

## Solução

### 1. `CandidateDetailDialog.tsx` — Campo editável de pretensão salarial
- Remover a condição `!= null` que esconde o bloco
- Transformar de texto estático para um `Input` editável com máscara de valor em BRL
- Adicionar estado local `salaryExpectation` (como `notes` e `rating` já funcionam)
- Salvar junto com notas/rating no `handleSaveNotes`

### 2. `CandidateKanban.tsx` — Manter condicional (só mostrar se preenchido)
- O Kanban card já exibe corretamente quando há valor — sem mudança necessária

### 3. `CandidateListView.tsx` — Adicionar coluna de pretensão salarial
- Adicionar coluna visível no desktop (`hidden md:table-cell`) mostrando o valor formatado ou "—"

### Arquivos modificados:
1. `src/components/jobs/CandidateDetailDialog.tsx` — campo editável
2. `src/components/jobs/CandidateListView.tsx` — coluna na tabela

