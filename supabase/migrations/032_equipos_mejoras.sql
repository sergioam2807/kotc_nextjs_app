-- Migration 032: Mejoras de equipo — descripcion, cancha local, rachas

ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS descripcion      text NULL,
  ADD COLUMN IF NOT EXISTS cancha_local_id  uuid NULL REFERENCES canchas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS racha_victorias  int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS racha_derrotas   int  NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS equipos_cancha_local_idx ON equipos (cancha_local_id) WHERE cancha_local_id IS NOT NULL;
