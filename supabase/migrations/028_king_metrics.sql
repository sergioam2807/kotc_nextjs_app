-- Migration 028: King metrics — racha defensiva, fecha inicio reinado, historial de reyes

-- Extend cancha_dominio with streak + reign start date
ALTER TABLE cancha_dominio
  ADD COLUMN IF NOT EXISTS racha_defensiva int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_rey_desde timestamptz NULL;

-- Historial de reyes por cancha (snapshot at each king change or season close)
CREATE TABLE IF NOT EXISTS historial_kings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id       uuid        NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
  equipo_id       uuid        NOT NULL REFERENCES equipos(id),
  temporada_id    uuid        NULL REFERENCES temporadas(id),
  fecha_inicio    timestamptz NOT NULL DEFAULT now(),
  fecha_fin       timestamptz NULL,
  victorias_reinado int       NOT NULL DEFAULT 0,
  racha_max       int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE historial_kings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historial_kings_public_read" ON historial_kings
  FOR SELECT USING (true);

CREATE POLICY "historial_kings_service_insert" ON historial_kings
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS historial_kings_cancha_idx ON historial_kings (cancha_id, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS historial_kings_equipo_idx ON historial_kings (equipo_id);
