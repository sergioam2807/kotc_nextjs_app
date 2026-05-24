-- Migration 023: Información adicional de canchas
-- Agrega campos de acceso, precio, contacto y nombre del recinto

ALTER TABLE canchas
  ADD COLUMN IF NOT EXISTS es_publica     boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS precio_hora    integer     NULL,        -- CLP por hora (nullable = no aplica)
  ADD COLUMN IF NOT EXISTS telefono_contacto text     NULL,
  ADD COLUMN IF NOT EXISTS nombre_recinto   text     NULL;

-- Índice para filtrar por tipo de acceso (público/pago)
CREATE INDEX IF NOT EXISTS canchas_es_publica_idx ON canchas (es_publica);

COMMENT ON COLUMN canchas.es_publica          IS 'true = cancha pública/gratuita, false = recinto de pago';
COMMENT ON COLUMN canchas.precio_hora         IS 'Precio promedio en CLP por hora. NULL si es pública o se desconoce.';
COMMENT ON COLUMN canchas.telefono_contacto   IS 'Número o texto de contacto del recinto para reservas.';
COMMENT ON COLUMN canchas.nombre_recinto      IS 'Nombre del complejo o recinto que administra la cancha.';
