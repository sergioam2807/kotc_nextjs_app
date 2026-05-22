-- ============================================================
-- KOTC — Sistema de niveles 1–100
--
-- Fórmula de umbral acumulado: xp(n) = 100 · n · (n − 1)
--   Nivel  2 →     200 XP
--   Nivel  5 →   2 000 XP
--   Nivel 10 →   9 000 XP
--   Nivel 50 → 245 000 XP
--   Nivel 100→ 990 000 XP
--
-- Inversión analítica: n = FLOOR((1 + SQRT(1 + 4·xp/100)) / 2)
-- XP por nivel n→n+1 = 200·n  (crece linealmente con el nivel)
-- ============================================================

-- ── Función auxiliar (no expuesta a la API) ────────────────
CREATE OR REPLACE FUNCTION _compute_nivel(xp_total int)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(
    100,
    GREATEST(
      1,
      FLOOR((1.0 + SQRT(1.0 + 4.0 * GREATEST(xp_total, 0)::float / 100.0)) / 2.0)::int
    )
  );
$$;

-- ── add_xp: incrementa XP del jugador y auto-nivela ────────
CREATE OR REPLACE FUNCTION add_xp(target_user_id uuid, amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_xp   int;
  new_nivel int;
BEGIN
  UPDATE profiles
  SET    xp = xp + amount
  WHERE  id = target_user_id
  RETURNING xp INTO new_xp;

  new_nivel := _compute_nivel(new_xp);

  UPDATE profiles
  SET    nivel = new_nivel
  WHERE  id = target_user_id
    AND  nivel <> new_nivel;
END;
$$;

-- ── add_team_xp: incrementa XP del equipo y auto-nivela ────
CREATE OR REPLACE FUNCTION add_team_xp(team_id uuid, amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_xp   int;
  new_nivel int;
BEGIN
  UPDATE equipos
  SET    xp = xp + amount
  WHERE  id = team_id
  RETURNING xp INTO new_xp;

  new_nivel := _compute_nivel(new_xp);

  UPDATE equipos
  SET    nivel = new_nivel
  WHERE  id = team_id
    AND  nivel <> new_nivel;
END;
$$;

-- ── Backfill: recalcular nivel de todos los jugadores ───────
UPDATE profiles
SET nivel = _compute_nivel(xp);

-- ── Backfill: recalcular nivel de todos los equipos ────────
UPDATE equipos
SET nivel = _compute_nivel(xp);
