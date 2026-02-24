

## Duas melhorias: Criar Vaga a partir da Oportunidade + Pretensao Salarial nos Candidatos

### 1. Criar Vaga a partir da Oportunidade

**Problema:** Hoje nao existe vinculo entre oportunidades (CRM) e vagas (ATS). O usuario precisa criar a vaga manualmente, sem rastreabilidade de onde ela surgiu.

**Solucao:**

**1a. Migracao no banco de dados**
- Adicionar coluna `opportunity_id` (uuid, nullable, FK para `opportunities.id`) na tabela `jobs`
- Atualizar a policy de SELECT para que vagas vinculadas a oportunidades acessiveis sejam visiveis

**1b. Botao "Criar Vaga" no detalhe da Oportunidade**
- No componente `OpportunityDetail.tsx`, adicionar um botao "Criar Vaga" ao lado do botao "Gerar Proposta"
- Ao clicar, abre o `JobDialog` ja pre-preenchido com:
  - `company_id` da oportunidade
  - `contact_id` da oportunidade  
  - `responsavel_id` da oportunidade
  - `opportunity_id` para o vinculo

**1c. Atualizar JobDialog para aceitar `opportunity_id`**
- Adicionar prop opcional `preSelectedOpportunityId` no `JobDialog`
- Adicionar prop opcional para pre-preencher `company_id`, `contact_id`, `responsavel_id`
- Incluir `opportunity_id` no payload de criacao

**1d. Atualizar hooks e tipos**
- Atualizar `JobInsert` em `useJobs.ts` para incluir `opportunity_id`
- O tipo sera atualizado automaticamente pelo Supabase types

**1e. Exibir vinculo na vaga**
- No `JobDetail.tsx`, mostrar badge/link indicando a oportunidade de origem quando `opportunity_id` existir

---

### 2. Pretensao Salarial dos Candidatos

**Problema:** Nao existe campo para registrar a pretensao salarial do candidato. Essa informacao nao aparece no Kanban nem no detalhe do candidato.

**Solucao:**

**2a. Migracao no banco de dados**
- Adicionar coluna `salary_expectation` (numeric, nullable) na tabela `applications`

**2b. Formulario publico de candidatura**
- Adicionar campo "Pretensao Salarial" no formulario publico (`PublicJobDetail.tsx`)
- Atualizar o schema zod para incluir `salary_expectation`
- Passar o valor na insercao via edge function `public-apply`

**2c. Adicionar candidato manualmente**
- No `AddCandidateDialog.tsx`, adicionar campo de pretensao salarial
- Enviar o valor ao criar a application

**2d. Exibir no Kanban**
- No card do candidato (`CandidateKanban.tsx`), mostrar a pretensao salarial formatada em BRL quando preenchida

**2e. Exibir no detalhe do candidato**
- No `CandidateDetailDialog.tsx`, exibir a pretensao salarial na secao de informacoes

**2f. Atualizar tipos e hooks**
- Atualizar `ApplicationWithRelations` e queries para incluir `salary_expectation`

---

### Detalhes tecnicos

**Migracao SQL (uma unica migracao):**

```sql
-- 1. Vinculo oportunidade -> vaga
ALTER TABLE public.jobs
  ADD COLUMN opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- 2. Pretensao salarial na candidatura
ALTER TABLE public.applications
  ADD COLUMN salary_expectation numeric;
```

**Arquivos modificados:**
- `src/components/opportunities/OpportunityDetail.tsx` - botao "Criar Vaga" + estado para abrir JobDialog
- `src/components/jobs/JobDialog.tsx` - props para pre-preenchimento e opportunity_id
- `src/hooks/useJobs.ts` - adicionar `opportunity_id` ao tipo `JobInsert`
- `src/components/jobs/JobDetail.tsx` - exibir badge de oportunidade vinculada
- `src/pages/public/PublicJobDetail.tsx` - campo pretensao salarial no form
- `src/components/jobs/AddCandidateDialog.tsx` - campo pretensao salarial
- `src/components/jobs/CandidateKanban.tsx` - exibir pretensao no card
- `src/components/jobs/CandidateDetailDialog.tsx` - exibir pretensao no detalhe
- `src/hooks/useApplications.ts` - incluir salary_expectation nas queries
- `src/types/ats.ts` - atualizar interface Application
- `supabase/functions/public-apply/index.ts` - aceitar salary_expectation

