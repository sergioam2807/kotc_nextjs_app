-- Eliminar filas duplicadas en equipo_miembros (keep admin/capitan over jugador)
delete from equipo_miembros
where id not in (
  select distinct on (equipo_id, jugador_id) id
  from equipo_miembros
  order by equipo_id, jugador_id,
    case rol when 'admin' then 0 when 'capitan' then 1 else 2 end
);

-- Prevenir duplicados futuros
alter table equipo_miembros
  add constraint equipo_miembros_equipo_jugador_unique unique (equipo_id, jugador_id);
