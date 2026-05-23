-- Migration 024: link invitations directly to a known player (in-app notifications)
-- Allows admins to invite a player from their profile page; the invitation
-- becomes visible to that player inside the app (no need to share a link).

ALTER TABLE invitaciones
  ADD COLUMN IF NOT EXISTS jugador_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for fast lookup: "show me all pending invitations for this player"
CREATE INDEX IF NOT EXISTS invitaciones_jugador_id_idx ON invitaciones (jugador_id)
  WHERE jugador_id IS NOT NULL;

-- RLS: let the invited player read their own invitations
CREATE POLICY IF NOT EXISTS "Jugador puede ver sus invitaciones recibidas"
  ON invitaciones FOR SELECT
  USING (jugador_id = auth.uid());
