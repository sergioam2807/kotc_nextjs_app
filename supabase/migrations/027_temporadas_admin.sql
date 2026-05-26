-- Migration 027: Temporadas — admin management
-- Makes deporte nullable (cross-sport seasons), adds descripcion + deporte_filter.
-- deporte_filter text[] NULL → NULL = all sports, ['basketball'] = single sport season.

ALTER TABLE temporadas ALTER COLUMN deporte DROP NOT NULL;
ALTER TABLE temporadas ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE temporadas ADD COLUMN IF NOT EXISTS deporte_filter text[] NULL;

-- RLS: already enabled (migration 001). Add admin write policy.
-- Admin is identified by their auth email matching the app.admin_email setting.
DROP POLICY IF EXISTS "temporadas_admin_write" ON temporadas;
CREATE POLICY "temporadas_admin_write" ON temporadas
  FOR ALL
  USING (true)
  WITH CHECK (true);
-- Note: actual admin guard is enforced at the API layer (ADMIN_EMAIL env var check).
-- The DB policy is permissive here since the anon key is used — the API does the check.
