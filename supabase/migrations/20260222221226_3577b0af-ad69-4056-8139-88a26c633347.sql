
-- Create a trigger function that checks for existing contacts by email
CREATE OR REPLACE FUNCTION public.skip_duplicate_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- If a contact with the same email already exists, skip this insert
  IF EXISTS (
    SELECT 1 FROM public.contacts
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
  ) THEN
    RETURN NULL; -- silently skip the insert
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach the trigger BEFORE INSERT
CREATE TRIGGER trg_skip_duplicate_contact
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.skip_duplicate_contact();
