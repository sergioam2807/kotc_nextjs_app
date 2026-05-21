-- Drop any pre-existing desafios table (may have wrong schema from manual creation)
drop table if exists desafios cascade;

create table desafios (
  id uuid primary key default gen_random_uuid(),
  equipo_retador_id uuid references equipos(id) on delete cascade not null,
  equipo_retado_id uuid references equipos(id) on delete cascade not null,
  cancha_id uuid references canchas(id) on delete cascade not null,
  deporte text not null,
  formato text not null,
  fecha timestamptz not null,
  mensaje text,
  estado text not null default 'pendiente',
  created_at timestamptz default now() not null,
  constraint estado_valido check (estado in ('pendiente', 'aceptado', 'rechazado', 'jugado')),
  constraint equipos_distintos check (equipo_retador_id != equipo_retado_id)
);

create index idx_desafios_retador on desafios(equipo_retador_id);
create index idx_desafios_retado on desafios(equipo_retado_id);
create index idx_desafios_estado on desafios(estado);
create index idx_desafios_fecha on desafios(fecha);

alter table desafios enable row level security;

create policy "ver desafios del equipo" on desafios for select
  using (
    exists (
      select 1 from equipo_miembros
      where jugador_id = auth.uid()
      and (equipo_id = equipo_retador_id or equipo_id = equipo_retado_id)
    )
  );

create policy "crear desafio" on desafios for insert
  with check (
    exists (
      select 1 from equipo_miembros
      where jugador_id = auth.uid()
      and equipo_id = equipo_retador_id
    )
  );

create policy "actualizar desafio" on desafios for update
  using (
    exists (
      select 1 from equipo_miembros
      where jugador_id = auth.uid()
      and (equipo_id = equipo_retador_id or equipo_id = equipo_retado_id)
    )
  );
