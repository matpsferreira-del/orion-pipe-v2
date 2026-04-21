ALTER TABLE public.outplacement_contacts
ADD COLUMN IF NOT EXISTS ai_validated_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_outplacement_contacts_ai_validated_at
ON public.outplacement_contacts (ai_validated_at);