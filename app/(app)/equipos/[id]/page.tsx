import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { XPBar } from '@/components/ui/XPBar';
import { nombreNivel } from '@/lib/levels';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀',
  futbol:     '⚽',
  voleibol:   '🏐',
  tenis:      '🎾',
  padel:      '🏓',
};

const DEPORTE_LABELS: Record<string, string> = {
  basketball: 'Basketball',
  futbol:     'Fútbol',
  voleibol:   'Voleibol',
  tenis:      'Tenis',
  padel:      'Pádel',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIniciales(displayName: string | null | undefined, username: string): string {
  const base = displayName ?? username;
  const words = base.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function getEquipoIniciales(nombre: string): string {
  const words = nombre.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function EquipoPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Equipo
  const { data: equipo } = await supabase
    .from('equipos')
    .select('id, nombre, deporte, modalidad, ciudad, color, nivel, xp')
    .eq('id', id)
    .maybeSingle();

  if (!equipo) {
    return (
      <div className="p-6 text-center">
        <p className="text-[15px] text-on-surface-variant">Equipo no encontrado.</p>
        <Link href="/ranking" className="text-[13px] text-accent hover:underline mt-3 inline-block">
          ← Volver
        </Link>
      </div>
    );
  }

  // 2. Canchas bajo dominio
  const { data: dominio } = await supabase
    .from('cancha_dominio')
    .select('cancha_id, victorias, derrotas, es_king')
    .eq('equipo_id', equipo.id);

  const dominioList = dominio ?? [];
  const canchasKingIds = dominioList.filter(d => d.es_king).map(d => d.cancha_id);

  const { data: canchasKing } = canchasKingIds.length > 0
    ? await supabase
        .from('canchas')
        .select('id, nombre, direccion, deporte')
        .in('id', canchasKingIds)
    : { data: [] };

  const canchaMap = Object.fromEntries((canchasKing ?? []).map(c => [c.id, c]));
  const canchasBajoControl = dominioList
    .filter(d => d.es_king && canchaMap[d.cancha_id])
    .map(d => ({
      ...canchaMap[d.cancha_id],
      victorias: d.victorias ?? 0,
      derrotas:  d.derrotas ?? 0,
    }));

  // 3. Desafíos stats
  const { data: desafiosJugados } = await supabase
    .from('desafios')
    .select('id, equipo_retador_id, equipo_retado_id')
    .or(`equipo_retador_id.eq.${equipo.id},equipo_retado_id.eq.${equipo.id}`)
    .in('estado', ['completado', 'jugado']);

  const totalJugados = desafiosJugados?.length ?? 0;
  let totalGanados = 0;

  if (totalJugados > 0) {
    const desafioIds = (desafiosJugados ?? []).map(d => d.id);
    const { data: resultados } = await supabase
      .from('resultados')
      .select('ganador_id')
      .in('desafio_id', desafioIds);

    totalGanados = (resultados ?? []).filter(r => r.ganador_id === equipo.id).length;
  }

  const totalPerdidos = totalJugados - totalGanados;
  const winRate = totalJugados > 0 ? Math.round((totalGanados / totalJugados) * 100) : 0;

  // 4. Roster
  const { data: rosterMiembros } = await supabase
    .from('equipo_miembros')
    .select('id, rol, posicion, jugador_id')
    .eq('equipo_id', equipo.id)
    .order('posicion');

  const jugadorIds = rosterMiembros?.map(m => m.jugador_id) ?? [];
  const { data: perfiles } = jugadorIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', jugadorIds)
    : { data: [] };

  const perfilMap = Object.fromEntries((perfiles ?? []).map(p => [p.id, p]));
  const roster = (rosterMiembros ?? [])
    .map(m => ({ ...m, jugador: perfilMap[m.jugador_id] }))
    .filter(m => m.jugador);

  // ---------------------------------------------------------------------------
  // Display values
  // ---------------------------------------------------------------------------

  const nivel = equipo.nivel ?? 1;
  const xp = equipo.xp ?? 0;
  const nivelNombre = nombreNivel(nivel);
  const equipoIniciales = getEquipoIniciales(equipo.nombre);
  const deporteLabel = DEPORTE_LABELS[equipo.deporte] ?? equipo.deporte;
  const equipoColor = equipo.color ?? '#F5C344';

  return (
    <div className="p-5 max-w-lg mx-auto">

      {/* Back */}
      <Link
        href="/ranking"
        className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5"
      >
        ← Volver
      </Link>

      {/* Hero */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex items-center gap-4 mb-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-[22px] font-semibold flex-shrink-0 border-2"
          style={{ background: `${equipoColor}15`, color: equipoColor, borderColor: `${equipoColor}60` }}
        >
          {equipoIniciales}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[18px] font-semibold truncate"
            style={{ color: equipoColor }}
          >
            {equipo.nombre}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="neutral">{deporteLabel}</Badge>
            <Badge variant="neutral">{equipo.modalidad}</Badge>
            {equipo.ciudad && <Badge variant="neutral">📍 {equipo.ciudad}</Badge>}
          </div>
        </div>
      </div>

      {/* Level / XP */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase">Nivel y experiencia</span>
          <Badge variant="accent">Nivel {nivel} — {nivelNombre}</Badge>
        </div>
        <XPBar xp={xp} nivel={nivel} showLabel />
      </div>

      {/* Canchas bajo control */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
        <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-3">
          Canchas bajo control
        </div>
        {canchasBajoControl.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant text-center py-3">
            Este equipo aún no domina ninguna cancha.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {canchasBajoControl.map(c => {
              const deportes: string[] = Array.isArray(c.deporte) ? c.deporte : [c.deporte].filter(Boolean);
              const emoji = DEPORTE_EMOJI[deportes[0]] ?? '🏟️';
              return (
                <div
                  key={c.id}
                  className="bg-surface-container border border-outline-variant rounded-lg p-3 flex items-center gap-3"
                >
                  <div className="text-[20px] flex-shrink-0">{emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-on-surface truncate">{c.nombre}</div>
                    {c.direccion && (
                      <div className="text-[11px] text-outline truncate">{c.direccion}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="king">👑 King</Badge>
                    <div className="text-right">
                      <div className="text-[12px] font-semibold text-on-surface">
                        <span className="text-status-libre">{c.victorias}W</span>
                        <span className="text-outline mx-0.5">·</span>
                        <span className="text-error">{c.derrotas}L</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
        <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-3">Estadísticas</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-container rounded-lg p-3 text-center">
            <div className="text-[22px] font-semibold text-on-surface">{totalJugados}</div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">Jugados</div>
          </div>
          <div className="bg-surface-container rounded-lg p-3 text-center">
            <div className="text-[22px] font-semibold text-status-libre">{totalGanados}</div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">Ganados</div>
          </div>
          <div className="bg-surface-container rounded-lg p-3 text-center">
            <div className="text-[22px] font-semibold text-error">{totalPerdidos}</div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">Perdidos</div>
          </div>
        </div>
        {totalJugados > 0 && (
          <div className="mt-3 bg-surface-container rounded-lg p-3 flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant tracking-[0.08em] font-medium uppercase">Win rate</span>
            <span className="text-[15px] font-semibold text-accent">{winRate}%</span>
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-3">
          Roster ({roster.length})
        </div>
        {roster.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant text-center py-3">
            Este equipo aún no tiene jugadores.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {roster.map(miembro => {
              const jugador = miembro.jugador!;
              const nombre = jugador.display_name ?? jugador.username;
              const iniciales = getIniciales(jugador.display_name, jugador.username);
              const isCapitan = miembro.rol === 'admin' || miembro.rol === 'capitan';

              return (
                <Link
                  key={miembro.id}
                  href={`/jugadores/${jugador.id}`}
                  className="bg-surface-container border border-outline-variant rounded-lg p-3 flex items-center gap-3 hover:border-outline transition-colors"
                >
                  {jugador.avatar_url ? (
                    <img
                      src={jugador.avatar_url}
                      alt={nombre}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                      style={{ background: `${equipoColor}15`, color: equipoColor }}
                    >
                      {iniciales}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-on-surface truncate">{nombre}</div>
                    {miembro.posicion && (
                      <div className="text-[11px] text-outline capitalize mt-0.5">{miembro.posicion}</div>
                    )}
                  </div>
                  <Badge variant={isCapitan ? 'accent' : 'neutral'}>
                    {isCapitan ? 'Capitán' : 'Jugador'}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
