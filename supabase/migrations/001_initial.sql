-- Perfiles (extiende auth.users)
create table if not exists profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  avatar_url text,
  ciudad text not null,
  nivel int not null default 1,
  xp int not null default 0,
  created_at timestamptz not null default now()
);

-- Temporadas
create table if not exists temporadas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  deporte text not null,
  inicio date not null,
  fin date not null,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- Equipos
create table if not exists equipos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  deporte text not null,
  modalidad text not null,
  ciudad text not null,
  color text not null default '#F5C344',
  logo_url text,
  nivel int not null default 1,
  xp int not null default 0,
  creador_id uuid references profiles not null,
  temporada_id uuid references temporadas not null,
  created_at timestamptz not null default now()
);

-- Miembros
create table if not exists equipo_miembros (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid references equipos on delete cascade not null,
  jugador_id uuid references profiles not null,
  rol text not null check (rol in ('admin', 'capitan', 'jugador')),
  posicion text not null check (posicion in ('titular', 'suplente')),
  temporada_id uuid references temporadas not null,
  deporte text not null,
  joined_at timestamptz not null default now(),
  unique(jugador_id, temporada_id, deporte)
);

-- Canchas
create table if not exists canchas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text not null,
  lat float not null,
  lng float not null,
  fotos text[] not null default '{}',
  horarios jsonb not null default '{}',
  deporte text[] not null default '{}',
  agregada_por uuid references profiles not null,
  validada boolean not null default false,
  created_at timestamptz not null default now()
);

-- Dominio de canchas
create table if not exists cancha_dominio (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid references canchas on delete cascade not null,
  equipo_id uuid references equipos not null,
  temporada_id uuid references temporadas not null,
  victorias int not null default 0,
  derrotas int not null default 0,
  es_king boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(cancha_id, equipo_id, temporada_id)
);

-- Desafíos
create table if not exists desafios (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid references canchas not null,
  equipo_retador_id uuid references equipos not null,
  equipo_retado_id uuid references equipos not null,
  modalidad text not null,
  fecha_hora timestamptz not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptado', 'rechazado', 'jugado')),
  con_cambios boolean not null default false,
  created_at timestamptz not null default now()
);

-- Resultados
create table if not exists resultados (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid references desafios on delete cascade not null,
  puntos_retador int not null,
  puntos_retado int not null,
  ganador_id uuid references equipos not null,
  confirmado_retador boolean not null default false,
  confirmado_retado boolean not null default false,
  created_at timestamptz not null default now()
);

-- Invitaciones
create table if not exists invitaciones (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid references equipos on delete cascade not null,
  invitado_por uuid references profiles not null,
  email text,
  telefono text,
  token text unique not null default gen_random_uuid()::text,
  metodo text not null check (metodo in ('email', 'whatsapp', 'link')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'expirada')),
  expira_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

-- RLS básico
alter table profiles enable row level security;
alter table equipos enable row level security;
alter table equipo_miembros enable row level security;
alter table canchas enable row level security;
alter table cancha_dominio enable row level security;
alter table desafios enable row level security;
alter table resultados enable row level security;
alter table invitaciones enable row level security;
alter table temporadas enable row level security;

-- Políticas básicas de lectura pública
create policy "perfiles publicos" on profiles for select using (true);
create policy "equipos publicos" on equipos for select using (true);
create policy "canchas publicas" on canchas for select using (true);
create policy "dominio publico" on cancha_dominio for select using (true);
create policy "desafios publicos" on desafios for select using (true);
create policy "temporadas publicas" on temporadas for select using (true);
create policy "miembros publicos" on equipo_miembros for select using (true);

-- Políticas de escritura autenticada
create policy "perfil propio" on profiles for all using (auth.uid() = id);
create policy "equipo propio" on equipos for insert with check (auth.uid() = creador_id);
create policy "cancha agregar" on canchas for insert with check (auth.uid() = agregada_por);
