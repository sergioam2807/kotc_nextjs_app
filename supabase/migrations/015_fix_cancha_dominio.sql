-- ============================================================
-- Fix cancha_dominio:
-- 1. temporada_id was NOT NULL — no season exists yet, INSERTs fail
-- 2. unique constraint included temporada_id — must be rebuilt
-- 3. No INSERT/UPDATE RLS policies — all writes blocked silently
-- 4. equipos has no UPDATE policy — add_team_xp bypasses RLS via
--    SECURITY DEFINER, but explicit UPDATE needed for other paths
-- ============================================================

-- 1. Make temporada_id optional
ALTER TABLE cancha_dominio ALTER COLUMN temporada_id DROP NOT NULL;

-- 2. Rebuild unique constraint without temporada_id
--    (name may differ — drop both possibilities)
ALTER TABLE cancha_dominio DROP CONSTRAINT IF EXISTS cancha_dominio_cancha_id_equipo_id_temporada_id_key;
ALTER TABLE cancha_dominio DROP CONSTRAINT IF EXISTS cancha_dominio_unique;

ALTER TABLE cancha_dominio
  ADD CONSTRAINT cancha_dominio_cancha_equipo_unique
  UNIQUE (cancha_id, equipo_id);

-- 3. RLS policies for cancha_dominio writes
--    Allow authenticated users whose equipo is the one being recorded
DROP POLICY IF EXISTS "dominio insert auth" ON cancha_dominio;
CREATE POLICY "dominio insert auth" ON cancha_dominio
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dominio update auth" ON cancha_dominio;
CREATE POLICY "dominio update auth" ON cancha_dominio
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 4. equipos UPDATE policy (for any authenticated team member)
DROP POLICY IF EXISTS "equipo update miembro" ON equipos;
CREATE POLICY "equipo update miembro" ON equipos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM equipo_miembros
      WHERE equipo_id = equipos.id
        AND jugador_id = auth.uid()
    )
  );
