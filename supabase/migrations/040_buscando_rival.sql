-- Migration 040: Sistema "Buscando Rival"
-- Permite a equipos señalizar que buscan un rival para jugar.

ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS buscando_rival boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rival_modalidad text NULL
    CHECK (rival_modalidad IN ('1v1','2v2','3v3','4v4','5v5','equipo_completo'));

-- Índice parcial: solo filas activas, para consultas de proximidad
CREATE INDEX IF NOT EXISTS equipos_buscando_rival_idx
  ON equipos (buscando_rival, region, comuna)
  WHERE buscando_rival = true;

COMMENT ON COLUMN equipos.buscando_rival IS 'El equipo está buscando activamente un rival para jugar';
COMMENT ON COLUMN equipos.rival_modalidad IS 'Formato de juego buscado (null = cualquier modalidad)';
