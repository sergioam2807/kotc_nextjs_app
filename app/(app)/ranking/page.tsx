import { createClient } from '@/lib/supabase/server';
import { TeamRankingStat, PlayerRankingStat } from '@/components/ranking/types';
import RankingClientWrapper from '@/components/ranking/RankingClientWrapper';

export default async function RankingPage() {
  const supabase = await createClient();

  const [
    { data: equipos },
    { data: dominioRaw },
    { data: miembrosRaw },
    { data: profiles },
    { data: playerMemberships },
    { data: allEquipos },
    { data: { user } },
    { data: temporadaActiva },
  ] = await Promise.all([
    supabase.from('equipos').select('id, nombre, color, ciudad, deporte, xp, nivel'),
    supabase.from('cancha_dominio').select('equipo_id, victorias, derrotas, es_king'),
    supabase.from('equipo_miembros').select('equipo_id'),
    supabase.from('profiles').select('id, username, display_name, avatar_url, xp, nivel').order('xp', { ascending: false }).limit(100),
    supabase.from('equipo_miembros').select('jugador_id, equipo_id'),
    supabase.from('equipos').select('id, nombre, color'),
    supabase.auth.getUser(),
    supabase.from('temporadas').select('id, nombre').eq('activa', true).maybeSingle(),
  ]);

  const teamStats: TeamRankingStat[] = (equipos ?? []).map((equipo) => {
    const dominios = (dominioRaw ?? []).filter((d) => d.equipo_id === equipo.id);
    const kingCourts = dominios.filter((d) => d.es_king).length;
    const totalVictorias = dominios.reduce((s, d) => s + (d.victorias ?? 0), 0);
    const totalDerrotas = dominios.reduce((s, d) => s + (d.derrotas ?? 0), 0);
    const miembros = (miembrosRaw ?? []).filter((m) => m.equipo_id === equipo.id).length;
    // Puntos: canchas king × 100 + victorias × 10 + XP del equipo como tiebreaker
    const puntos = kingCourts * 100 + totalVictorias * 10;
    const winRate =
      totalVictorias + totalDerrotas > 0
        ? Math.round((totalVictorias / (totalVictorias + totalDerrotas)) * 100)
        : 0;
    return {
      id: equipo.id,
      nombre: equipo.nombre,
      color: equipo.color,
      ciudad: equipo.ciudad ?? null,
      deporte: equipo.deporte ?? null,
      puntos,
      kingCourts,
      totalVictorias,
      totalDerrotas,
      winRate,
      miembros,
      xp: equipo.xp ?? 0,
      nivel: equipo.nivel ?? 1,
    };
  }).sort((a, b) => b.puntos - a.puntos || b.kingCourts - a.kingCourts || b.xp - a.xp);

  const playerStats: PlayerRankingStat[] = (profiles ?? []).map((p) => {
    const membresia = (playerMemberships ?? []).find((m) => m.jugador_id === p.id);
    const equipo = membresia ? (allEquipos ?? []).find((e) => e.id === membresia.equipo_id) : null;
    return {
      id: p.id,
      displayName: (p.display_name || p.username) ?? 'Jugador',
      avatarUrl: p.avatar_url ?? null,
      nivel: p.nivel ?? 1,
      xp: p.xp ?? 0,
      equipoNombre: equipo?.nombre ?? null,
      equipoColor: equipo?.color ?? null,
    };
  });

  return (
    <div className="flex flex-col min-h-full bg-surface">
      <RankingClientWrapper
        teamStats={teamStats}
        playerStats={playerStats}
        currentUserId={user?.id ?? null}
        temporadaNombre={temporadaActiva?.nombre ?? null}
      />
    </div>
  );
}
