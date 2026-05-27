import { createClient } from '@/lib/supabase/server';
import { JugadoresClientWrapper } from '@/components/jugadores/JugadoresClientWrapper';

export interface JugadorRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  nivel: number | null;
  xp: number | null;
  ciudad: string | null;
  bio: string | null;
  posicion_principal: string | null;
  especialidades: string[] | null;
  deportes_activos: string[] | null;
  disponible_reclutamiento: boolean | null;
  region: string | null;
  comuna: string | null;
}

export default async function JugadoresPage() {
  const supabase = await createClient();

  // Current viewer — check if they're admin/captain
  const { data: { user } } = await supabase.auth.getUser();
  const { data: viewerMembresia } = user
    ? await supabase
        .from('equipo_miembros')
        .select('equipo_id, rol, equipos(id, nombre)')
        .eq('jugador_id', user.id)
        .in('rol', ['admin', 'capitan'])
        .limit(1)
        .maybeSingle()
    : { data: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerEquipo = viewerMembresia?.equipo_id
    ? { id: viewerMembresia.equipo_id, nombre: (viewerMembresia as any).equipos?.nombre ?? 'Mi equipo' }
    : null;

  // Build map: jugador_id → token de invitación pendiente (no expirada)
  const invitacionesMapa: Record<string, string> = {};
  if (viewerEquipo) {
    const ahora = new Date().toISOString();
    const { data: invsPendientes } = await supabase
      .from('invitaciones')
      .select('jugador_id, token, expira_at')
      .eq('equipo_id', viewerEquipo.id)
      .eq('estado', 'pendiente')
      .not('jugador_id', 'is', null)
      .gt('expira_at', ahora);

    for (const inv of invsPendientes ?? []) {
      if (inv.jugador_id && inv.token) {
        invitacionesMapa[inv.jugador_id] = inv.token;
      }
    }
  }

  const { data: jugadores } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, nivel, xp, ciudad, bio, posicion_principal, especialidades, deportes_activos, disponible_reclutamiento, region, comuna',
    )
    .eq('disponible_reclutamiento', true)
    .order('xp', { ascending: false })
    .limit(50);

  // Get all player IDs that already have a team
  const { data: miembros } = await supabase
    .from('equipo_miembros')
    .select('jugador_id');

  const conEquipo = new Set((miembros ?? []).map(m => m.jugador_id));
  const disponibles = (jugadores ?? []).filter(
    j => !conEquipo.has(j.id) && j.id !== user?.id,
  ) as JugadorRow[];

  return (
    <JugadoresClientWrapper
      jugadores={disponibles}
      viewerEquipo={viewerEquipo}
      invitacionesMapa={invitacionesMapa}
    />
  );
}
