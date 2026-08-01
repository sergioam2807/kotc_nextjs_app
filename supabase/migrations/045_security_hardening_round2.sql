-- Migration 045: Security hardening round 2 + race-condition fixes
-- Follow-up to the feature/ligas pre-merge audit (5-flow review).
-- Addresses: canchas/resultados RLS bypassable via direct PostgREST calls,
-- ligas.estado FSM not enforced in RLS, liga_equipos_delete not respecting
-- the en_curso restriction, missing UNIQUE(desafio_id) on resultados, and
-- a non-atomic ranking_1v1 read-modify-write.

-- ────────────────────────────────────────────────────────────────────────────
-- [1] canchas: UPDATE policy was `auth.uid() IS NOT NULL` — any authenticated
-- user could edit any court directly via PostgREST, bypassing the ownership
-- check that only lives in app/api/canchas/[id]/route.ts.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cancha editar" ON canchas;
CREATE POLICY "cancha editar" ON canchas
  FOR UPDATE
  USING (auth.uid() = agregada_por);

-- ────────────────────────────────────────────────────────────────────────────
-- [2] resultados: INSERT/UPDATE policies were `auth.uid() IS NOT NULL` — any
-- authenticated user could write to any desafío's resultado. Restrict to
-- participants (members of either team in the referenced desafío).
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "resultados_insert_auth" ON resultados;
CREATE POLICY "resultados_insert_participant" ON resultados
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM desafios d
      JOIN equipo_miembros em
        ON em.equipo_id = d.equipo_retador_id OR em.equipo_id = d.equipo_retado_id
      WHERE d.id = resultados.desafio_id
        AND em.jugador_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "resultados_update_auth" ON resultados;
CREATE POLICY "resultados_update_participant" ON resultados
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM desafios d
      JOIN equipo_miembros em
        ON em.equipo_id = d.equipo_retador_id OR em.equipo_id = d.equipo_retado_id
      WHERE d.id = resultados.desafio_id
        AND em.jugador_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- [3] resultados: add UNIQUE(desafio_id) — mirrors resultados_individual,
-- which already has this. Prevents two concurrent POSTs from both creating
-- a "resultado" row for the same desafío.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE resultados
  ADD CONSTRAINT resultados_desafio_id_unique UNIQUE (desafio_id);

-- ────────────────────────────────────────────────────────────────────────────
-- [4] ligas.estado FSM — RLS `ligas_update` only checks organizador_id, not
-- what the new estado actually is. A trigger enforces valid transitions
-- regardless of how the UPDATE is issued (API or direct PostgREST call).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _validate_liga_estado_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = OLD.estado THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.estado = 'borrador'      AND NEW.estado IN ('inscripciones', 'cancelada')) OR
    (OLD.estado = 'inscripciones' AND NEW.estado IN ('en_curso', 'cancelada')) OR
    (OLD.estado = 'en_curso'      AND NEW.estado IN ('finalizada', 'cancelada'))
  ) THEN
    RAISE EXCEPTION 'Transición de estado inválida: % → %', OLD.estado, NEW.estado;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_liga_estado ON ligas;
CREATE TRIGGER trg_validate_liga_estado
  BEFORE UPDATE ON ligas
  FOR EACH ROW EXECUTE FUNCTION _validate_liga_estado_transition();

-- ────────────────────────────────────────────────────────────────────────────
-- [5] liga_equipos_delete — only the API enforced "no puedes retirarte
-- mientras la liga está en_curso" for non-organizers. Replicate that
-- asymmetry in RLS: organizer can always remove a team; admin/capitán of the
-- team cannot while the liga is en_curso.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "liga_equipos_delete" ON liga_equipos;
CREATE POLICY "liga_equipos_delete" ON liga_equipos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM ligas WHERE id = liga_id AND organizador_id = auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM equipo_miembros
        WHERE equipo_id = liga_equipos.equipo_id
          AND jugador_id = auth.uid()
          AND rol IN ('admin', 'capitan')
      )
      AND NOT EXISTS (
        SELECT 1 FROM ligas WHERE id = liga_id AND estado = 'en_curso'
      )
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- [6] add_ranking_1v1_result — atomic replacement for the read-modify-write
-- pattern in app/api/resultados-1v1/route.ts (which also had a bug: used
-- .is('temporada_id', temporadaId) with a UUID, which only works for NULL).
-- Each side does a single UPDATE (atomic increment); if no row exists yet,
-- falls back to INSERT wrapped in a unique_violation retry loop so a
-- concurrent first-insert from another confirmation can't be lost.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION add_ranking_1v1_result(
  p_ganador_id  uuid,
  p_perdedor_id uuid,
  p_temporada_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Winner ──────────────────────────────────────────────────────────────
  LOOP
    UPDATE ranking_1v1
    SET victorias    = victorias + 1,
        puntos       = puntos + 3,
        racha_actual = racha_actual + 1,
        racha_max    = GREATEST(racha_max, racha_actual + 1),
        updated_at   = now()
    WHERE jugador_id = p_ganador_id
      AND ((p_temporada_id IS NULL AND temporada_id IS NULL) OR temporada_id = p_temporada_id);
    EXIT WHEN FOUND;

    BEGIN
      INSERT INTO ranking_1v1 (jugador_id, temporada_id, victorias, derrotas, puntos, racha_actual, racha_max)
      VALUES (p_ganador_id, p_temporada_id, 1, 0, 3, 1, 1);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Another concurrent confirmation inserted first — loop back and UPDATE it.
    END;
  END LOOP;

  -- ── Loser ───────────────────────────────────────────────────────────────
  LOOP
    UPDATE ranking_1v1
    SET derrotas     = derrotas + 1,
        racha_actual = 0,
        updated_at   = now()
    WHERE jugador_id = p_perdedor_id
      AND ((p_temporada_id IS NULL AND temporada_id IS NULL) OR temporada_id = p_temporada_id);
    EXIT WHEN FOUND;

    BEGIN
      INSERT INTO ranking_1v1 (jugador_id, temporada_id, victorias, derrotas, puntos, racha_actual, racha_max)
      VALUES (p_perdedor_id, p_temporada_id, 0, 1, 0, 0, 0);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
    END;
  END LOOP;
END;
$$;
