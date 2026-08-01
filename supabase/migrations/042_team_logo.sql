-- Migration 042: Team logo URL
-- Stores the GCS public URL of the team's logo image.
-- NULL means no logo → UI falls back to initials + color.

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS logo_url text NULL;
