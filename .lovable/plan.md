
# Portal Público de Vagas com Candidatura Online

## Visão Geral

Criar um portal público de vagas (acessível sem login) integrado ao sistema interno. Quando um candidato se inscrever pelo portal, seus dados caem diretamente na tabela `party` e a candidatura aparece no kanban da vaga correspondente. Dentro do sistema interno, um botão "Publicar no Site" controla quais vagas aparecem no portal.

## Como vai funcionar

```text
[Sistema Interno]                          [Portal Público]
  Vaga criada → "Publicar no Site"  →→→  /vagas (lista pública)
                                              ↓
                                         /vagas/:slug (detalhe)
                                              ↓
                                      Candidato preenche form
                                              ↓
                          ← ← ← ← ← party + application criados no banco
                                              ↓
                                   Aparece no kanban da vaga interna
```

---

## Parte 1: Banco de Dados (Migrations)

### 1.1 — Adicionar campos `published` e `slug` na tabela `jobs`

```sql
ALTER TABLE jobs
  ADD COLUMN published boolean NOT NULL DEFAULT false,
  ADD COLUMN slug text UNIQUE,
  ADD COLUMN published_at timestamptz;
```

- `published`: flag booleana que controla visibilidade no portal
- `slug`: URL amigável gerada automaticamente (ex: `desenvolvedor-fullstack-senior-abc123`)
- `published_at`: data em que foi publicada

### 1.2 — RLS para leitura pública das vagas publicadas

```sql
-- Vagas publicadas são visíveis para qualquer pessoa (sem login)
CREATE POLICY "Public can view published jobs"
  ON jobs FOR SELECT
  USING (published = true AND status = 'open');
```

### 1.3 — RLS para candidaturas públicas (INSERT sem autenticação)

A tabela `applications` já existe. Será necessário criar uma política que permita inserção anônima somente para vagas publicadas:

```sql
CREATE POLICY "Public can apply to published jobs"
  ON applications FOR INSERT
  WITH CHECK (
    job_id IN (SELECT id FROM jobs WHERE published = true AND status = 'open')
  );
```

### 1.4 — Função Edge Function para candidatura pública

Uma Edge Function `public-apply` receberá os dados do candidato e:
1. Chamará `resolve_party()` para criar ou localizar o partido (a função já existe no banco)
2. Chamará `ensure_party_role()` para garantir o papel `candidate`
3. Inserirá a candidatura em `applications` com `source = 'website'`
4. Retornará sucesso ou erro

Isso é necessário pois o RLS de `party` exige `auth.uid() IS NOT NULL` para INSERT — a Edge Function usará a service role internamente para contornar isso de forma segura.

---

## Parte 2: Páginas Públicas (sem autenticação)

### 2.1 — `/vagas` — Lista pública de vagas

Nova página pública `src/pages/public/JobBoard.tsx`:
- Lista cards de vagas publicadas (busca por título/localização)
- Filtros por localização e palavras-chave
- Design limpo e independente do AppLayout (sem sidebar/topnav)
- Cada card leva para `/vagas/:slug`

### 2.2 — `/vagas/:slug` — Detalhe da vaga + formulário de candidatura

Nova página `src/pages/public/JobDetail.tsx`:
- Exibe título, empresa (nome fantasia), localização, descrição, requisitos, faixa salarial
- Formulário de candidatura com:
  - Nome completo *
  - E-mail *
  - Telefone
  - LinkedIn URL
  - Cidade/Estado
  - Texto de apresentação (campo `notes`)
  - Upload de currículo (opcional — fase futura, por ora campo de texto)
- Ao submeter, chama a Edge Function `public-apply`
- Tela de confirmação "Candidatura enviada!"

---

## Parte 3: Sistema Interno — Controle de Publicação

### 3.1 — Botão "Publicar no Site" no `JobDetail.tsx`

Dentro do detalhe da vaga (componente `JobDetail`), adicionar:
- Badge indicando se a vaga está publicada ou não
- Botão "Publicar no Site" → muda `published = true` e gera o `slug`
- Botão "Despublicar" → muda `published = false`
- Link copiável para o portal: `https://[url]/vagas/[slug]`

### 3.2 — Indicador visual nos cards de vaga (`JobCard.tsx`)

Adicionar ícone/badge "🌐 Publicada" no card quando `published = true`.

### 3.3 — Hook `usePublishJob`

Novo mutation em `useJobs.ts`:
```typescript
export function usePublishJob() {
  // Gera slug a partir do título + id curto
  // Atualiza published, slug, published_at
}
```

---

## Parte 4: Roteamento

Adicionar rotas públicas em `App.tsx` (fora do `ProtectedRoute`):

```typescript
<Route path="/vagas" element={<JobBoard />} />
<Route path="/vagas/:slug" element={<PublicJobDetail />} />
```

Importante: essas rotas são completamente públicas, sem redirecionamento para login.

---

## Parte 5: Edge Function `public-apply`

```typescript
// supabase/functions/public-apply/index.ts
// Recebe: { job_slug, full_name, email, phone, linkedin_url, city, state, notes }
// 1. Busca job_id pelo slug (verifica published + open)
// 2. Chama resolve_party() via rpc com service role
// 3. Chama ensure_party_role() para 'candidate'
// 4. Insere em applications { job_id, party_id, source: 'website', status: 'new' }
// 5. Retorna { success: true, application_id }
```

---

## Sequência de Implementação

1. **Migration** — adicionar colunas `published`, `slug`, `published_at` na tabela `jobs` + políticas RLS
2. **Edge Function** `public-apply` — lógica segura de candidatura anônima
3. **Hook** `usePublishJob` em `useJobs.ts`
4. **JobDetail.tsx** — botão publicar/despublicar + link copiável
5. **JobCard.tsx** — badge de publicada
6. **Página** `JobBoard.tsx` — lista pública de vagas
7. **Página** `PublicJobDetail.tsx` — detalhe + formulário de candidatura
8. **App.tsx** — adicionar rotas públicas

---

## Pontos de Segurança

- A Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` apenas internamente — nunca exposta ao browser
- Validação de `published = true AND status = 'open'` antes de aceitar candidatura
- Rate limiting natural via Lovable Cloud nas Edge Functions
- Dados sensíveis da empresa (CNPJ, contatos internos) não são expostos ao portal
- O nome da empresa exibido no portal é apenas o `nome_fantasia`
