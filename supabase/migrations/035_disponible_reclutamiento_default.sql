-- Migration 035: Change disponible_reclutamiento default to true
-- New accounts will have disponible_reclutamiento = true by default
-- Also backfill NULL values

ALTER TABLE profiles
  ALTER COLUMN disponible_reclutamiento SET DEFAULT true;

-- Backfill: set NULL → true so existing users without a preference are visible
UPDATE profiles
SET disponible_reclutamiento = true
WHERE disponible_reclutamiento IS NULL;
