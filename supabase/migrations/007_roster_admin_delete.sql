-- Permitir que admins expulsen miembros de su equipo
drop policy if exists "miembro delete" on equipo_miembros;

create policy "miembro delete" on equipo_miembros
  for delete using (
    auth.uid() = jugador_id
    or exists (
      select 1 from equipo_miembros admins
      where admins.equipo_id = equipo_miembros.equipo_id
        and admins.jugador_id = auth.uid()
        and admins.rol = 'admin'
    )
  );
