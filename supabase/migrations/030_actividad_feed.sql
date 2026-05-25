-- Migration 030: Feed de actividad — tabla de eventos para el timeline social

CREATE TABLE IF NOT EXISTS actividad (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text        NOT NULL CHECK (tipo IN (
    'nuevo_rey',
    'defensa_exitosa',
    'desafio_aceptado',
    'resultado_confirmado',
    'nivel_subido',
    'cancha_agregada'
  )),
  equipo_id   uuid        NULL REFERENCES equipos(id) ON DELETE SET NULL,
  jugador_id  uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  cancha_id   uuid        NULL REFERENCES canchas(id) ON DELETE SET NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  -- metadata examples:
  -- nuevo_rey:           { equipo_nombre, cancha_nombre, racha_anterior }
  -- resultado_confirmado:{ ganador_nombre, perdedor_nombre, puntos_ganador, puntos_perdedor }
  -- nivel_subido:        { jugador_nombre, nivel_nuevo, nivel_anterior }
  -- cancha_agregada:     { cancha_nombre, direccion, deportes }
  -- desafio_aceptado:    { equipo_retador, equipo_retado, cancha_nombre, fecha }
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE actividad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actividad_public_read" ON actividad
  FOR SELECT USING (true);

CREATE POLICY "actividad_insert" ON actividad
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS actividad_created_idx ON actividad (created_at DESC);
CREATE INDEX IF NOT EXISTS actividad_tipo_idx ON actividad (tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS actividad_equipo_idx ON actividad (equipo_id, created_at DESC);
