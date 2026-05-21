alter table profiles add column if not exists deportes_activos text[] not null default '{}';
