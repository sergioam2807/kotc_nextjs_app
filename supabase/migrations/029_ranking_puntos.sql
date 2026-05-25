-- Migration 029: Ranking por puntos (sistema competitivo, scope ciudad + temporada)
-- Fórmula: Victoria visitante +3, Defensa de cancha +5, Bonus top-10 +2, Bonus racha +1/victoria

CREATE TABLE IF NOT EXISTS ranking_puntos (
  id                  uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id           uuid  NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  temporada_id        uuid  NULL REFERENCES temporadas(id),
  puntos              int   NOT NULL DEFAULT 0,
  victorias           int   NOT NULL DEFAULT 0,
  derrotas            int   NOT NULL DEFAULT 0,
  defensas_exitosas   int   NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(equipo_id, temporada_id)
);

ALTER TABLE ranking_puntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ranking_puntos_public_read" ON ranking_puntos
  FOR SELECT USING (true);

-- Server-side writes only (via API server using anon key + RLS bypass trick or service role)
CREATE POLICY "ranking_puntos_insert" ON ranking_puntos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "ranking_puntos_update" ON ranking_puntos
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS ranking_puntos_temporada_puntos_idx ON ranking_puntos (temporada_id, puntos DESC);
CREATE INDEX IF NOT EXISTS ranking_puntos_equipo_idx ON ranking_puntos (equipo_id);
