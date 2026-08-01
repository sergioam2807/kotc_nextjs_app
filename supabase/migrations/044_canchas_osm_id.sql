-- Migration 044: OSM source tracking for courts
-- Allows idempotent re-runs of the import script:
-- if a court with the same osm_id already exists it is skipped, not duplicated.
-- osm_type: 'node' | 'way' | 'relation'

ALTER TABLE canchas
  ADD COLUMN IF NOT EXISTS osm_id   bigint NULL,
  ADD COLUMN IF NOT EXISTS osm_type text   NULL CHECK (osm_type IN ('node', 'way', 'relation'));

CREATE UNIQUE INDEX IF NOT EXISTS canchas_osm_unique
  ON canchas (osm_id, osm_type)
  WHERE osm_id IS NOT NULL;
