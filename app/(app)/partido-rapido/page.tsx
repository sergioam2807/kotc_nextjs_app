import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PartidoRapidoWizard } from '@/components/partido-rapido/PartidoRapidoWizard';
import type { CanchaSimple } from '@/components/partido-rapido/types';

export default async function PartidoRapidoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: canchasRaw }, { data: activo }] = await Promise.all([
    supabase.from('profiles').select('username, display_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase
      .from('canchas')
      .select('id, nombre, direccion, lat, lng, es_publica, precio_hora, nombre_recinto, superficie')
      .eq('status', 'verified')
      .contains('deporte', ['basketball'])
      .order('nombre', { ascending: true }),
    supabase
      .from('partidos_rapidos')
      .select('id')
      .or(`capitan_a_id.eq.${user.id},capitan_b_id.eq.${user.id}`)
      .in('estado', ['pendiente', 'buscando', 'emparejado', 'resultado_pendiente', 'disputado'])
      .limit(1)
      .maybeSingle(),
  ]);

  const canchaIds = (canchasRaw ?? []).map(c => c.id);

  // Rey 3v3 vigente por cancha — para que el wizard ofrezca "Retar al Rey"
  // en el paso "Elegir rival" sin otra llamada al abrir esa cancha.
  const { data: reyesRaw } = canchaIds.length
    ? await supabase
        .from('cancha_dominio')
        .select('cancha_id, jugador_id')
        .in('cancha_id', canchaIds)
        .eq('formato', '3v3')
        .eq('es_king', true)
        .not('jugador_id', 'is', null)
    : { data: [] };

  const jugadorIds = [...new Set((reyesRaw ?? []).map(r => r.jugador_id).filter((v): v is string => !!v))];
  const { data: perfilesReyes } = jugadorIds.length
    ? await supabase.from('profiles').select('id, username, display_name').in('id', jugadorIds)
    : { data: [] };
  const perfilMap = Object.fromEntries((perfilesReyes ?? []).map(p => [p.id, p]));
  const reyPorCancha = Object.fromEntries(
    (reyesRaw ?? [])
      .filter(r => !!r.jugador_id)
      .map(r => {
        const perfil = perfilMap[r.jugador_id as string];
        return [r.cancha_id, { jugadorId: r.jugador_id as string, nombre: perfil?.display_name ?? perfil?.username ?? 'Jugador' }];
      }),
  );

  const canchas: CanchaSimple[] = (canchasRaw ?? []).map(c => ({
    ...c,
    king: reyPorCancha[c.id] ?? null,
  }));

  return (
    <PartidoRapidoWizard
      userId={user.id}
      userNombre={profile?.display_name ?? profile?.username ?? 'Tú'}
      canchas={canchas}
      partidoActivoId={activo?.id ?? null}
    />
  );
}
