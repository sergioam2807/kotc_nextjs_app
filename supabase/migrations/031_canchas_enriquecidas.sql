-- Migration 031: Cancha enriquecida — superficie, iluminación, tipo de aro

ALTER TABLE canchas
  ADD COLUMN IF NOT EXISTS superficie text NULL
    CHECK (superficie IN ('asfalto', 'cemento', 'interior', 'madera', 'sintetico', 'otro')),
  ADD COLUMN IF NOT EXISTS iluminacion boolean NULL,
  ADD COLUMN IF NOT EXISTS tipo_aro text NULL
    CHECK (tipo_aro IN ('estandar', 'cadena', 'fijo', 'portatil', 'sin_aro'));

CREATE INDEX IF NOT EXISTS canchas_superficie_idx ON canchas (superficie) WHERE superficie IS NOT NULL;
CREATE INDEX IF NOT EXISTS canchas_iluminacion_idx ON canchas (iluminacion) WHERE iluminacion = true;
