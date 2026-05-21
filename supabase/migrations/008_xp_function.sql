-- Función para incrementar XP de forma atómica
create or replace function add_xp(target_user_id uuid, amount int)
returns void
language plpgsql
security definer
as $$
begin
  update profiles set xp = xp + amount where id = target_user_id;
end;
$$;
