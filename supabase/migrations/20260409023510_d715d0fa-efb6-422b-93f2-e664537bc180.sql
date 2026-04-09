
-- Table: job_questions
CREATE TABLE public.job_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'text',
  options jsonb,
  position integer NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage job_questions"
  ON public.job_questions FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public can view questions for published jobs"
  ON public.job_questions FOR SELECT
  TO anon
  USING (job_id IN (SELECT id FROM public.jobs WHERE published = true AND status = 'open'));

-- Table: questionnaire_responses
CREATE TABLE public.questionnaire_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.job_questions(id) ON DELETE CASCADE,
  answer_text text,
  answer_option jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage questionnaire_responses"
  ON public.questionnaire_responses FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public can insert questionnaire_responses"
  ON public.questionnaire_responses FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE INDEX idx_job_questions_job_id ON public.job_questions(job_id);
CREATE INDEX idx_questionnaire_responses_application_id ON public.questionnaire_responses(application_id);
CREATE INDEX idx_questionnaire_responses_question_id ON public.questionnaire_responses(question_id);
