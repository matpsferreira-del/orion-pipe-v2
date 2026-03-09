

# Plan: Create CV data tables and extend party table

## Database Changes (single migration)

1. **New tables**: `cv_experiences`, `cv_skills`, `cv_education` — exactly as specified, with RLS enabled and policies for all authenticated users (SELECT, INSERT, UPDATE, DELETE).

2. **Alter `party` table**: Add 4 columns — `parsed_summary` (TEXT), `total_exp_years` (NUMERIC(4,1)), `cv_parse_status` (TEXT, default 'pending'), `cv_parsed_at` (TIMESTAMPTZ).

3. **Indexes**: Create indexes on `party_id` for all 3 new tables.

4. **RLS policies**: Each new table gets:
   - SELECT: all authenticated users
   - INSERT/UPDATE/DELETE: all authenticated users

No frontend changes needed — this is purely a schema migration.

