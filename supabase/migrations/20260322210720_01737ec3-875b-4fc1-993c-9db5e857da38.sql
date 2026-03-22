
-- Make company_id nullable on jobs for outplacement projects
ALTER TABLE jobs ALTER COLUMN company_id DROP NOT NULL;
