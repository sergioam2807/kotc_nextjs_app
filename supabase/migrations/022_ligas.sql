-- =============================================================================
-- 022 — LIGAS: subscriptions, leagues, teams in league, matches
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. suscripciones
--    Managed manually via Supabase Dashboard (or by a future webhook).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suscripciones (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan         text        NOT NULL DEFAULT 'organizador'
                             CHECK (plan IN ('organizador', 'organizador_pro')),
  estado       text        NOT NULL DEFAULT 'activa'
                             CHECK (estado IN ('activa', 'vencida', 'cancelada')),
  fecha_inicio date        NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin    date        NOT NULL,
  notas        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. ligas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ligas (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizador_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre               text        NOT NULL,
  descripcion          text,
  deporte              text        NOT NULL,
  modalidad            text        NOT NULL,
  formato              text        NOT NULL
                                     CHECK (formato IN (
                                       'round_robin',
                                       'eliminacion_directa',
                                       'grupos_playoffs'
                                     )),
  estado               text        NOT NULL DEFAULT 'borrador'
                                     CHECK (estado IN (
                                       'borrador', 'inscripciones',
                                       'en_curso', 'finalizada', 'cancelada'
                                     )),
  max_equipos          integer     NOT NULL DEFAULT 8
                                     CHECK (max_equipos BETWEEN 2 AND 64),
  -- grupos_playoffs settings
  num_grupos           integer     CHECK (num_grupos IS NULL OR num_grupos > 0),
  equipos_clasifican   integer     CHECK (equipos_clasifican IS NULL OR equipos_clasifican > 0),
  -- registration
  inscripcion_publica  boolean     NOT NULL DEFAULT false,
  fecha_inicio         date,
  fecha_fin            date,
  -- scoring
  puntos_victoria      integer     NOT NULL DEFAULT 3  CHECK (puntos_victoria >= 0),
  puntos_empate        integer     NOT NULL DEFAULT 1  CHECK (puntos_empate >= 0),
  puntos_derrota       integer     NOT NULL DEFAULT 0  CHECK (puntos_derrota >= 0),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. liga_equipos  — teams in a league
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liga_equipos (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id    uuid        NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  equipo_id  uuid        NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  estado     text        NOT NULL DEFAULT 'invitado'
                           CHECK (estado IN ('invitado', 'aceptado', 'rechazado', 'retirado')),
  grupo      text,          -- 'A', 'B', … (grupos_playoffs)
  seed       integer,       -- seeding for bracket
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (liga_id, equipo_id)
);

-- ---------------------------------------------------------------------------
-- 4. liga_partidos  — matches within a league
--    equipo_local_id / equipo_visitante_id are nullable for TBD bracket slots.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liga_partidos (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id              uuid        NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  equipo_local_id      uuid        REFERENCES equipos(id) ON DELETE SET NULL,
  equipo_visitante_id  uuid        REFERENCES equipos(id) ON DELETE SET NULL,
  fase                 text        NOT NULL DEFAULT 'regular'
                                     CHECK (fase IN (
                                       'regular', 'grupos',
                                       'octavos', 'cuartos', 'semifinal',
                                       '3er_lugar', 'final'
                                     )),
  grupo                text,
  ronda                integer     NOT NULL DEFAULT 1,
  estado               text        NOT NULL DEFAULT 'pendiente'
                                     CHECK (estado IN ('pendiente', 'completado', 'cancelado')),
  fecha                timestamptz,
  cancha_id            uuid        REFERENCES canchas(id) ON DELETE SET NULL,
  puntos_local         integer,
  puntos_visitante     integer,
  ganador_id           uuid        REFERENCES equipos(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ligas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE liga_equipos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE liga_partidos   ENABLE ROW LEVEL SECURITY;

-- suscripciones: users can read their own
CREATE POLICY "sub_select_own" ON suscripciones
  FOR SELECT USING (auth.uid() = user_id);

-- ligas: everyone can see non-borrador; organizer sees own borrador
CREATE POLICY "ligas_select" ON ligas
  FOR SELECT USING (estado != 'borrador' OR organizador_id = auth.uid());

-- ligas: insert only with active subscription
CREATE POLICY "ligas_insert" ON ligas
  FOR INSERT WITH CHECK (
    auth.uid() = organizador_id
    AND EXISTS (
      SELECT 1 FROM suscripciones
      WHERE user_id = auth.uid()
        AND estado = 'activa'
        AND fecha_fin >= CURRENT_DATE
    )
  );

CREATE POLICY "ligas_update" ON ligas
  FOR UPDATE USING (organizador_id = auth.uid());

CREATE POLICY "ligas_delete" ON ligas
  FOR DELETE USING (organizador_id = auth.uid());

-- liga_equipos: everyone can read
CREATE POLICY "liga_equipos_select" ON liga_equipos
  FOR SELECT USING (true);

-- liga_equipos: organizer invites; team admin/captain self-requests in public liga
CREATE POLICY "liga_equipos_insert" ON liga_equipos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM ligas WHERE id = liga_id AND organizador_id = auth.uid())
    OR (
      EXISTS (SELECT 1 FROM ligas WHERE id = liga_id AND inscripcion_publica = true AND estado = 'inscripciones')
      AND EXISTS (
        SELECT 1 FROM equipo_miembros
        WHERE equipo_id = liga_equipos.equipo_id
          AND jugador_id = auth.uid()
          AND rol IN ('admin', 'capitan')
      )
    )
  );

CREATE POLICY "liga_equipos_update" ON liga_equipos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM ligas WHERE id = liga_id AND organizador_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM equipo_miembros
      WHERE equipo_id = liga_equipos.equipo_id
        AND jugador_id = auth.uid()
        AND rol IN ('admin', 'capitan')
    )
  );

CREATE POLICY "liga_equipos_delete" ON liga_equipos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM ligas WHERE id = liga_id AND organizador_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM equipo_miembros
      WHERE equipo_id = liga_equipos.equipo_id
        AND jugador_id = auth.uid()
        AND rol IN ('admin', 'capitan')
    )
  );

-- liga_partidos: everyone can read
CREATE POLICY "liga_partidos_select" ON liga_partidos
  FOR SELECT USING (true);

-- liga_partidos: only organizer can insert/update
CREATE POLICY "liga_partidos_insert" ON liga_partidos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM ligas WHERE id = liga_id AND organizador_id = auth.uid())
  );

CREATE POLICY "liga_partidos_update" ON liga_partidos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM ligas WHERE id = liga_id AND organizador_id = auth.uid())
  );
