-- Migration 033: Temporadas — identidad visual y lore
-- Cada temporada tiene su propio color, slogan, tema y número de temporada.

ALTER TABLE temporadas
  ADD COLUMN IF NOT EXISTS numero    int   NULL,                -- 1, 2, 3… número oficial de temporada
  ADD COLUMN IF NOT EXISTS color     text  NULL,                -- hex color p.ej. '#ef4444'
  ADD COLUMN IF NOT EXISTS slogan    text  NULL,                -- tagline de la temporada
  ADD COLUMN IF NOT EXISTS tema      text  NULL                 -- identidad visual
    CHECK (tema IN ('street', 'competitivo', 'summer', 'nightball', 'playoffs', 'underground')),
  ADD COLUMN IF NOT EXISTS emoji     text  NULL;                -- ícono representativo

-- Índice para ordenar por número
CREATE INDEX IF NOT EXISTS temporadas_numero_idx ON temporadas (numero);
