import { createClient } from '@/lib/supabase/server';
import { TeamRankingStat, PlayerRankingStat, Player1v1Stat } from '@/components/ranking/types';
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
    { data: ranking1v1Raw },
  ] = await Promise.all([
    supabase.from('equipos').select('id, nombre, color, ciudad, deporte, xp, nivel'),
    supabase.from('cancha_dominio').select('equipo_id, victorias, derrotas, es_king'),
    supabase.from('equipo_miembros').select('equipo_id'),
    supabase.from('profiles').select('id, username, display_name, avatar_url, xp, nivel').order('xp', { ascending: false }).limit(100),
    supabase.from('equipo_miembros').select('jugador_id, equipo_id'),
    supabase.from('equipos').select('id, nombre, color'),
    supabase.auth.getUser(),
    supabase.from('temporadas').select('id, nombre, color, emoji, numero').eq('activa', true).maybeSingle(),
    supabase.from('ranking_1v1').select('jugador_id, puntos, victorias, derrotas, racha_actual, racha_max').is('temporada_id', null).order('puntos', { ascending: false }).limit(100),
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

  // ── 1v1 ranking ────────────────────────────────────────────────────────────
  const r1v1List = ranking1v1Raw ?? [];
  const jugadorIds1v1 = r1v1List.map(r => r.jugador_id).filter(Boolean);

  // Fetch profiles for 1v1 players not already in playerMemberships/profiles
  const profiles1v1Map = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  // Fetch missing profiles (players not in top-100 XP but in 1v1 ranking)
  const missingIds = jugadorIds1v1.filter(id => !profiles1v1Map[id]);
  if (missingIds.length > 0) {
    const { data: extra } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, xp, nivel')
      .in('id', missingIds);
    for (const p of extra ?? []) {
      profiles1v1Map[p.id] = p;
    }
  }

  const membershipMap = Object.fromEntries(
    (playerMemberships ?? []).map(m => [m.jugador_id, m.equipo_id]),
  );
  const equipoMap = Object.fromEntries((allEquipos ?? []).map(e => [e.id, e]));

  const stats1v1: Player1v1Stat[] = r1v1List
    .map(r => {
      const p = profiles1v1Map[r.jugador_id];
      if (!p) return null;
      const equipoId = membershipMap[r.jugador_id];
      const equipo = equipoId ? equipoMap[equipoId] : null;
      return {
        jugador_id:  r.jugador_id,
        displayName: p.display_name ?? p.username ?? 'Jugador',
        avatarUrl:   p.avatar_url ?? null,
        nivel:       p.nivel ?? 1,
        xp:          p.xp ?? 0,
        puntos:      r.puntos ?? 0,
        victorias:   r.victorias ?? 0,
        derrotas:    r.derrotas ?? 0,
        racha_actual: r.racha_actual ?? 0,
        racha_max:   r.racha_max ?? 0,
        equipoNombre: equipo?.nombre ?? null,
        equipoColor:  equipo?.color ?? null,
      };
    })
    .filter(Boolean) as Player1v1Stat[];

  return (
    <div className="flex flex-col min-h-full bg-surface">
      <RankingClientWrapper
        teamStats={teamStats}
        playerStats={playerStats}
        stats1v1={stats1v1}
        currentUserId={user?.id ?? null}
        temporadaNombre={temporadaActiva?.nombre ?? null}
        temporadaColor={(temporadaActiva as { color?: string | null } | null)?.color ?? null}
        temporadaEmoji={(temporadaActiva as { emoji?: string | null } | null)?.emoji ?? null}
        temporadaNumero={(temporadaActiva as { numero?: number | null } | null)?.numero ?? null}
      />
    </div>
  );
}
