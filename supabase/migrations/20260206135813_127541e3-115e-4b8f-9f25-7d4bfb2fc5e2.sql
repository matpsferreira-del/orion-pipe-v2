-- Fix function search_path for security
CREATE OR REPLACE FUNCTION public.normalize_email(raw_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
    IF raw_email IS NULL OR raw_email = '' THEN
        RETURN NULL;
    END IF;
    RETURN LOWER(TRIM(raw_email));
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone_br(raw_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    digits TEXT;
BEGIN
    IF raw_phone IS NULL OR raw_phone = '' THEN
        RETURN NULL;
    END IF;
    
    digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');
    
    IF digits = '' OR length(digits) < 10 THEN
        RETURN NULL;
    END IF;
    
    IF digits LIKE '0%' THEN
        digits := substring(digits from 2);
    END IF;
    
    IF digits LIKE '55%' AND length(digits) > 11 THEN
        digits := substring(digits from 3);
    END IF;
    
    IF length(digits) >= 10 AND length(digits) <= 11 THEN
        RETURN '+55' || digits;
    END IF;
    
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_party_identifiers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.email_norm := public.normalize_email(NEW.email_raw);
    NEW.phone_e164 := public.normalize_phone_br(NEW.phone_raw);
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;