-- Migration 038: KOTC per formato
-- Adds formato + jugador_id to cancha_dominio so each court can have
-- separate Kings for every game format (1v1, 3v3, 5v5, equipo_completo)
-- plus one aggregated "general" King across all formats.

-- 1. Add formato column
--    'general' = aggregated king across all formats (what used to be the only king)
ALTER TABLE cancha_dominio
  ADD COLUMN IF NOT EXISTS formato text NOT NULL DEFAULT 'general';

-- Add CHECK after column exists (idempotent with DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cancha_dominio_formato_check'
      AND conrelid = 'cancha_dominio'::regclass
  ) THEN
    ALTER TABLE cancha_dominio
      ADD CONSTRAINT cancha_dominio_formato_check
      CHECK (formato IN ('general','1v1','2v2','3v3','4v4','5v5','equipo_completo'));
  END IF;
END $$;

-- 2. Add jugador_id — used for 1v1 rows (equipo_id NULL, jugador_id set)
ALTER TABLE cancha_dominio
  ADD COLUMN IF NOT EXISTS jugador_id uuid NULL REFERENCES auth.users(id);

-- 3. Make equipo_id nullable (1v1 rows track individual players, not teams)
ALTER TABLE cancha_dominio
  ALTER COLUMN equipo_id DROP NOT NULL;

-- 4. Drop old unique constraint (does not include formato)
ALTER TABLE cancha_dominio
  DROP CONSTRAINT IF EXISTS cancha_dominio_cancha_equipo_unique;

-- 5. New partial unique indexes
--    PostgreSQL NULL != NULL, so separate indexes for NULL/NOT NULL temporada_id.

-- 5a. Team rows (equipo_id IS NOT NULL) — no temporada
CREATE UNIQUE INDEX IF NOT EXISTS cancha_dominio_team_no_temp_fmt_idx
  ON cancha_dominio (cancha_id, equipo_id, formato)
  WHERE equipo_id IS NOT NULL AND temporada_id IS NULL;

-- 5b. Team rows (equipo_id IS NOT NULL) — with temporada
CREATE UNIQUE INDEX IF NOT EXISTS cancha_dominio_team_with_temp_fmt_idx
  ON cancha_dominio (cancha_id, equipo_id, formato, temporada_id)
  WHERE equipo_id IS NOT NULL AND temporada_id IS NOT NULL;

-- 5c. Player rows (jugador_id IS NOT NULL, 1v1) — no temporada
CREATE UNIQUE INDEX IF NOT EXISTS cancha_dominio_player_no_temp_fmt_idx
  ON cancha_dominio (cancha_id, jugador_id, formato)
  WHERE jugador_id IS NOT NULL AND temporada_id IS NULL;

-- 5d. Player rows (jugador_id IS NOT NULL, 1v1) — with temporada
CREATE UNIQUE INDEX IF NOT EXISTS cancha_dominio_player_with_temp_fmt_idx
  ON cancha_dominio (cancha_id, jugador_id, formato, temporada_id)
  WHERE jugador_id IS NOT NULL AND temporada_id IS NOT NULL;

-- 6. Fast lookup by jugador_id
CREATE INDEX IF NOT EXISTS cancha_dominio_jugador_idx
  ON cancha_dominio (jugador_id)
  WHERE jugador_id IS NOT NULL;

-- Note: existing rows keep formato = 'general' (the default), so all
-- historical data is correctly classified as "general" king data.
