-- Hacer temporada_id nullable (no tenemos temporadas aún)
alter table equipos alter column temporada_id drop not null;
alter table equipo_miembros alter column temporada_id drop not null;

-- Agregar display_name al perfil (para mostrar nombre real en roster)
alter table profiles add column if not exists display_name text;

-- RLS equipo_miembros: permitir insertar si eres tú mismo
create policy "miembro insert self" on equipo_miembros
  for insert with check (auth.uid() = jugador_id);

-- RLS equipo_miembros: permitir borrar si eres admin del equipo o el mismo jugador
create policy "miembro delete" on equipo_miembros
  for delete using (
    auth.uid() = jugador_id
  );

-- RLS invitaciones: admins pueden ver sus invitaciones
create policy "invitacion select" on invitaciones
  for select using (
    exists (
      select 1 from equipo_miembros
      where equipo_id = invitaciones.equipo_id
      and jugador_id = auth.uid()
      and rol = 'admin'
    )
  );

-- RLS invitaciones: admins pueden crear invitaciones
create policy "invitacion insert" on invitaciones
  for insert with check (
    exists (
      select 1 from equipo_miembros
      where equipo_id = invitaciones.equipo_id
      and jugador_id = auth.uid()
      and rol = 'admin'
    )
  );
