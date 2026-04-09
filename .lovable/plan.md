

## Plan: Questionnaire System per Job

### Overview
Build a questionnaire feature where recruiters create custom questions per job, candidates answer them during application on Site Orion, and all responses are visible in the candidate's profile in the CRM.

### Architecture

```text
CRM (this project)                          Site Orion
┌─────────────────────┐                     ┌─────────────────────┐
│ JobDetail            │                     │ Apply.tsx            │
│  └─ "Questionário"   │                     │  └─ Fetch questions  │
│     button → builder │                     │     from CRM via     │
│                      │                     │     edge function    │
│ CandidateDetail      │                     │  └─ Render & submit  │
│  └─ Show responses   │                     │     answers          │
└──────────┬───────────┘                     └──────────┬───────────┘
           │                                            │
    ┌──────┴──────┐                              forward-application
    │  Supabase   │◄────────────────────────────────────┘
    │  Tables:    │
    │  - job_questions     (questions per job)
    │  - questionnaire_responses (answers per application)
    └─────────────┘
```

### Database Changes (2 new tables + 1 edge function)

**Table 1: `job_questions`**
- `id` uuid PK
- `job_id` uuid NOT NULL (references jobs)
- `question_text` text NOT NULL
- `question_type` text NOT NULL ('text' | 'multiple_choice')
- `options` jsonb (array of strings for multiple choice, null for text)
- `position` integer (ordering)
- `required` boolean DEFAULT true
- `created_at` timestamptz

RLS: authenticated can CRUD.

**Table 2: `questionnaire_responses`**
- `id` uuid PK
- `application_id` uuid NOT NULL (references applications)
- `question_id` uuid NOT NULL (references job_questions)
- `answer_text` text (free text answer)
- `answer_option` jsonb (selected options for multiple choice)
- `created_at` timestamptz

RLS: authenticated can CRUD. Public (anon) can INSERT (for candidates applying).

### CRM Changes (this project)

**1. `src/pages/QuestionnaireBuilder.tsx`** (new page)
- Route: `/vagas/:jobId/questionario`
- UI to add/edit/reorder/delete questions
- Each question: text input, type selector (text/multiple choice), options editor
- Preview mode to see how it looks
- Save to `job_questions` table

**2. `src/components/jobs/JobDetail.tsx`**
- Add a "Questionário" button in the job actions area
- Links to `/vagas/{jobId}/questionario` via `navigate()`

**3. `src/components/jobs/CandidateDetailDialog.tsx`**
- New section "Respostas do Questionário" 
- Fetch `questionnaire_responses` joined with `job_questions` for this application
- Display Q&A pairs

**4. `src/App.tsx`**
- Add route for `/vagas/:jobId/questionario`

### Edge Function Changes

**5. New edge function: `get-job-questions`**
- Public endpoint (no JWT) so Site Orion can fetch questions
- Accepts `job_id` or `job_slug`, returns questions array
- Only returns questions for published, open jobs

**6. Update `public-apply/index.ts`**
- Accept `questionnaire_answers` array in payload: `[{ question_id, answer_text, answer_option }]`
- After creating the application, insert responses into `questionnaire_responses`

### Site Orion Changes

**7. `src/pages/Apply.tsx`** (Site Orion)
- On mount, fetch questions from CRM edge function `get-job-questions`
- Render questions dynamically in the form (text inputs or radio/checkbox groups)
- Include answers in the `forward-application` payload

**8. `supabase/functions/forward-application/index.ts`** (Site Orion)
- Pass `questionnaire_answers` through to the CRM's `public-apply` endpoint

### Files to Create/Edit

**This project (CRM):**
- Create migration: `job_questions` + `questionnaire_responses` tables
- Create: `src/pages/QuestionnaireBuilder.tsx`
- Create: `src/hooks/useJobQuestions.ts`
- Edit: `src/App.tsx` (add route)
- Edit: `src/components/jobs/JobDetail.tsx` (add button)
- Edit: `src/components/jobs/CandidateDetailDialog.tsx` (show responses)
- Create: `supabase/functions/get-job-questions/index.ts`
- Edit: `supabase/functions/public-apply/index.ts` (accept answers)

**Site Orion project:**
- Edit: `src/pages/Apply.tsx` (fetch & render questions, submit answers)
- Edit: `supabase/functions/forward-application/index.ts` (pass answers through)

