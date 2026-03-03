

# Otimizacao Mobile Completa — Todas as Abas

## Problemas Identificados

Analisei todas as 14 paginas da aplicacao. Os problemas se repetem em padroes:

1. **Padding fixo `p-6`** — Quase todas as paginas usam `p-6` sem responsividade, desperdicando espaco em telas pequenas
2. **Tabelas com muitas colunas** — Contatos (8 cols), Empresas (8+ cols), Oportunidades (10 cols), Faturamento (9 cols) — ficam ilegíveis no mobile
3. **Botoes de acao empilhados** — PageHeader com 3-7 botoes em linha (ex: Empresas tem 7 botoes) que estouram no mobile
4. **JobCard em modo lista** — A seção direita com badges/avatars/datas forca overflow horizontal
5. **Filtros com larguras fixas** — SelectTrigger com `w-[180px]`, `w-[200px]` que nao cabem
6. **Tabs com texto longo** — "Rascunhos", "Encerradas" etc. que quebram em telas pequenas
7. **Configuracoes** — TabsList com `grid-cols-5` que esmaga 5 abas em tela pequena
8. **Kanban do Pipeline** — Colunas `w-72` fixas sem alternativa mobile

## Plano de Mudancas

### 1. Vagas (`Vagas.tsx` + `JobCard.tsx`)
- **JobCard lista mobile**: No mobile, empilhar info verticalmente — titulo + empresa em cima, badges + meta embaixo, em vez de tentar tudo em uma unica row
- **Filtros**: Status select `w-[180px]` → `w-full sm:w-[180px]`; esconder ToggleGroup no mobile (forcar grid view)
- **Tabs**: Reduzir font-size e padding no mobile com classes `text-xs px-2`

### 2. Contatos (`Contatos.tsx`)
- Esconder colunas secundarias (WhatsApp, LinkedIn, Telefone) no mobile via `hidden md:table-cell`
- Mostrar apenas: Nome, Empresa, Email, Acoes
- Botoes de acao: agrupar em um dropdown "Acoes" no mobile em vez de 3 botoes separados

### 3. Empresas (`Empresas.tsx`)
- Mesma abordagem: esconder colunas Segmento, Porte, Cidade no mobile
- Os 7 botoes do header: no mobile, agrupar em um unico dropdown "Mais acoes"
- Padding `p-4 md:p-6`

### 4. Oportunidades (`Oportunidades.tsx`)
- De 10 colunas para 3-4 no mobile: Empresa, Etapa, Valor, Acoes
- Esconder: Contato, Probabilidade, Tipo, Origem, Previsao, Responsavel

### 5. Pipeline (`Pipeline.tsx`)
- Padding `p-4 md:p-6`
- No mobile, colunas Kanban com `w-[280px]` ou `w-[85vw]` para melhor scroll horizontal
- Filtros responsivos

### 6. Tarefas (`Tarefas.tsx`)
- Padding `p-4 md:p-6`
- Stats cards: manter `grid-cols-2` que ja funciona
- Filtros de Select: `w-full sm:w-[150px]`

### 7. Faturamento (`Faturamento.tsx`)
- Esconder colunas: Descricao, Emissao, Pagamento no mobile
- Manter: Nota, Cliente, Vencimento, Valor, Status, Acoes
- Padding `p-4 md:p-6`
- Botoes de acao: dropdown no mobile

### 8. Pessoas (`Pessoas.tsx`)
- Esconder coluna Tags no mobile
- Padding `p-4 md:p-6`
- Filtros Select: `w-full sm:w-[180px]`; stack verticalmente `flex-col sm:flex-row`

### 9. RecrutamentoDashboard
- Padding `p-4 md:p-6`
- Ja usa grids responsivos, apenas ajustar padding

### 10. Relatorios
- Padding `p-4 md:p-6`
- Ja usa `lg:grid-cols-2` que funciona

### 11. Equipe
- Padding `p-4 md:p-6`
- Ja usa grid responsivo

### 12. Configuracoes
- TabsList: `grid-cols-5 max-w-2xl` → mobile: usar `flex overflow-x-auto` em vez de grid fixo de 5 colunas
- Grids `grid-cols-2` dentro dos forms → `grid-cols-1 sm:grid-cols-2`
- Padding `p-4 md:p-6`

### 13. MapeamentoVagas
- Padding `p-4 md:p-6`
- Esconder colunas secundarias da tabela

### 14. JobDetail (Sheet de detalhe da vaga)
- CandidateListView: esconder colunas secundarias no mobile
- Manter: checkbox, nome, acoes

### 15. PageHeader (`page-header.tsx`)
- Quando `actions` tem muitos botoes, usar `flex-wrap gap-2` (ja usa `flex-col sm:flex-row`)

## Arquivos Modificados

1. `src/pages/Vagas.tsx` — padding + filtros responsivos
2. `src/components/jobs/JobCard.tsx` — layout lista mobile empilhado
3. `src/pages/Contatos.tsx` — colunas hidden + padding + botoes agrupados
4. `src/pages/Empresas.tsx` — colunas hidden + padding + botoes em dropdown mobile
5. `src/pages/Oportunidades.tsx` — colunas hidden + padding
6. `src/pages/Pipeline.tsx` — padding + kanban sizing
7. `src/pages/Tarefas.tsx` — padding + filtros responsivos
8. `src/pages/Faturamento.tsx` — colunas hidden + padding + botoes
9. `src/pages/Pessoas.tsx` — colunas hidden + padding + filtros
10. `src/pages/RecrutamentoDashboard.tsx` — padding
11. `src/pages/Relatorios.tsx` — padding
12. `src/pages/Equipe.tsx` — padding
13. `src/pages/Configuracoes.tsx` — tabs overflow + grids responsivos
14. `src/pages/MapeamentoVagas.tsx` — padding + colunas hidden
15. `src/components/jobs/CandidateListView.tsx` — colunas hidden mobile

Nenhuma mudanca de banco necessaria.

