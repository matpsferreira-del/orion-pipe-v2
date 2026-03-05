

# Plano: Abrir permissões de edição para todos os usuários (exceto faturamento)

## Objetivo
Permitir que todos os usuários autenticados possam criar, editar e excluir dados de recrutamento (ATS) e comercial (CRM). As permissões de faturamento (tabela `invoices`) permanecem inalteradas.

## Tabelas afetadas e mudanças nas políticas RLS

### CRM / Comercial

**1. `companies`**
- UPDATE: de "responsavel + admin/gestor" → todos autenticados
- DELETE: de "admin only" → todos autenticados

**2. `contacts`**
- INSERT (autenticado): de "admin ou company access" → todos autenticados
- UPDATE: de "admin ou company access" → todos autenticados
- DELETE: de "admin/gestor" → todos autenticados

**3. `opportunities`**
- UPDATE: de "responsavel + admin/gestor" → todos autenticados
- DELETE: de "admin only" → todos autenticados

**4. `activities`**
- INSERT: de "own user_id" → todos autenticados
- UPDATE: de "own user_id" → todos autenticados
- DELETE: de "own user_id" → todos autenticados

**5. `tasks`**
- INSERT: de "own user/responsavel" → todos autenticados
- UPDATE: de "own user/responsavel" → todos autenticados
- DELETE: de "own user_id" → todos autenticados

### ATS / Recrutamento

**6. `jobs`**
- UPDATE: de "responsavel/created_by/admin/gestor" → todos autenticados
- DELETE: de "admin only" → todos autenticados

**7. `applications`**
- UPDATE: de "responsavel/created_by/admin/gestor" → todos autenticados
- DELETE: de "admin only" → todos autenticados

**8. `job_pipeline_stages`**
- ALL (manage): de "responsavel/created_by/admin/gestor" → todos autenticados

**9. `party`**
- DELETE: de "admin only" → todos autenticados (UPDATE ja permite todos autenticados)

### SEM alteração
- **`invoices`** — mantém políticas atuais (admin/gestor para insert/update, admin para delete)
- **SELECT policies** — sem alteração (mantém visibilidade baseada em company access)

## Implementação
Uma única migração SQL que:
1. Faz `DROP POLICY` das políticas restritivas listadas acima
2. Cria novas políticas com `auth.uid() IS NOT NULL` para as operações correspondentes

## Frontend
- Remover verificação `isAdmin` no `Faturamento.tsx` para editar/excluir — **NÃO**, isso deve continuar restrito
- Verificar se há guards no frontend que bloqueiam edição para consultores em CRM/ATS e removê-los se necessário

