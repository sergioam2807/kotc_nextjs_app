-- Migration 043: Court star ratings (1–5)
-- Each user can rate each court once; updating is allowed.
-- A trigger keeps denormalized valoracion_promedio + valoracion_count
-- on the canchas row so the map query stays O(1) per court.

-- ── Rating table ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cancha_valoraciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id    uuid     NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
  jugador_id   uuid     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estrellas    smallint NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cancha_id, jugador_id)
);

ALTER TABLE cancha_valoraciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valoraciones_public_read"
  ON cancha_valoraciones FOR SELECT USING (true);

CREATE POLICY "valoraciones_own_insert"
  ON cancha_valoraciones FOR INSERT
  WITH CHECK (auth.uid() = jugador_id);

CREATE POLICY "valoraciones_own_update"
  ON cancha_valoraciones FOR UPDATE
  USING (auth.uid() = jugador_id);

CREATE POLICY "valoraciones_own_delete"
  ON cancha_valoraciones FOR DELETE
  USING (auth.uid() = jugador_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cancha_valoraciones_cancha
  ON cancha_valoraciones (cancha_id);

CREATE INDEX IF NOT EXISTS idx_cancha_valoraciones_jugador
  ON cancha_valoraciones (jugador_id);

-- ── Denormalized columns on canchas ─────────────────────────────────────────

ALTER TABLE canchas
  ADD COLUMN IF NOT EXISTS valoracion_promedio numeric(3,2) NULL,
  ADD COLUMN IF NOT EXISTS valoracion_count    int          NOT NULL DEFAULT 0;

-- ── Trigger to keep aggregates in sync ──────────────────────────────────────

CREATE OR REPLACE FUNCTION _update_cancha_valoracion()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _cancha_id uuid;
BEGIN
  _cancha_id := COALESCE(NEW.cancha_id, OLD.cancha_id);

  UPDATE canchas
  SET
    valoracion_promedio = (
      SELECT ROUND(AVG(estrellas)::numeric, 2)
      FROM cancha_valoraciones
      WHERE cancha_id = _cancha_id
    ),
    valoracion_count = (
      SELECT COUNT(*)
      FROM cancha_valoraciones
      WHERE cancha_id = _cancha_id
    )
  WHERE id = _cancha_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_cancha_valoracion ON cancha_valoraciones;

CREATE TRIGGER trg_update_cancha_valoracion
  AFTER INSERT OR UPDATE OR DELETE ON cancha_valoraciones
  FOR EACH ROW EXECUTE FUNCTION _update_cancha_valoracion();
