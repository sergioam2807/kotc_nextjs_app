-- Migration 026: RLS hardening + SECURITY DEFINER search_path
-- Addresses B-2 (liga_equipos_update too permissive) and B-4 (search_path
-- for SECURITY DEFINER functions is best practice to prevent search_path injection).

-- ────────────────────────────────────────────────────────────────────────────
-- [B-2] Tighten liga_equipos_update RLS policy
--
-- Problem: the existing policy allowed admin/captain of an equipo to UPDATE
-- any field in their liga_equipos row (including grupo, seed) directly via
-- the Supabase JS client (bypassing the API).
--
-- Fixed: admin/captain can only transition estado from 'invitado' → 'aceptado'
-- or 'invitado' → 'rechazado'. Setting grupo or seed requires being the
-- liga organizer (already unrestricted for organizers).
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "liga_equipos_update" ON liga_equipos;

CREATE POLICY "liga_equipos_update" ON liga_equipos
  FOR UPDATE
  USING (
    -- Organizer can update any field (grupo, seed, estado, etc.)
    EXISTS (
      SELECT 1 FROM ligas
      WHERE id = liga_id AND organizador_id = auth.uid()
    )
    OR
    -- Admin/captain of the team can only respond to invitations
    (
      EXISTS (
        SELECT 1 FROM equipo_miembros
        WHERE equipo_id = liga_equipos.equipo_id
          AND jugador_id = auth.uid()
          AND rol IN ('admin', 'capitan')
      )
      -- Must currently be in 'invitado' state to respond
      AND estado = 'invitado'
    )
  )
  WITH CHECK (
    -- Organizer: unrestricted
    EXISTS (
      SELECT 1 FROM ligas
      WHERE id = liga_id AND organizador_id = auth.uid()
    )
    OR
    -- Admin/captain: can only set estado to 'aceptado' or 'rechazado'
    -- All other fields (grupo, seed) must remain unchanged
    (
      EXISTS (
        SELECT 1 FROM equipo_miembros
        WHERE equipo_id = liga_equipos.equipo_id
          AND jugador_id = auth.uid()
          AND rol IN ('admin', 'capitan')
      )
      AND estado IN ('aceptado', 'rechazado')
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- [B-4] Set search_path on all SECURITY DEFINER functions
--
-- SECURITY DEFINER functions run with the privileges of the function owner
-- (postgres). Without a fixed search_path, a malicious user who can create
-- objects in a schema that appears before 'public' in the search_path could
-- shadow built-in functions and redirect execution.
--
-- This is a defense-in-depth measure; Supabase's default config already
-- restricts schema creation, but explicit search_path is considered
-- best practice per CIS PostgreSQL Benchmarks.
-- ────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION disolver_equipo(uuid, uuid)     SET search_path = public;
ALTER FUNCTION add_xp_batch(uuid[], int)       SET search_path = public;
ALTER FUNCTION _check_max_equipos()            SET search_path = public;

-- Also harden the existing functions from earlier migrations if they exist
DO $$
BEGIN
  -- add_xp (migration 008/016)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_xp') THEN
    EXECUTE 'ALTER FUNCTION add_xp(uuid, int) SET search_path = public';
  END IF;
  -- add_team_xp (migration 014/016)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_team_xp') THEN
    EXECUTE 'ALTER FUNCTION add_team_xp(uuid, int) SET search_path = public';
  END IF;
  -- _compute_nivel (migration 016)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_compute_nivel') THEN
    EXECUTE 'ALTER FUNCTION _compute_nivel(int) SET search_path = public';
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Note: rate limiting (B-4 from security audit) cannot be implemented at the
-- DB layer. Implement via Upstash Rate Limit in Next.js middleware or Vercel
-- Edge Config when ready for production.
-- ────────────────────────────────────────────────────────────────────────────
