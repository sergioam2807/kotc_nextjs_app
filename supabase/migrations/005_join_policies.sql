-- Permitir leer invitaciones pendientes no expiradas (necesario para la página /join)
create policy "invitacion read pending" on invitaciones
  for select using (estado = 'pendiente' and expira_at > now());

-- Permitir que el invitado acepte (actualice estado a 'aceptada')
create policy "invitacion update accept" on invitaciones
  for update using (estado = 'pendiente' and expira_at > now())
  with check (estado = 'aceptada');
