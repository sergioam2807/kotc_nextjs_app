import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { XPBar } from '@/components/ui/XPBar';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPORTES_MAP: Record<string, { emoji: string; label: string }> = {
  basketball: { emoji: '🏀', label: 'Basketball' },
  futbol:     { emoji: '⚽', label: 'Fútbol' },
  voleibol:   { emoji: '🏐', label: 'Vóleibol' },
  tenis:      { emoji: '🎾', label: 'Tenis' },
  padel:      { emoji: '🏓', label: 'Pádel' },
};

import { nombreNivel } from '@/lib/levels';

const DEPORTE_LABELS: Record<string, string> = {
  basketball: 'Basketball',
  futbol: 'Fútbol',
  voleibol: 'Voleibol',
  tenis: 'Tenis',
  padel: 'Pádel',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function JugadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, ciudad, nivel, xp, deportes_activos')
    .eq('id', id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-[15px] text-on-surface-variant">Jugador no encontrado.</p>
        <Link href="/equipo" className="text-[13px] text-accent hover:underline mt-3 inline-block">
          ← Volver
        </Link>
      </div>
    );
  }

  // 2. Team membership
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id, rol, posicion')
    .eq('jugador_id', id)
    .limit(1)
    .maybeSingle();

  // 3. Equipo data
  const { data: equipo } = membresia?.equipo_id
    ? await supabase
        .from('equipos')
        .select('id, nombre, color, deporte, modalidad, ciudad')
        .eq('id', membresia.equipo_id)
        .maybeSingle()
    : { data: null };

  // 4. Desafíos stats
  let totalJugados = 0;
  let totalGanados = 0;
  let totalPerdidos = 0;

  if (equipo?.id) {
    const { data: desafiosJugados } = await supabase
      .from('desafios')
      .select('id, equipo_retador_id, equipo_retado_id')
      .or(`equipo_retador_id.eq.${equipo.id},equipo_retado_id.eq.${equipo.id}`)
      .in('estado', ['completado', 'jugado']);

    totalJugados = desafiosJugados?.length ?? 0;

    if (totalJugados > 0) {
      const desafioIds = (desafiosJugados ?? []).map(d => d.id);
      const { data: resultados } = await supabase
        .from('resultados')
        .select('ganador_id')
        .in('desafio_id', desafioIds);

      totalGanados = (resultados ?? []).filter(r => r.ganador_id === equipo.id).length;
      totalPerdidos = totalJugados - totalGanados;
    }
  }

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const displayName = profile.display_name ?? profile.username;
  const nivel = profile.nivel ?? 1;
  const xp = profile.xp ?? 0;
  const nivelNombre = nombreNivel(nivel);
  const deportesActivos: string[] = profile.deportes_activos ?? [];

  const palabras = displayName.trim().split(/\s+/);
  const iniciales = palabras.length >= 2
    ? (palabras[0][0] + palabras[1][0]).toUpperCase()
    : displayName.slice(0, 2).toUpperCase();

  return (
    <div className="p-5 max-w-lg mx-auto">

      {/* Back */}
      <Link
        href="/equipo"
        className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5"
      >
        ← Volver
      </Link>

      {/* Hero */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex items-center gap-4 mb-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-16 h-16 rounded-xl object-cover border-2 border-accent"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl border-2 border-accent bg-accent/15 flex items-center justify-center">
              <span className="text-[22px] font-semibold text-accent">{iniciales}</span>
            </div>
          )}
        </div>

        {/* Name + ciudad */}
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-semibold text-on-surface truncate">{displayName}</div>
          {profile.ciudad && (
            <div className="text-[13px] text-on-surface-variant mt-0.5">📍 {profile.ciudad}</div>
          )}
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

      {/* Team card */}
      {equipo && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-2.5">Equipo</div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
              style={{ background: `${equipo.color}20`, color: equipo.color }}
            >
              {equipo.nombre.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[15px] font-semibold truncate"
                style={{ color: equipo.color }}
              >
                {equipo.nombre}
              </div>
              <div className="text-[12px] text-on-surface-variant mt-0.5">
                {DEPORTE_LABELS[equipo.deporte] ?? equipo.deporte} · {equipo.modalidad} · {equipo.ciudad}
              </div>
            </div>
            <Link
              href="/equipo"
              className="text-[12px] text-accent hover:underline flex-shrink-0"
            >
              Ver equipo →
            </Link>
          </div>
        </div>
      )}

      {/* Deportes activos */}
      {deportesActivos.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-2.5">Deportes activos</div>
          <div className="flex gap-2 flex-wrap">
            {deportesActivos.map(dep => {
              const d = DEPORTES_MAP[dep];
              if (!d) return null;
              return (
                <div
                  key={dep}
                  className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                >
                  <span className="text-[15px]">{d.emoji}</span>
                  <span className="text-[13px] text-on-surface">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
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
      </div>

    </div>
  );
}
