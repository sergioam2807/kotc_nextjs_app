-- Migration 025: Security fixes & transactional helpers
-- Addresses C-3 (dissolution without transaction), L-1 (league capacity TOCTOU),
-- and architecture recommendation (batch XP to replace N individual RPCs).

-- ────────────────────────────────────────────────────────────────────────────
-- [C-3] disolver_equipo — transactional team dissolution
-- Replaces the 6-step sequential delete in /api/equipo/disolver/route.ts.
-- Running inside a single function means all-or-nothing: if any step fails,
-- the entire dissolution is rolled back automatically by PostgreSQL.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION disolver_equipo(p_equipo_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin of the team
  IF NOT EXISTS (
    SELECT 1 FROM equipo_miembros
    WHERE equipo_id = p_equipo_id
      AND jugador_id = p_user_id
      AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Sin permisos para disolver este equipo';
  END IF;

  -- FK-safe cascade in order (same order as the route)
  DELETE FROM cancha_dominio      WHERE equipo_id = p_equipo_id;
  DELETE FROM solicitudes_equipo  WHERE equipo_id = p_equipo_id;
  DELETE FROM invitaciones        WHERE equipo_id = p_equipo_id;

  DELETE FROM resultados
    WHERE desafio_id IN (
      SELECT id FROM desafios
      WHERE equipo_retador_id = p_equipo_id
         OR equipo_retado_id  = p_equipo_id
    );
  DELETE FROM desafios
    WHERE equipo_retador_id = p_equipo_id
       OR equipo_retado_id  = p_equipo_id;

  -- equipo_miembros DELETE triggers trg_equipo_miembro_delete →
  -- sets fecha_salida in historial_equipos (preserves personal history)
  DELETE FROM equipo_miembros WHERE equipo_id = p_equipo_id;

  -- equipos has ON DELETE SET NULL in historial_equipos
  DELETE FROM equipos WHERE id = p_equipo_id;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- [L-1] check_max_equipos — prevent race condition on league capacity
-- A trigger ensures the max is enforced atomically at the DB level,
-- protecting against concurrent inserts that both pass the app-level check.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _check_max_equipos()
RETURNS TRIGGER AS $$
DECLARE
  v_max   integer;
  v_count integer;
BEGIN
  -- Only enforce on accepted status
  IF NEW.estado = 'aceptado' THEN
    SELECT max_equipos INTO v_max FROM ligas WHERE id = NEW.liga_id;

    SELECT COUNT(*) INTO v_count
    FROM liga_equipos
    WHERE liga_id = NEW.liga_id
      AND estado  = 'aceptado'
      AND id      <> NEW.id; -- exclude the row being inserted/updated

    IF v_count >= v_max THEN
      RAISE EXCEPTION 'La liga ya alcanzó el máximo de % equipos', v_max;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_max_equipos ON liga_equipos;
CREATE TRIGGER trg_check_max_equipos
  BEFORE INSERT OR UPDATE ON liga_equipos
  FOR EACH ROW EXECUTE FUNCTION _check_max_equipos();

-- ────────────────────────────────────────────────────────────────────────────
-- [architecture] add_xp_batch — distribute XP to N players in 1 call
-- Replaces the N individual add_xp() RPCs fired in resultados confirmation
-- (one per team member). 2 calls (winners + losers) instead of N.
-- Also auto-levels each player, same as individual add_xp().
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION add_xp_batch(user_ids uuid[], amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid;
BEGIN
  FOREACH uid IN ARRAY user_ids LOOP
    PERFORM add_xp(uid, amount);  -- reuse existing add_xp which handles auto-level
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Note: to use disolver_equipo from the API route, replace the sequential
-- delete block with:
--   const { error } = await supabase.rpc('disolver_equipo', {
--     p_equipo_id: equipoId,
--     p_user_id:   user.id,
--   });
-- ────────────────────────────────────────────────────────────────────────────
