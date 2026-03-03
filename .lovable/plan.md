

# Adicionar Cargo e Empresa Atual na extensão Chrome e aba Mapeados

## Contexto
A tabela `party` já tem um campo `headline` que é exibido na lista de candidatos. Não existe campo separado para "cargo atual" e "empresa atual". Precisamos adicionar esses dois campos.

## Plano

### 1. Migração: adicionar colunas `current_title` e `current_company` na tabela `party`
- `current_title TEXT` (nullable) -- cargo atual
- `current_company TEXT` (nullable) -- empresa atual

### 2. Atualizar a RPC `resolve_party` para aceitar os novos parâmetros
- Adicionar `p_current_title TEXT DEFAULT NULL` e `p_current_company TEXT DEFAULT NULL`
- Na criação, gravar os valores; na atualização de party existente, preencher apenas se os campos estiverem vazios (mesmo padrão COALESCE atual)

### 3. Atualizar `ChromeExtension.tsx`
- Adicionar campos `cargo` e `empresaAtual` no estado, pré-preenchidos via URL params (`?nome=...&url=...&cargo=...&empresa=...`)
- Dois novos inputs no formulário (entre LinkedIn e Vaga)
- Passar `p_current_title` e `p_current_company` na chamada `resolve_party`

### 4. Atualizar a listagem na aba Mapeados (`CandidateListView.tsx`)
- O `_party` retornado pelo hook `useApplicationsWithParties` já faz `select('id, full_name, email_raw, phone_raw, headline, linkedin_url')` — adicionar `current_title, current_company` nessa query
- Exibir cargo e empresa abaixo do nome do candidato (no mesmo espaço onde hoje mostra `headline`), no formato "Cargo · Empresa" ou só um deles se o outro estiver vazio

### 5. Atualizar o tipo `ApplicationWithRelations` em `types/ats.ts`
- Adicionar `current_title` e `current_company` ao tipo `_party`

