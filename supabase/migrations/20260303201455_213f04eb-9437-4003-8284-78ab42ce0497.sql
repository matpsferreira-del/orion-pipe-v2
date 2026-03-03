
-- Add current_title and current_company columns to party table
ALTER TABLE public.party ADD COLUMN current_title TEXT NULL;
ALTER TABLE public.party ADD COLUMN current_company TEXT NULL;

-- Update resolve_party to accept and store the new fields
CREATE OR REPLACE FUNCTION public.resolve_party(
    p_full_name text,
    p_email text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_linkedin_url text DEFAULT NULL,
    p_city text DEFAULT NULL,
    p_state text DEFAULT NULL,
    p_created_from party_created_from DEFAULT 'crm',
    p_headline text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_current_title text DEFAULT NULL,
    p_current_company text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_email_norm TEXT;
    v_phone_e164 TEXT;
    v_party_id UUID;
BEGIN
    v_email_norm := public.normalize_email(p_email);
    v_phone_e164 := public.normalize_phone_br(p_phone);

    -- 1. Busca por email normalizado
    IF v_email_norm IS NOT NULL THEN
        SELECT id INTO v_party_id
        FROM public.party
        WHERE email_norm = v_email_norm AND status = 'active'
        LIMIT 1;

        IF v_party_id IS NOT NULL THEN
            UPDATE public.party SET
                phone_raw = COALESCE(NULLIF(phone_raw, ''), p_phone),
                linkedin_url = COALESCE(linkedin_url, p_linkedin_url),
                city = COALESCE(NULLIF(city, ''), p_city),
                state = COALESCE(NULLIF(state, ''), p_state),
                headline = COALESCE(headline, p_headline),
                current_title = COALESCE(current_title, p_current_title),
                current_company = COALESCE(current_company, p_current_company)
            WHERE id = v_party_id;
            RETURN v_party_id;
        END IF;
    END IF;

    -- 2. Busca por telefone normalizado
    IF v_phone_e164 IS NOT NULL THEN
        SELECT id INTO v_party_id
        FROM public.party
        WHERE phone_e164 = v_phone_e164 AND status = 'active'
        LIMIT 1;

        IF v_party_id IS NOT NULL THEN
            UPDATE public.party SET
                email_raw = COALESCE(NULLIF(email_raw, ''), p_email),
                linkedin_url = COALESCE(linkedin_url, p_linkedin_url),
                city = COALESCE(NULLIF(city, ''), p_city),
                state = COALESCE(NULLIF(state, ''), p_state),
                headline = COALESCE(headline, p_headline),
                current_title = COALESCE(current_title, p_current_title),
                current_company = COALESCE(current_company, p_current_company)
            WHERE id = v_party_id;
            RETURN v_party_id;
        END IF;
    END IF;

    -- 3. Cria novo party
    INSERT INTO public.party (
        full_name, email_raw, phone_raw, linkedin_url,
        city, state, created_from, headline, notes,
        current_title, current_company
    ) VALUES (
        p_full_name, p_email, p_phone, p_linkedin_url,
        p_city, p_state, p_created_from, p_headline, p_notes,
        p_current_title, p_current_company
    )
    RETURNING id INTO v_party_id;

    RETURN v_party_id;
END;
$function$;
