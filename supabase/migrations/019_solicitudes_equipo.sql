-- 019: Player → team join requests (solicitudes)
CREATE TABLE IF NOT EXISTS solicitudes_equipo (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  equipo_id uuid NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  jugador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensaje text,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(equipo_id, jugador_id)
);

ALTER TABLE solicitudes_equipo ENABLE ROW LEVEL SECURITY;

-- Player sees their own solicitudes
CREATE POLICY "sol_jugador_select" ON solicitudes_equipo
  FOR SELECT USING (auth.uid() = jugador_id);

-- Team admins/captains see solicitudes for their team
CREATE POLICY "sol_admin_select" ON solicitudes_equipo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM equipo_miembros em
      WHERE em.equipo_id = solicitudes_equipo.equipo_id
        AND em.jugador_id = auth.uid()
        AND em.rol IN ('admin', 'capitan')
    )
  );

-- Player can create solicitud only if not already in a team
CREATE POLICY "sol_jugador_insert" ON solicitudes_equipo
  FOR INSERT WITH CHECK (
    auth.uid() = jugador_id
    AND NOT EXISTS (
      SELECT 1 FROM equipo_miembros em
      WHERE em.jugador_id = auth.uid()
    )
  );

-- Team admin/captain can update estado
CREATE POLICY "sol_admin_update" ON solicitudes_equipo
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM equipo_miembros em
      WHERE em.equipo_id = solicitudes_equipo.equipo_id
        AND em.jugador_id = auth.uid()
        AND em.rol IN ('admin', 'capitan')
    )
  );

-- Player can cancel (delete) their own solicitud
CREATE POLICY "sol_jugador_delete" ON solicitudes_equipo
  FOR DELETE USING (auth.uid() = jugador_id);

-- Allow team admins to insert new members (for solicitud acceptance)
-- Only if a solicitud in state 'aceptada' or 'pendiente' exists
CREATE POLICY "admin_puede_agregar_miembro_via_solicitud" ON equipo_miembros
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM equipo_miembros em
      WHERE em.equipo_id = equipo_miembros.equipo_id
        AND em.jugador_id = auth.uid()
        AND em.rol IN ('admin', 'capitan')
    )
  );
