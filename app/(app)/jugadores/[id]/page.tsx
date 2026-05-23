import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { XPBar } from '@/components/ui/XPBar';
import Link from 'next/link';
import { nombreNivel } from '@/lib/levels';
import { DEPORTES_MAP } from '@/lib/player-constants';
import { InvitarJugadorButton } from '@/components/jugadores/InvitarJugadorButton';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPORTE_LABELS: Record<string, string> = {
  basketball: 'Basketball',
  futbol: 'Fútbol',
  voleibol: 'Voleibol',
  tenis: 'Tenis',
  padel: 'Pádel',
};

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀',
  futbol: '⚽',
  voleibol: '🏐',
  tenis: '🎾',
  padel: '🏓',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "may 2026", "ene 2025", etc. */
function fmtMes(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
}

/** Duración legible entre dos fechas o desde una fecha hasta hoy */
function duracion(inicio: string, fin: string | null): string {
  const from = new Date(inicio);
  const to = fin ? new Date(fin) : new Date();
  const meses = Math.max(
    0,
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()),
  );
  if (meses < 1) return 'Menos de 1 mes';
  if (meses < 12) return `${meses} mes${meses !== 1 ? 'es' : ''}`;
  const años = Math.floor(meses / 12);
  const resto = meses % 12;
  const base = `${años} año${años !== 1 ? 's' : ''}`;
  return resto > 0 ? `${base} y ${resto} mes${resto !== 1 ? 'es' : ''}` : base;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function JugadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Logged-in user (for edit/invitar logic)
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === id;

  // Check if the viewer is admin/captain of a team (for invite button)
  const { data: viewerMembresia } = user && !isOwnProfile
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

  // 1. Profile (all fields)
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, ciudad, nivel, xp, deportes_activos, bio, posicion_principal, posiciones_adicionales, especialidades, altura_cm, peso_kg, mano_habil, anos_experiencia, disponible_reclutamiento',
    )
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

  // 2. Team membership (of the profile being viewed)
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

  // 5. Historial de equipos (incluye temporada)
  const { data: historialRaw } = await supabase
    .from('historial_equipos')
    .select('id, equipo_id, equipo_nombre, equipo_color, deporte, ciudad, rol, posicion, fecha_ingreso, fecha_salida, temporada_id, temporada_nombre')
    .eq('jugador_id', id)
    .order('fecha_ingreso', { ascending: false })
    .limit(50);

  const historial = historialRaw ?? [];

  // Agrupar por temporada: primero las con temporada (más reciente primero), luego "Sin temporada"
  type HistorialEntry = (typeof historial)[number];
  type Grupo = { key: string; label: string; temporada_id: string | null; entradas: HistorialEntry[] };

  const grupoMap = new Map<string, Grupo>();
  for (const entrada of historial) {
    const key = entrada.temporada_id ?? '__libre__';
    if (!grupoMap.has(key)) {
      grupoMap.set(key, {
        key,
        label: entrada.temporada_nombre ?? 'Sin temporada asignada',
        temporada_id: entrada.temporada_id ?? null,
        entradas: [],
      });
    }
    grupoMap.get(key)!.entradas.push(entrada);
  }

  // Ordenar grupos: con temporada primero (por fecha de la entrada más reciente), libre al final
  const grupos: Grupo[] = [...grupoMap.values()].sort((a, b) => {
    if (a.key === '__libre__') return 1;
    if (b.key === '__libre__') return -1;
    // Más reciente primero (las entradas ya vienen ordenadas por fecha_ingreso DESC)
    const fa = a.entradas[0]?.fecha_ingreso ?? '';
    const fb = b.entradas[0]?.fecha_ingreso ?? '';
    return fb.localeCompare(fa);
  });

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const displayName = profile.display_name ?? profile.username;
  const nivel = profile.nivel ?? 1;
  const xp = profile.xp ?? 0;
  const nivelNombre = nombreNivel(nivel);
  const deportesActivos: string[] = profile.deportes_activos ?? [];
  const posicionesAdicionales: string[] = profile.posiciones_adicionales ?? [];
  const especialidades: string[] = profile.especialidades ?? [];

  const palabras = displayName.trim().split(/\s+/);
  const iniciales =
    palabras.length >= 2
      ? (palabras[0][0] + palabras[1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();

  return (
    <div className="p-5 max-w-lg mx-auto">

      {/* Back */}
      <Link
        href="/jugadores"
        className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5"
      >
        ← Jugadores
      </Link>

      {/* Hero */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-16 h-16 rounded-xl object-cover border-2 border-accent"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl border-2 border-accent bg-accent/15 flex items-center justify-center">
              <span className="text-[22px] font-semibold text-accent">{iniciales}</span>
            </div>
          )}
        </div>

        {/* Name + ciudad + badges */}
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-semibold text-on-surface truncate">{displayName}</div>
          {profile.ciudad && (
            <div className="text-[13px] text-on-surface-variant mt-0.5">📍 {profile.ciudad}</div>
          )}
          <div className="flex gap-1.5 flex-wrap mt-2">
            {profile.disponible_reclutamiento && (
              <Badge variant="libre">Disponible</Badge>
            )}
            {profile.posicion_principal && (
              <Badge variant="accent">{profile.posicion_principal}</Badge>
            )}
          </div>
        </div>

        {/* Edit button (own profile) */}
        {isOwnProfile && (
          <Link
            href="/perfil"
            className="flex-shrink-0 text-[12px] text-accent hover:underline"
          >
            Editar
          </Link>
        )}
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
              {equipo.nombre
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold truncate" style={{ color: equipo.color }}>
                {equipo.nombre}
              </div>
              <div className="text-[12px] text-on-surface-variant mt-0.5">
                {DEPORTE_LABELS[equipo.deporte] ?? equipo.deporte} · {equipo.modalidad} · {equipo.ciudad}
              </div>
            </div>
            <Link href={`/equipos/${equipo.id}`} className="text-[12px] text-accent hover:underline flex-shrink-0">
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

      {/* Bio */}
      {profile.bio && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-2">Sobre mí</div>
          <p className="text-[13px] text-on-surface leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Posición */}
      {(profile.posicion_principal || posicionesAdicionales.length > 0) && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-2.5">Posición</div>
          <div className="flex gap-2 flex-wrap">
            {profile.posicion_principal && (
              <Badge variant="accent">{profile.posicion_principal} ★</Badge>
            )}
            {posicionesAdicionales.map((pos: string) => (
              <Badge key={pos} variant="neutral">{pos}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Especialidades */}
      {especialidades.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-2.5">Especialidades</div>
          <div className="flex gap-1.5 flex-wrap">
            {especialidades.map((esp: string) => (
              <Badge key={esp} variant="primary">{esp}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Datos físicos */}
      {(profile.altura_cm || profile.peso_kg || profile.anos_experiencia || profile.mano_habil) && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-3">Datos físicos</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {profile.altura_cm && (
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <div className="text-[18px] font-semibold text-on-surface">{profile.altura_cm}</div>
                <div className="text-[10px] text-on-surface-variant mt-0.5">Altura (cm)</div>
              </div>
            )}
            {profile.peso_kg && (
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <div className="text-[18px] font-semibold text-on-surface">{profile.peso_kg}</div>
                <div className="text-[10px] text-on-surface-variant mt-0.5">Peso (kg)</div>
              </div>
            )}
            {profile.anos_experiencia !== undefined &&
              profile.anos_experiencia !== null &&
              profile.anos_experiencia > 0 && (
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <div className="text-[18px] font-semibold text-on-surface">{profile.anos_experiencia}</div>
                <div className="text-[10px] text-on-surface-variant mt-0.5">Años exp.</div>
              </div>
            )}
            {profile.mano_habil && (
              <div className="bg-surface-container rounded-lg p-3 text-center">
                <div className="text-[14px] font-semibold text-on-surface capitalize">{profile.mano_habil}</div>
                <div className="text-[10px] text-on-surface-variant mt-0.5">Mano hábil</div>
              </div>
            )}
          </div>
        </div>
      )}

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
      </div>

      {/* Invitar al equipo — visible para admins/capitanes si el jugador no tiene equipo */}
      {viewerEquipo && !membresia && (
        <div className="mb-4">
          <InvitarJugadorButton
            equipoId={viewerEquipo.id}
            equipoNombre={viewerEquipo.nombre}
            jugadorId={id}
            jugadorNombre={displayName}
          />
        </div>
      )}

      {/* Historial de equipos */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <span className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase">
            Historial de equipos
          </span>
          <span className="text-[10px] text-on-surface-variant">
            {historial.length} registro{historial.length !== 1 ? 's' : ''}
          </span>
        </div>

        {historial.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant text-center py-6 px-4 pb-4">
            Sin historial de equipos aún.
          </p>
        ) : (
          <div>
            {grupos.map((grupo, gi) => (
              <div key={grupo.key}>
                {/* Encabezado de temporada */}
                <div className={`px-4 py-2 flex items-center gap-2 ${gi > 0 ? 'border-t border-outline-variant' : ''}`}
                  style={{ background: grupo.temporada_id ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)' : undefined }}
                >
                  <span className="text-[10px]">{grupo.temporada_id ? '⏱' : '📅'}</span>
                  <span className={`text-[11px] font-semibold tracking-wide uppercase ${grupo.temporada_id ? 'text-accent' : 'text-on-surface-variant'}`}>
                    {grupo.label}
                  </span>
                </div>

                {/* Entradas de la temporada */}
                <div className="px-4 pb-3 flex flex-col gap-0">
                  {grupo.entradas.map((entrada, idx) => {
                    const color = entrada.equipo_color ?? '#888888';
                    const esActual = entrada.fecha_salida === null;
                    const palabrasEquipo = entrada.equipo_nombre.trim().split(/\s+/);
                    const inicialesEquipo =
                      palabrasEquipo.length >= 2
                        ? (palabrasEquipo[0][0] + palabrasEquipo[1][0]).toUpperCase()
                        : entrada.equipo_nombre.slice(0, 2).toUpperCase();
                    const emoji = DEPORTE_EMOJI[entrada.deporte ?? ''] ?? '🏟️';
                    const desde = fmtMes(entrada.fecha_ingreso);
                    const hasta = entrada.fecha_salida ? fmtMes(entrada.fecha_salida) : 'Actual';
                    const dur = duracion(entrada.fecha_ingreso, entrada.fecha_salida);
                    const isLast = idx === grupo.entradas.length - 1;

                    return (
                      <div
                        key={entrada.id}
                        className={`flex gap-3 py-3 ${!isLast ? 'border-b border-outline-variant' : ''}`}
                      >
                        {/* Badge equipo */}
                        <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold border"
                            style={{ background: `${color}18`, color, borderColor: `${color}45` }}
                          >
                            {inicialesEquipo}
                          </div>
                          {/* Línea vertical conectora si no es el último */}
                          {!isLast && (
                            <div className="w-px flex-1 bg-outline-variant mt-1.5 min-h-[12px]" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {entrada.equipo_id ? (
                                <Link
                                  href={`/equipos/${entrada.equipo_id}`}
                                  className="text-[13px] font-semibold hover:underline truncate block"
                                  style={{ color }}
                                >
                                  {entrada.equipo_nombre}
                                </Link>
                              ) : (
                                <span className="text-[13px] font-semibold text-on-surface-variant truncate block">
                                  {entrada.equipo_nombre}
                                </span>
                              )}
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-on-surface-variant">
                                  {emoji} {DEPORTE_LABELS[entrada.deporte ?? ''] ?? (entrada.deporte ?? '')}
                                </span>
                                {entrada.ciudad && (
                                  <span className="text-[11px] text-outline">· {entrada.ciudad}</span>
                                )}
                              </div>
                            </div>
                            {esActual && <Badge variant="libre">Actual</Badge>}
                          </div>

                          {/* Rol + posición */}
                          {(entrada.rol || entrada.posicion) && (
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {entrada.rol && <Badge variant="neutral">{entrada.rol}</Badge>}
                              {entrada.posicion && <Badge variant="neutral">{entrada.posicion}</Badge>}
                            </div>
                          )}

                          {/* Rango de fechas + duración */}
                          <div className="flex items-center gap-1 mt-1.5 text-[11px] flex-wrap">
                            <span className="text-on-surface-variant">{desde}</span>
                            <span className="text-outline">→</span>
                            <span className={esActual ? 'text-status-libre font-medium' : 'text-on-surface-variant'}>
                              {hasta}
                            </span>
                            <span className="text-outline">· {dur}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
