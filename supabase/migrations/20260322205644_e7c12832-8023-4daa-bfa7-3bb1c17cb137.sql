
-- Make company_id and contact_id nullable for outplacement (pessoa física)
ALTER TABLE opportunities ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE opportunities ALTER COLUMN contact_id DROP NOT NULL;
