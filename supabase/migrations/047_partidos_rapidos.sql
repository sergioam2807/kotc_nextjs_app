-- Migration 047: Partido Rápido (Quick Match) 3v3
-- Trío improvisado (capitán + hasta 2 compañeros, invitados sin cuenta o
-- jugadores KOTC) que se empareja al instante contra otro trío buscando en
-- la misma cancha o, si no hay nadie, contra el Rey 3v3 vigente de esa
-- cancha. No crea equipos reales: el "Rey" de un partido rápido se atribuye
-- al capitán (cancha_dominio.jugador_id), reutilizando el esquema por-jugador
-- que ya introdujo la migración 038 (formato '3v3' ya es válido ahí).
--
-- Tablas: partidos_rapidos, partido_rapido_jugadores, resultados_partido_rapido
-- Función: emparejar_partido_rapido() — matching atómico con FOR UPDATE SKIP LOCKED.

-- ── partidos_rapidos ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partidos_rapidos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id     uuid        NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
  deporte       text        NOT NULL DEFAULT 'basketball',
  formato       text        NOT NULL DEFAULT '3v3' CHECK (formato IN ('3v3')),
  temporada_id  uuid        NULL REFERENCES temporadas(id) ON DELETE SET NULL,
  capitan_a_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capitan_b_id  uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  es_vs_king    boolean     NOT NULL DEFAULT false,
  estado        text        NOT NULL DEFAULT 'buscando'
                CHECK (estado IN ('buscando','emparejado','resultado_pendiente','disputado','completado','cancelado')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  matched_at    timestamptz NULL,
  CONSTRAINT no_self_partido_rapido CHECK (capitan_b_id IS NULL OR capitan_a_id <> capitan_b_id)
);

CREATE INDEX IF NOT EXISTS partidos_rapidos_lobby_idx
  ON partidos_rapidos (cancha_id, formato, estado, created_at);
CREATE INDEX IF NOT EXISTS partidos_rapidos_capitan_a_idx ON partidos_rapidos (capitan_a_id);
CREATE INDEX IF NOT EXISTS partidos_rapidos_capitan_b_idx ON partidos_rapidos (capitan_b_id);

ALTER TABLE partidos_rapidos ENABLE ROW LEVEL SECURITY;

-- RLS permisiva (patrón de desafios_individual, migración 036): la
-- autorización real vive en las API routes. select público porque el
-- matching necesita leer partidos "buscando" de otros capitanes.
CREATE POLICY "partidos_rapidos_select" ON partidos_rapidos
  FOR SELECT USING (true);

CREATE POLICY "partidos_rapidos_insert" ON partidos_rapidos
  FOR INSERT WITH CHECK (auth.uid() = capitan_a_id);

CREATE POLICY "partidos_rapidos_update" ON partidos_rapidos
  FOR UPDATE USING (auth.uid() = capitan_a_id OR auth.uid() = capitan_b_id);

-- ── partido_rapido_jugadores ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partido_rapido_jugadores (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id      uuid        NOT NULL REFERENCES partidos_rapidos(id) ON DELETE CASCADE,
  lado            text        NOT NULL CHECK (lado IN ('a','b')),
  jugador_id      uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre_invitado text        NULL,
  es_capitan      boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((jugador_id IS NOT NULL) OR (nombre_invitado IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS partido_rapido_jugadores_partido_idx ON partido_rapido_jugadores (partido_id);

ALTER TABLE partido_rapido_jugadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partido_rapido_jugadores_select" ON partido_rapido_jugadores
  FOR SELECT USING (true);

CREATE POLICY "partido_rapido_jugadores_insert" ON partido_rapido_jugadores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM partidos_rapidos p
      WHERE p.id = partido_id
        AND (p.capitan_a_id = auth.uid() OR p.capitan_b_id = auth.uid())
    )
  );

-- Necesaria para re-asociar las filas del lado 'a' del capitán que se une a
-- un lobby ajeno: su partido recién creado se cancela y sus jugadores se
-- reasignan (partido_id + lado) a la fila que ya estaba "buscando" (ver
-- emparejar_partido_rapido() más abajo y app/api/partidos-rapidos/route.ts).
CREATE POLICY "partido_rapido_jugadores_update" ON partido_rapido_jugadores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM partidos_rapidos p
      WHERE p.id = partido_id
        AND (p.capitan_a_id = auth.uid() OR p.capitan_b_id = auth.uid())
    )
  );

