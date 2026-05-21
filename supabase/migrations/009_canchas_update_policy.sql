-- Allow authenticated users to update court info (community-managed data)
create policy "cancha editar" on canchas
  for update
  using (auth.uid() is not null);
