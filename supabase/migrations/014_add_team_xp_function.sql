-- Función para incrementar XP de un equipo de forma atómica
create or replace function add_team_xp(team_id uuid, amount int)
returns void
language plpgsql
security definer
as $$
begin
  update equipos set xp = xp + amount where id = team_id;
end;
$$;
