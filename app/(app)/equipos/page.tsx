import { createClient } from '@/lib/supabase/server';
import EquiposClientWrapper from '@/components/equipos/EquiposClientWrapper';

export default async function EquiposPage({
  searchParams,
}: {
  searchParams: Promise<{ rivales?: string }>;
}) {
  const { rivales } = await searchParams;
  const supabase = await createClient();

  // Current user — check if they already have a team
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userMembresia } = user
    ? await supabase
        .from('equipo_miembros')
        .select('equipo_id')
        .eq('jugador_id', user.id)
        .limit(1)
        .maybeSingle()
    : { data: null };
  const userEquipoId = userMembresia?.equipo_id ?? null;

  // Fetch all teams with member count (including region)
  const { data: equiposRaw } = await supabase
    .from('equipos')
    .select('id, nombre, deporte, modalidad, ciudad, region, color, nivel, xp, buscando_rival, rival_modalidad, equipo_miembros(count)')
    .order('xp', { ascending: false });

  const equipos = equiposRaw ?? [];

  return (
    <EquiposClientWrapper
      equipos={equipos}
      userEquipoId={userEquipoId}
      userId={user?.id ?? null}
      initialSoloRivales={rivales === '1'}
    />
  );
}