-- ── resultados_partido_rapido ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resultados_partido_rapido (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id               uuid        NOT NULL UNIQUE REFERENCES partidos_rapidos(id) ON DELETE CASCADE,
  ganador_lado             text        NOT NULL CHECK (ganador_lado IN ('a','b')),
  puntos_a                 int         NULL CHECK (puntos_a IS NULL OR puntos_a >= 0),
  puntos_b                 int         NULL CHECK (puntos_b IS NULL OR puntos_b >= 0),
  propuesto_por            uuid        NOT NULL REFERENCES auth.users(id),
  confirmado_por_perdedor  boolean     NOT NULL DEFAULT false,
  disputado                boolean     NOT NULL DEFAULT false,
  confirmado_at            timestamptz NULL,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE resultados_partido_rapido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resultados_partido_rapido_select" ON resultados_partido_rapido
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partidos_rapidos p
      WHERE p.id = partido_id
        AND (p.capitan_a_id = auth.uid() OR p.capitan_b_id = auth.uid())
    )
  );

CREATE POLICY "resultados_partido_rapido_insert" ON resultados_partido_rapido
  FOR INSERT WITH CHECK (
    auth.uid() = propuesto_por AND
    EXISTS (
      SELECT 1 FROM partidos_rapidos p
      WHERE p.id = partido_id
        AND (p.capitan_a_id = auth.uid() OR p.capitan_b_id = auth.uid())
    )
  );

CREATE POLICY "resultados_partido_rapido_update" ON resultados_partido_rapido
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM partidos_rapidos p
      WHERE p.id = partido_id
        AND (p.capitan_a_id = auth.uid() OR p.capitan_b_id = auth.uid())
    )
  );

-- ── emparejar_partido_rapido ─────────────────────────────────────────────────
-- Busca otro partido "buscando" en la misma cancha+formato (creado en las
-- últimas 4h, de un capitán distinto) y lo fusiona con el propio: la fila
-- MÁS ANTIGUA (la que ya estaba en el lobby) se actualiza con capitan_b_id y
-- pasa a 'emparejado'; la fila recién creada del segundo capitán se cancela
-- (el trío del lado b se inserta contra la fila antigua, no contra la nueva
-- — eso lo hace el caller en el mismo POST). FOR UPDATE SKIP LOCKED evita que
-- dos búsquedas concurrentes en la misma cancha se emparejen dos veces.
-- Devuelve el id del partido que quedó activo (propio o ajeno) o NULL si no
-- había nadie buscando.
CREATE OR REPLACE FUNCTION emparejar_partido_rapido(p_partido_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_propio   partidos_rapidos%ROWTYPE;
  v_rival_id uuid;
BEGIN
  SELECT * INTO v_propio FROM partidos_rapidos WHERE id = p_partido_id;
  IF NOT FOUND OR v_propio.estado <> 'buscando' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_rival_id
  FROM partidos_rapidos
  WHERE cancha_id = v_propio.cancha_id
    AND formato = v_propio.formato
    AND estado = 'buscando'
    AND id <> v_propio.id
    AND capitan_a_id <> v_propio.capitan_a_id
    AND created_at > now() - interval '4 hours'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_rival_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE partidos_rapidos
  SET capitan_b_id = v_propio.capitan_a_id,
      estado = 'emparejado',
      matched_at = now()
  WHERE id = v_rival_id;

  UPDATE partidos_rapidos
  SET estado = 'cancelado'
  WHERE id = v_propio.id;

  RETURN v_rival_id;
END;
$$;
