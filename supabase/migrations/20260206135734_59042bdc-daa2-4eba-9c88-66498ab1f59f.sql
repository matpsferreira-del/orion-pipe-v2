-- =============================================
-- FASE 1: Party Unificado + Dedupe
-- =============================================

-- 1. Enums para Party
CREATE TYPE public.party_created_from AS ENUM ('crm', 'ats', 'site', 'import', 'api');
CREATE TYPE public.party_role_type AS ENUM ('candidate', 'client_contact', 'prospect', 'hiring_manager', 'interviewer', 'alumni', 'vendor');
CREATE TYPE public.party_status AS ENUM ('active', 'inactive', 'merged', 'blocked');
CREATE TYPE public.duplicate_reason AS ENUM ('same_email', 'same_phone', 'similar_name', 'manual');
CREATE TYPE public.duplicate_status AS ENUM ('open', 'dismissed', 'merged');

-- 2. Tabela principal: party (Pessoa única)
CREATE TABLE public.party (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email_raw TEXT,
    email_norm TEXT,
    phone_raw TEXT,
    phone_e164 TEXT,
    linkedin_url TEXT,
    headline TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'BR',
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status party_status NOT NULL DEFAULT 'active',
    created_from party_created_from NOT NULL,
    merged_into_party_id UUID REFERENCES public.party(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para party
CREATE UNIQUE INDEX party_email_norm_unique ON public.party(email_norm) WHERE email_norm IS NOT NULL AND status != 'merged';
CREATE UNIQUE INDEX party_phone_e164_unique ON public.party(phone_e164) WHERE phone_e164 IS NOT NULL AND status != 'merged';
CREATE INDEX party_full_name_idx ON public.party USING gin(to_tsvector('portuguese', full_name));
CREATE INDEX party_created_at_idx ON public.party(created_at);
CREATE INDEX party_status_idx ON public.party(status);

-- Trigger para updated_at
CREATE TRIGGER party_updated_at
    BEFORE UPDATE ON public.party
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Tabela: party_role (Papéis da pessoa)
CREATE TABLE public.party_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES public.party(id) ON DELETE CASCADE,
    role party_role_type NOT NULL,
    since_date DATE,
    confidence INT DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraints e índices para party_role
CREATE UNIQUE INDEX party_role_unique ON public.party_role(party_id, role);
CREATE INDEX party_role_role_idx ON public.party_role(role);
CREATE INDEX party_role_party_idx ON public.party_role(party_id);

-- 4. Tabela: party_identity (múltiplos emails/telefones)
CREATE TABLE public.party_identity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES public.party(id) ON DELETE CASCADE,
    identity_type TEXT NOT NULL CHECK (identity_type IN ('email', 'phone', 'cpf', 'linkedin', 'other')),
    value_raw TEXT NOT NULL,
    value_norm TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraints e índices para party_identity
CREATE UNIQUE INDEX party_identity_unique ON public.party_identity(identity_type, value_norm);
CREATE INDEX party_identity_party_idx ON public.party_identity(party_id);

-- 5. Tabela: party_duplicate_suggestion (Possíveis duplicados)
CREATE TABLE public.party_duplicate_suggestion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id_a UUID NOT NULL REFERENCES public.party(id) ON DELETE CASCADE,
    party_id_b UUID NOT NULL REFERENCES public.party(id) ON DELETE CASCADE,
    reason duplicate_reason NOT NULL,
    confidence INT DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    status duplicate_status NOT NULL DEFAULT 'open',
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (party_id_a != party_id_b)
);

-- Índices para duplicatas
CREATE UNIQUE INDEX party_duplicate_pair_unique ON public.party_duplicate_suggestion(
    LEAST(party_id_a, party_id_b), 
    GREATEST(party_id_a, party_id_b)
) WHERE status = 'open';
CREATE INDEX party_duplicate_status_idx ON public.party_duplicate_suggestion(status);

-- 6. Tabela: party_merge_log (Auditoria de merge)
CREATE TABLE public.party_merge_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survivor_party_id UUID NOT NULL REFERENCES public.party(id),
    merged_party_id UUID NOT NULL,
    merged_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
    field_resolution JSONB NOT NULL DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX party_merge_log_survivor_idx ON public.party_merge_log(survivor_party_id);
CREATE INDEX party_merge_log_merged_idx ON public.party_merge_log(merged_party_id);

-- 7. Função de normalização de email
CREATE OR REPLACE FUNCTION public.normalize_email(raw_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF raw_email IS NULL OR raw_email = '' THEN
        RETURN NULL;
    END IF;
    RETURN LOWER(TRIM(raw_email));
END;
$$;

-- 8. Função de normalização de telefone (básica para BR)
CREATE OR REPLACE FUNCTION public.normalize_phone_br(raw_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    digits TEXT;
BEGIN
    IF raw_phone IS NULL OR raw_phone = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove tudo exceto dígitos
    digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');
    
    -- Se vazio, retorna null
    IF digits = '' OR length(digits) < 10 THEN
        RETURN NULL;
    END IF;
    
    -- Remove 0 inicial se presente
    IF digits LIKE '0%' THEN
        digits := substring(digits from 2);
    END IF;
    
    -- Remove 55 inicial se presente (código do Brasil)
    IF digits LIKE '55%' AND length(digits) > 11 THEN
        digits := substring(digits from 3);
    END IF;
    
    -- Retorna no formato E.164 (+55...)
    IF length(digits) >= 10 AND length(digits) <= 11 THEN
        RETURN '+55' || digits;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 9. Trigger para normalizar automaticamente email e telefone
CREATE OR REPLACE FUNCTION public.normalize_party_identifiers()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.email_norm := public.normalize_email(NEW.email_raw);
    NEW.phone_e164 := public.normalize_phone_br(NEW.phone_raw);
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER party_normalize_identifiers
    BEFORE INSERT OR UPDATE ON public.party
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_party_identifiers();

-- 10. Função resolve_party (busca ou cria party)
CREATE OR REPLACE FUNCTION public.resolve_party(
    p_full_name TEXT,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_linkedin_url TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_created_from party_created_from DEFAULT 'crm',
    p_headline TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email_norm TEXT;
    v_phone_e164 TEXT;
    v_party_id UUID;
BEGIN
    -- Normaliza identificadores
    v_email_norm := public.normalize_email(p_email);
    v_phone_e164 := public.normalize_phone_br(p_phone);
    
    -- 1. Busca por email normalizado
    IF v_email_norm IS NOT NULL THEN
        SELECT id INTO v_party_id 
        FROM public.party 
        WHERE email_norm = v_email_norm AND status = 'active'
        LIMIT 1;
        
        IF v_party_id IS NOT NULL THEN
            -- Atualiza campos vazios
            UPDATE public.party SET
                phone_raw = COALESCE(NULLIF(phone_raw, ''), p_phone),
                linkedin_url = COALESCE(linkedin_url, p_linkedin_url),
                city = COALESCE(NULLIF(city, ''), p_city),
                state = COALESCE(NULLIF(state, ''), p_state),
                headline = COALESCE(headline, p_headline)
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
            -- Atualiza campos vazios
            UPDATE public.party SET
                email_raw = COALESCE(NULLIF(email_raw, ''), p_email),
                linkedin_url = COALESCE(linkedin_url, p_linkedin_url),
                city = COALESCE(NULLIF(city, ''), p_city),
                state = COALESCE(NULLIF(state, ''), p_state),
                headline = COALESCE(headline, p_headline)
            WHERE id = v_party_id;
            
            RETURN v_party_id;
        END IF;
    END IF;
    
    -- 3. Não encontrou, cria novo party
    INSERT INTO public.party (
        full_name, email_raw, phone_raw, linkedin_url,
        city, state, created_from, headline, notes
    ) VALUES (
        p_full_name, p_email, p_phone, p_linkedin_url,
        p_city, p_state, p_created_from, p_headline, p_notes
    )
    RETURNING id INTO v_party_id;
    
    RETURN v_party_id;
END;
$$;

-- 11. Função para garantir role em party
CREATE OR REPLACE FUNCTION public.ensure_party_role(
    p_party_id UUID,
    p_role party_role_type,
    p_confidence INT DEFAULT 100
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Tenta inserir, ignora se já existe
    INSERT INTO public.party_role (party_id, role, confidence)
    VALUES (p_party_id, p_role, p_confidence)
    ON CONFLICT (party_id, role) DO UPDATE SET
        confidence = GREATEST(party_role.confidence, EXCLUDED.confidence)
    RETURNING id INTO v_role_id;
    
    RETURN v_role_id;
END;
$$;

-- 12. RLS para party
ALTER TABLE public.party ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view parties"
ON public.party FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert parties"
ON public.party FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update parties they have access to"
ON public.party FOR UPDATE
TO authenticated
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR
    has_role(auth.uid(), 'consultor'::app_role)
);

CREATE POLICY "Only admins can delete parties"
ON public.party FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 13. RLS para party_role
ALTER TABLE public.party_role ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view party roles"
ON public.party_role FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage party roles"
ON public.party_role FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 14. RLS para party_identity
ALTER TABLE public.party_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view party identities"
ON public.party_identity FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage party identities"
ON public.party_identity FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 15. RLS para party_duplicate_suggestion
ALTER TABLE public.party_duplicate_suggestion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view duplicate suggestions"
ON public.party_duplicate_suggestion FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and gestors can manage duplicates"
ON public.party_duplicate_suggestion FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- 16. RLS para party_merge_log
ALTER TABLE public.party_merge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view merge logs"
ON public.party_merge_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and gestors can create merge logs"
ON public.party_merge_log FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- 17. Adicionar coluna party_id na tabela contacts existente para migração
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES public.party(id);
CREATE INDEX IF NOT EXISTS contacts_party_id_idx ON public.contacts(party_id);

-- 18. Migrar dados de contacts para party
INSERT INTO public.party (
    full_name, email_raw, phone_raw, linkedin_url,
    city, state, notes, created_from, created_at
)
SELECT 
    c.nome,
    c.email,
    COALESCE(c.telefone, c.whatsapp),
    c.linkedin,
    comp.cidade,
    comp.estado,
    c.observacoes,
    'crm'::party_created_from,
    c.created_at
FROM public.contacts c
LEFT JOIN public.companies comp ON c.company_id = comp.id
WHERE c.party_id IS NULL
ON CONFLICT DO NOTHING;

-- 19. Atualizar contacts com party_id correspondente
UPDATE public.contacts c
SET party_id = p.id
FROM public.party p
WHERE c.party_id IS NULL
AND p.email_norm = public.normalize_email(c.email)
AND p.email_norm IS NOT NULL;

-- 20. Criar roles client_contact para parties migrados
INSERT INTO public.party_role (party_id, role, confidence)
SELECT DISTINCT p.id, 'client_contact'::party_role_type, 100
FROM public.party p
INNER JOIN public.contacts c ON c.party_id = p.id
ON CONFLICT (party_id, role) DO NOTHING;