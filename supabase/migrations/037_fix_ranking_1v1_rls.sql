-- Migration 037: Fix ranking_1v1 RLS policies
-- The previous policy "ranking_1v1_owner_write" used USING (auth.uid() = jugador_id)
-- for ALL operations, which blocked the API from inserting/updating another player's row
-- when confirming a 1v1 result (e.g. loser confirms → needs to write winner's ranking row).
-- Fix: allow any authenticated user to insert/update (API layer controls correctness).

-- Remove the restrictive policy
DROP POLICY IF EXISTS "ranking_1v1_owner_write" ON ranking_1v1;

-- Separate read (public) and write (any authenticated user via API) policies
CREATE POLICY "ranking_1v1_insert" ON ranking_1v1
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ranking_1v1_update" ON ranking_1v1
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Only the row owner (or admin) can delete their own ranking entry
CREATE POLICY "ranking_1v1_delete" ON ranking_1v1
  FOR DELETE
  USING (auth.uid() = jugador_id);
