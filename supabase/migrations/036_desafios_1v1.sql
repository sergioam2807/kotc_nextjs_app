-- Migration 036: 1v1 individual challenge system
-- Tables: desafios_individual, resultados_individual, ranking_1v1

-- ── desafios_individual ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desafios_individual (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  retador_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  retado_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cancha_id     uuid        NULL REFERENCES canchas(id) ON DELETE SET NULL,
  deporte       text        NOT NULL DEFAULT 'basketball',
  formato       text        NOT NULL DEFAULT '1v1',
  fecha         timestamptz NULL,
  mensaje       text        NULL,
  estado        text        NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','aceptado','resultado_pendiente','completado','rechazado')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_1v1 CHECK (retador_id <> retado_id)
);

ALTER TABLE desafios_individual ENABLE ROW LEVEL SECURITY;

-- Players can see their own challenges
CREATE POLICY "desafios_1v1_select" ON desafios_individual
  FOR SELECT USING (auth.uid() = retador_id OR auth.uid() = retado_id);

-- Retador can create
CREATE POLICY "desafios_1v1_insert" ON desafios_individual
  FOR INSERT WITH CHECK (auth.uid() = retador_id);

-- Both parties can update state (handled via API layer)
CREATE POLICY "desafios_1v1_update" ON desafios_individual
  FOR UPDATE USING (auth.uid() = retador_id OR auth.uid() = retado_id);

-- Only retador can delete while still pending
CREATE POLICY "desafios_1v1_delete" ON desafios_individual
  FOR DELETE USING (auth.uid() = retador_id AND estado = 'pendiente');

CREATE INDEX IF NOT EXISTS desafios_1v1_retador_idx ON desafios_individual (retador_id);
CREATE INDEX IF NOT EXISTS desafios_1v1_retado_idx  ON desafios_individual (retado_id);
CREATE INDEX IF NOT EXISTS desafios_1v1_estado_idx  ON desafios_individual (estado);

-- ── resultados_individual ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resultados_individual (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  desafio_id               uuid        NOT NULL REFERENCES desafios_individual(id) ON DELETE CASCADE,
  ganador_id               uuid        NOT NULL REFERENCES auth.users(id),
  puntos_retador           int         NULL CHECK (puntos_retador IS NULL OR puntos_retador >= 0),
  puntos_retado            int         NULL CHECK (puntos_retado  IS NULL OR puntos_retado  >= 0),
  propuesto_por            uuid        NOT NULL REFERENCES auth.users(id),
  confirmado_por_perdedor  boolean     NOT NULL DEFAULT false,
  disputado                boolean     NOT NULL DEFAULT false,
  confirmado_at            timestamptz NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE(desafio_id)
);

ALTER TABLE resultados_individual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resultados_1v1_select" ON resultados_individual
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM desafios_individual d
      WHERE d.id = desafio_id
        AND (d.retador_id = auth.uid() OR d.retado_id = auth.uid())
    )
  );

CREATE POLICY "resultados_1v1_insert" ON resultados_individual
  FOR INSERT WITH CHECK (
    auth.uid() = propuesto_por AND
    EXISTS (
      SELECT 1 FROM desafios_individual d
      WHERE d.id = desafio_id
        AND (d.retador_id = auth.uid() OR d.retado_id = auth.uid())
    )
  );

CREATE POLICY "resultados_1v1_update" ON resultados_individual
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM desafios_individual d
      WHERE d.id = desafio_id
        AND (d.retador_id = auth.uid() OR d.retado_id = auth.uid())
    )
  );

-- ── ranking_1v1 ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ranking_1v1 (
  id            uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id    uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temporada_id  uuid  NULL REFERENCES temporadas(id) ON DELETE SET NULL,
  puntos        int   NOT NULL DEFAULT 0,
  victorias     int   NOT NULL DEFAULT 0,
  derrotas      int   NOT NULL DEFAULT 0,
  racha_actual  int   NOT NULL DEFAULT 0,
  racha_max     int   NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ranking_1v1 ENABLE ROW LEVEL SECURITY;

-- Public read — anyone can see the ranking
CREATE POLICY "ranking_1v1_public_read" ON ranking_1v1
  FOR SELECT USING (true);

-- Only server API (via service role or SECURITY DEFINER) should write;
-- allow insert/update via API (checked in application layer)
CREATE POLICY "ranking_1v1_owner_write" ON ranking_1v1
  FOR ALL USING (auth.uid() = jugador_id);

-- Partial unique indexes to handle NULL temporada_id correctly
-- (NULL != NULL in PostgreSQL unique constraints without partial indexes)
CREATE UNIQUE INDEX IF NOT EXISTS ranking_1v1_no_temporada
  ON ranking_1v1 (jugador_id)
  WHERE temporada_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ranking_1v1_con_temporada
  ON ranking_1v1 (jugador_id, temporada_id)
  WHERE temporada_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ranking_1v1_puntos_idx ON ranking_1v1 (puntos DESC);
