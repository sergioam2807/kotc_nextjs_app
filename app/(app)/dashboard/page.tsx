import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { XPBar } from '@/components/ui/XPBar';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { nombreNivel } from '@/lib/levels';
import { tipoEvento } from '@/lib/eventos';
import Link from 'next/link';
import { InvitacionesRecibidas } from '@/components/equipo/InvitacionesRecibidas';

// MVP: Basketball únicamente
const DEPORTES_MAP: Record<string, { emoji: string; label: string }> = {
  basketball: { emoji: '🏀', label: 'Basketball' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function iniciales(nombre?: string | null): string {
  if (!nombre) return '??';
  const p = nombre.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nombre.slice(0, 2).toUpperCase();
}

function unwrapEq(v: unknown): { nombre?: string; color?: string } | null {
  if (!v) return null;
  return (Array.isArray(v) ? v[0] : v) as { nombre?: string; color?: string } | null;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function countdownText(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Ahora';
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `En ${days}d ${hrs % 24}h`;
  if (hrs > 0) return `En ${hrs}h ${mins % 60}m`;
  return `En ${mins}m`;
}

function diasDesde(iso?: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

/** El FSM de disputas auto-cancela a los 5 días de abierta la disputa (ver CLAUDE.md). */
function diasRestantesDisputa(disputaAt?: string | null): number | null {
  if (!disputaAt) return null;
  return Math.max(0, 5 - diasDesde(disputaAt));
}

// ─────────────────────────────────────────────────────────────────────────────

type CanchaDominio = {
  id: string;
  victorias: number;
  derrotas: number;
  es_king: boolean;
  cancha_id: string;
  fecha_rey_desde?: string | null;
  canchas: { nombre: string; deporte: string[] } | null;
};

type DesafioRow = {
  id: string;
  equipo_retador_id: string;
  equipo_retado_id: string;
  estado: string;
  fecha: string;
  equipo_retador: unknown;
  equipo_retado: unknown;
  resultados?: { disputa_at: string | null } | { disputa_at: string | null }[] | null;
};

type NuevoReyRow = {
  id: string;
  equipo_id: string;
  victorias: number;
  fecha_rey_desde?: string | null;
  canchas: unknown;
  equipos: unknown;
};

type CorteRivalRow = {
  id: string;
  victorias: number;
  derrotas: number;
  equipo_id: string;
  cancha_id: string;
  canchas: unknown;
  equipos: unknown;
};

type TemporadaRow = {
  id: string;
  nombre: string;
  fin: string;
  color?: string | null;
  emoji?: string | null;
  slogan?: string | null;
  numero?: number | null;
};

type RivalesRow = {
  id: string;
  nombre: string;
  color: string | null;
  modalidad: string | null;
  rival_modalidad: string | null;
  comuna: string | null;
  region: string | null;
  nivel: number | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // ── Perfil ────────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, nivel, xp, deportes_activos')
    .eq('id', user.id)
    .maybeSingle();

  // ── Equipo ────────────────────────────────────────────────────────────────
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id')
    .eq('jugador_id', user.id)
    .limit(1)
    .maybeSingle();

  const { data: equipoData } = membresia?.equipo_id
    ? await supabase
        .from('equipos')
        .select('id, nombre, color, xp, racha_victorias, racha_derrotas, region, comuna')
        .eq('id', membresia.equipo_id)
        .maybeSingle()
    : { data: null };

  const miEquipo = equipoData ?? null;
  const equipoId = miEquipo?.id ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rachaV: number = (miEquipo as any)?.racha_victorias ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rachaD: number = (miEquipo as any)?.racha_derrotas ?? 0;
  const equipoColor = miEquipo?.color ?? 'var(--color-accent)';
  const equipoIniciales = iniciales(miEquipo?.nombre);

  const now = new Date().toISOString();

  // ── Queries paralelas ─────────────────────────────────────────────────────
  const [
    { data: canchaDominioRaw },
    { data: desafiosRaw },
    { data: proximosRaw },
    { data: nuevosReyesRaw },
    { data: temporadaActiva },
    { data: eventosActivos },
    { count: invitacionesCount },
    { data: cortesRivalesRaw },
    { data: rivalesData },
  ] = await Promise.all([
    // Canchas con victorias del equipo
    equipoId
      ? supabase
          .from('cancha_dominio')
          .select('id, victorias, derrotas, es_king, cancha_id, fecha_rey_desde, canchas(nombre, deporte)')
          .eq('equipo_id', equipoId)
          .gt('victorias', 0)
      : Promise.resolve({ data: null }),

    // Desafíos activos (pendiente / aceptado / resultado_pendiente)
    equipoId
      ? supabase
          .from('desafios')
          .select('id, equipo_retador_id, equipo_retado_id, estado, fecha, equipo_retador:equipo_retador_id(nombre, color), equipo_retado:equipo_retado_id(nombre, color), resultados(disputa_at)')
          .or(`equipo_retador_id.eq.${equipoId},equipo_retado_id.eq.${equipoId}`)
          .in('estado', ['pendiente', 'aceptado', 'resultado_pendiente'])
          .order('fecha', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: null }),

    // Próximos partidos confirmados con fecha futura
    equipoId
      ? supabase
          .from('desafios')
          .select('id, equipo_retador_id, equipo_retado_id, estado, fecha, equipo_retador:equipo_retador_id(nombre, color), equipo_retado:equipo_retado_id(nombre, color)')
          .or(`equipo_retador_id.eq.${equipoId},equipo_retado_id.eq.${equipoId}`)
          .eq('estado', 'aceptado')
          .gte('fecha', now)
          .order('fecha', { ascending: true })
          .limit(3)
      : Promise.resolve({ data: null }),

    // Nuevos Kings globales (los más recientes)
    supabase
      .from('cancha_dominio')
      .select('id, equipo_id, victorias, fecha_rey_desde, canchas(nombre), equipos(nombre, color)')
      .eq('es_king', true)
      .not('fecha_rey_desde', 'is', null)
      .order('fecha_rey_desde', { ascending: false })
      .limit(6),

    // Temporada activa
    supabase
      .from('temporadas')
      .select('id, nombre, fin, color, slogan, emoji, numero')
      .eq('activa', true)
      .maybeSingle(),

    // Eventos vigentes
    supabase
      .from('eventos')
      .select('id, nombre, tipo, fecha_fin, activo, color, emoji, premio, bonus_xp_mult')
      .eq('activo', true)
      .lte('fecha_inicio', now)
      .gte('fecha_fin', now)
      .order('fecha_fin', { ascending: true })
      .limit(5),

    // Invitaciones pendientes (todos los jugadores)
    supabase
      .from('invitaciones')
      .select('id', { count: 'exact', head: true })
      .eq('jugador_id', user.id)
      .is('usado_at', null),

    // Canchas controladas por rivales (para la sección "por conquistar")
    equipoId
      ? supabase
          .from('cancha_dominio')
          .select('id, victorias, derrotas, equipo_id, cancha_id, canchas(nombre, deporte), equipos(nombre, color)')
          .eq('es_king', true)
          .neq('equipo_id', equipoId)
          .order('victorias', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: null }),

    // Rivales buscando match — siempre busca cuando hay equipo.
    // Si el equipo tiene región configurada → filtra por esa región para
    // mostrar rivalidades locales. Si no tiene región → devuelve todos
    // (max 6) para que el usuario descubra quién está disponible.
    equipoId
      ? (async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const myRegion: string | null = (miEquipo as any)?.region ?? null;
          let q = supabase
            .from('equipos')
            .select('id, nombre, color, modalidad, rival_modalidad, comuna, region, nivel')
            .eq('buscando_rival', true)
            .neq('id', equipoId);
          if (myRegion) q = q.eq('region', myRegion);
          return q.order('nivel', { ascending: false }).limit(6);
        })()
      : Promise.resolve({ data: null }),
  ]);

  const canchaDominio: CanchaDominio[] = (canchaDominioRaw as CanchaDominio[] | null) ?? [];
  const desafiosPendientes: DesafioRow[] = (desafiosRaw as DesafioRow[] | null) ?? [];
  const proximosPartidos: DesafioRow[] = (proximosRaw as DesafioRow[] | null) ?? [];
  const nuevosReyes: NuevoReyRow[] = (nuevosReyesRaw as NuevoReyRow[] | null) ?? [];
  const cortesRivales: CorteRivalRow[] = (cortesRivalesRaw as CorteRivalRow[] | null) ?? [];
  const temporada = temporadaActiva as TemporadaRow | null;
  const rivalesCercanos: RivalesRow[] = (rivalesData as RivalesRow[] | null) ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myComuna: string | null = (miEquipo as any)?.comuna ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myRegion: string | null = (miEquipo as any)?.region ?? null;
  const rivalesEnMiComuna = myComuna
    ? rivalesCercanos.filter(r => r.comuna === myComuna)
    : [];

  // Desafíos que requieren confirmar resultado
  const disputados = desafiosPendientes.filter(d => d.estado === 'resultado_pendiente');

  // ── Mis desafíos: módulo único (antes: 3 secciones separadas con datos
  // solapados). Cada estado es mutuamente excluyente por consulta, así que
  // no hay que deduplicar por id — solo priorizar: disputa > próximo > pendiente.
  type MiDesafio = DesafioRow & { tipo: 'disputado' | 'proximo' | 'pendiente' };
  const misDesafios: MiDesafio[] = [
    ...disputados.map(d => ({ ...d, tipo: 'disputado' as const })),
    ...proximosPartidos.map(d => ({ ...d, tipo: 'proximo' as const })),
    ...desafiosPendientes.filter(d => d.estado === 'pendiente').map(d => ({ ...d, tipo: 'pendiente' as const })),
  ].slice(0, 6);

  // ── Stats calculados ──────────────────────────────────────────────────────
  const kingCount = canchaDominio.filter(cd => cd.es_king).length;
  const totalV = canchaDominio.reduce((s, cd) => s + (cd.victorias ?? 0), 0);
  const totalD = canchaDominio.reduce((s, cd) => s + (cd.derrotas ?? 0), 0);
  const rachaLabel = rachaV > 0 ? `W${rachaV}` : rachaD > 0 ? `L${rachaD}` : '—';
  const rachaColor = rachaV > 0
    ? 'var(--color-status-libre)'
    : rachaD > 0
      ? 'var(--color-status-rival)'
      : 'var(--color-outline)';

  // ── Usuario ───────────────────────────────────────────────────────────────
  const displayName = user?.user_metadata?.full_name ?? profile?.username ?? 'Player';
  const nivel = profile?.nivel ?? 1;
  const xp = profile?.xp ?? 0;
  const avatarUrl: string | null = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const nivelNombre = nombreNivel(nivel);
  const userIniciales = iniciales(displayName);


  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto">

      {/* ── Season banner ────────────────────────────────────────────────── */}
      {temporada && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-4"
          style={{
            background: `color-mix(in oklab, ${temporada.color ?? 'var(--color-accent)'} 10%, transparent)`,
            border: `1px solid color-mix(in oklab, ${temporada.color ?? 'var(--color-accent)'} 30%, transparent)`,
          }}
        >
          <span className="text-[18px] flex-shrink-0">{temporada.emoji ?? '🏆'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-on-surface leading-tight">
              {temporada.numero && (
                <span style={{ color: temporada.color ?? undefined }}>
                  T{String(temporada.numero).padStart(2, '0')} ·{' '}
                </span>
              )}
              {temporada.nombre}
            </div>
            {temporada.slogan && (
              <div className="text-[10px] italic truncate text-outline">{temporada.slogan}</div>
            )}
          </div>
          <Link
            href="/ranking"
            className="text-[11px] font-semibold hover:underline flex-shrink-0"
            style={{ color: temporada.color ?? 'var(--color-accent)' }}
          >
            Ranking →
          </Link>
        </div>
      )}

      {/* ── Eventos activos (scroll horizontal) ──────────────────────────── */}
      {eventosActivos && eventosActivos.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] text-outline uppercase tracking-wider font-medium mb-2">🎉 Eventos en curso</div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {eventosActivos.map(ev => {
              const tipo = tipoEvento(ev.tipo);
              const c = ev.color ?? tipo.color;
              const e = ev.emoji ?? tipo.emoji;
              const diasFin = Math.max(0, Math.ceil((new Date(ev.fecha_fin).getTime() - Date.now()) / 86400000));
              return (
                <div
                  key={ev.id}
                  className="flex-shrink-0 rounded-xl px-3 py-2.5 min-w-[155px] max-w-[190px]"
                  style={{ background: `${c}14`, border: `1px solid ${c}35` }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[15px]">{e}</span>
                    {ev.bonus_xp_mult && ev.bonus_xp_mult > 1 && (
                      <span className="text-[9px] font-bold px-1 rounded" style={{ background: `${c}25`, color: c }}>
                        ×{ev.bonus_xp_mult} XP
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-on-surface leading-tight line-clamp-2">{ev.nombre}</div>
                  {ev.premio && <div className="text-[9px] text-on-surface-variant mt-0.5 truncate">🎁 {ev.premio}</div>}
                  <div className="text-[9px] mt-1" style={{ color: c }}>
                    {diasFin === 0 ? 'Último día' : `${diasFin}d restantes`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Invitaciones recibidas (in-app, todos los jugadores) ──────────── */}
      <InvitacionesRecibidas />

      {/* ── Main grid: 2 cols desktop ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ════════════════ LEFT COLUMN (2/3) ════════════════ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Hero card — jugador + equipo */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 relative overflow-hidden">
            {/* Decorative color strip */}
            <div
              className="absolute top-0 right-0 w-48 h-full opacity-[0.07] -skew-x-12 translate-x-10 pointer-events-none"
              style={{ background: equipoColor }}
            />
            <div className="relative flex items-center gap-4">
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: `${equipoColor}55`, background: `${equipoColor}10` }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[22px] font-semibold" style={{ color: equipoColor }}>{userIniciales}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[15px] font-semibold text-on-surface truncate">{displayName}</span>
                  {miEquipo && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
                      style={{ background: `${equipoColor}18`, color: equipoColor, borderColor: `${equipoColor}40` }}
                    >
                      {miEquipo.nombre}
                    </span>
                  )}
                </div>
                <div className="text-[12px] mb-2" style={{ color: equipoColor }}>
                  Lv.{nivel} — {nivelNombre}
                </div>
                <XPBar xp={xp} nivel={nivel} />
              </div>

              <RefreshButton />
            </div>
          </div>

          {/* ── CTA principal: Desafiar / Buscar rival ────────────────────── */}
          {miEquipo && (
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/mapa"
                className="kotc-btn-press flex flex-col items-start gap-2 bg-accent text-on-accent rounded-xl p-4 hover:brightness-95"
              >
                <span className="text-[26px] leading-none">⚔️</span>
                <div>
                  <div className="text-[14px] font-bold leading-tight">Desafiar cancha</div>
                  <div className="text-[11px] opacity-80 mt-0.5">Reclama territorio en el mapa</div>
                </div>
              </Link>
              <Link
                href="/equipos?rivales=1"
                className="flex flex-col items-start gap-2 bg-surface-container-low border border-outline-variant rounded-xl p-4 hover:border-outline transition-colors"
              >
                <span className="text-[26px] leading-none">🔥</span>
                <div>
                  <div className="text-[14px] font-bold text-on-surface leading-tight">Buscar rival</div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">
                    {rivalesCercanos.length > 0
                      ? `${rivalesCercanos.length} equipo${rivalesCercanos.length !== 1 ? 's' : ''} disponible${rivalesCercanos.length !== 1 ? 's' : ''}`
                      : 'Encuentra tu próximo rival'}
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Stats strip — solo con equipo */}
          {miEquipo ? (
            <div className="grid grid-cols-3 gap-3">
              {/* Canchas King — siempre lima: el territorio conquistado ES el color de marca */}
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 sm:p-4 text-center hover:border-outline transition-colors">
                <div
                  className="text-[26px] sm:text-[30px] font-black leading-none mb-1"
                  style={{ color: kingCount > 0 ? 'var(--color-accent)' : 'var(--color-outline)' }}
                >
                  {kingCount}
                </div>
                <div className="text-[9px] text-outline uppercase tracking-widest font-medium">Canchas King</div>
              </div>

              {/* Record */}
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 sm:p-4 text-center hover:border-outline transition-colors">
                <div className="text-[26px] sm:text-[30px] font-black leading-none mb-1 flex items-baseline justify-center gap-0.5">
                  <span className="text-status-libre">{totalV}</span>
                  <span className="text-[16px] text-outline mx-0.5">-</span>
                  <span className="text-status-rival">{totalD}</span>
                </div>
                <div className="text-[9px] text-outline uppercase tracking-widest font-medium">Record V-D</div>
              </div>

              {/* Racha */}
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 sm:p-4 text-center hover:border-outline transition-colors">
                <div className="text-[26px] sm:text-[30px] font-black leading-none mb-1" style={{ color: rachaColor }}>
                  {rachaLabel}
                </div>
                <div className="text-[9px] text-outline uppercase tracking-widest font-medium">Racha</div>
              </div>
            </div>
          ) : (
            /* CTA sin equipo */
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 text-center">
              <div className="text-[32px] mb-2">🏀</div>
              <div className="text-[14px] font-semibold text-on-surface mb-1">Únete o crea un equipo</div>
              <div className="text-[12px] text-on-surface-variant mb-4">Domina canchas, desafía rivales y conviértete en el King.</div>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/equipos"
                  className="bg-surface-container border border-outline-variant text-on-surface-variant text-[12px] font-medium px-4 py-2 rounded-lg hover:border-outline transition-colors"
                >
                  Buscar equipo
                </Link>
                <Link
                  href="/equipo"
                  className="bg-accent text-on-accent text-[12px] font-semibold px-4 py-2 rounded-lg hover:brightness-95 transition-all"
                >
                  Crear equipo
                </Link>
              </div>
            </div>
          )}

          {/* ── Canchas bajo control ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-outline tracking-[0.08em] font-medium uppercase">Canchas bajo control</span>
              <Link href="/mapa" className="text-[11px] text-on-surface-variant hover:text-on-surface hover:underline font-medium">Ver mapa →</Link>
            </div>

            {canchaDominio.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {canchaDominio.map(cd => {
                  const deportesArr: string[] = Array.isArray(cd.canchas?.deporte) ? cd.canchas!.deporte : [];
                  const dep = DEPORTES_MAP[deportesArr[0] ?? ''];
                  const dias = cd.fecha_rey_desde ? diasDesde(cd.fecha_rey_desde) : null;

                  return (
                    <div
                      key={cd.id}
                      className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 flex items-start gap-3 hover:border-outline transition-colors"
                    >
                      {/* Deporte icon — King usa siempre lima, nunca el color del equipo */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-[20px] flex-shrink-0 border"
                        style={cd.es_king
                          ? { background: 'var(--color-accent-dim)', borderColor: 'color-mix(in oklab, var(--color-accent) 35%, transparent)' }
                          : { background: 'var(--color-surface-container)', borderColor: 'var(--color-outline-variant)' }
                        }
                      >
                        {dep?.emoji ?? '🏟️'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="text-[12px] font-semibold text-on-surface leading-tight truncate">
                            {cd.canchas?.nombre ?? '—'}
                          </div>
                          {cd.es_king && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap bg-accent-dim text-accent">
                              👑 King
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-status-libre">{cd.victorias}V</span>
                          <span className="text-[10px] text-outline">·</span>
                          <span className="text-[10px] font-semibold text-status-rival">{cd.derrotas ?? 0}D</span>
                          {cd.es_king && dias !== null && (
                            <>
                              <span className="text-[10px] text-outline">·</span>
                              <span className="text-[10px] text-outline">
                                {dias === 0 ? 'Reinando hoy 👑' : `${dias}d reinando`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : miEquipo ? (
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 text-center">
                <p className="text-[24px] mb-2">🏟️</p>
                <p className="text-[13px] text-on-surface-variant mb-1">Aún no controlas ninguna cancha.</p>
                <Link href="/mapa" className="text-[12px] text-on-surface-variant hover:text-on-surface hover:underline">Ir al mapa a desafiar →</Link>
              </div>
            ) : null}
          </div>

          {/* ── Mis desafíos: módulo único (disputa → próximo → pendiente) ── */}
          {misDesafios.length > 0 && (
            <div>
              <div className="text-[10px] text-outline tracking-[0.08em] font-medium uppercase mb-3">
                Mis desafíos
              </div>
              <div className="flex flex-col gap-2.5">
                {misDesafios.map(d => {
                  const esRetador = d.equipo_retador_id === equipoId;
                  const rivalEq = unwrapEq(esRetador ? d.equipo_retado : d.equipo_retador);
                  const rivalColor = rivalEq?.color ?? 'var(--color-on-surface-variant)';
                  const esRecibido = d.tipo === 'pendiente' && !esRetador;

                  const resultado = Array.isArray(d.resultados) ? d.resultados[0] : d.resultados;
                  const diasRestantes = d.tipo === 'disputado' ? diasRestantesDisputa(resultado?.disputa_at) : null;

                  const cardClass = d.tipo === 'disputado'
                    ? 'border-error/30 bg-error/5 hover:bg-error/10'
                    : esRecibido
                      ? 'border-primary/35 bg-primary/5 hover:bg-primary/10'
                      : 'border-outline-variant bg-surface-container-low hover:border-outline';

                  return (
                    <Link
                      key={d.id}
                      href="/desafios"
                      className={`rounded-xl p-3.5 flex items-center gap-3 border transition-colors ${cardClass}`}
                    >
                      {/* Mi equipo */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: `${equipoColor}18`, color: equipoColor, border: `1px solid ${equipoColor}35` }}
                      >
                        {equipoIniciales}
                      </div>

                      <div className="text-[10px] font-black text-outline flex-shrink-0">VS</div>

                      {/* Rival */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{
                          background: `color-mix(in oklab, ${rivalColor} 12%, transparent)`,
                          color: rivalColor,
                          border: `1px solid color-mix(in oklab, ${rivalColor} 25%, transparent)`,
                        }}
                      >
                        {iniciales(rivalEq?.nombre)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-on-surface truncate">
                          vs {rivalEq?.nombre ?? 'Rival'}
                        </div>
                        {d.tipo === 'disputado' ? (
                          <div className="text-[10px] font-medium text-error">
                            Confirma el resultado{diasRestantes != null ? ` — vence en ${diasRestantes}d` : ''} →
                          </div>
                        ) : d.tipo === 'proximo' ? (
                          <div className="text-[10px] font-medium" style={{ color: equipoColor }}>
                            {countdownText(d.fecha)}
                          </div>
                        ) : (
                          <div className="text-[10px] font-medium text-primary">
                            {esRecibido ? '⚡ Desafío recibido' : 'Esperando respuesta'}
                          </div>
                        )}
                      </div>

                      {d.tipo === 'proximo' && (
                        <div className="text-[10px] text-outline flex-shrink-0 text-right hidden sm:block">
                          {formatFecha(d.fecha)}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Rivales buscando match ────────────────────────────────── */}
          {miEquipo && rivalesCercanos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] text-outline tracking-[0.08em] font-medium uppercase">
                    🔥 Rivales buscando match
                  </span>
                  <div className="text-[10px] text-outline mt-0.5">
                    {myRegion
                      ? rivalesEnMiComuna.length > 0
                        ? `${rivalesEnMiComuna.length} en tu comuna · ${rivalesCercanos.length - rivalesEnMiComuna.length} más en ${myRegion}`
                        : `${rivalesCercanos.length} equipo${rivalesCercanos.length !== 1 ? 's' : ''} en ${myRegion}`
                      : `${rivalesCercanos.length} equipo${rivalesCercanos.length !== 1 ? 's' : ''} disponible${rivalesCercanos.length !== 1 ? 's' : ''}`
                    }
                  </div>
                </div>
                <Link href="/equipos?rivales=1" className="text-[11px] text-on-surface-variant hover:text-on-surface hover:underline font-medium">
                  Ver todos →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rivalesCercanos.slice(0, 4).map(rival => {
                  const color = rival.color ?? 'var(--color-accent)';
                  const words = rival.nombre.trim().split(/\s+/);
                  const ini = words.length >= 2
                    ? (words[0][0] + words[1][0]).toUpperCase()
                    : rival.nombre.slice(0, 2).toUpperCase();
                  const esCercano = myComuna && rival.comuna === myComuna;
                  const formato = rival.rival_modalidad ?? rival.modalidad;

                  return (
                    <Link
                      key={rival.id}
                      href={`/equipos/${rival.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant hover:border-outline transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 border"
                        style={{ background: `${color}15`, color, borderColor: `${color}40` }}
                      >
                        {ini}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold truncate" style={{ color }}>
                          {rival.nombre}
                        </div>
                        <div className="text-[10px] text-outline flex items-center gap-1 flex-wrap">
                          {esCercano && <span className="text-status-libre">●</span>}
                          <span>{esCercano ? rival.comuna : (rival.region ?? rival.comuna ?? 'Sin ubicación')}</span>
                          {formato && <><span>·</span><span>{formato}</span></>}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-primary flex-shrink-0">Desafiar →</span>
                    </Link>
                  );
                })}
              </div>

              {/* CTA para configurar región si no tiene */}
              {!myRegion && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-accent/8 border border-accent/20">
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    💡 <Link href="/equipo" className="text-accent hover:underline">Configura la región de tu equipo</Link>{' '}
                    para ver rivales cercanos a ti primero.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ════════════════ RIGHT COLUMN (1/3) ════════════════ */}
        <div className="space-y-5">

          {/* Nuevos Reyes (feed global) */}
          {nuevosReyes.length > 0 && (
            <div>
              <div className="text-[10px] text-outline uppercase tracking-wider font-medium mb-3">👑 Nuevos reyes</div>
              <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
                {nuevosReyes.map((r, idx) => {
                  const eq = unwrapEq(r.equipos);
                  const cancha = (Array.isArray(r.canchas) ? r.canchas[0] : r.canchas) as { nombre?: string } | null;
                  if (!eq) return null;
                  const c = eq.color ?? 'var(--color-accent)';
                  const dias = r.fecha_rey_desde ? diasDesde(r.fecha_rey_desde) : null;
                  const isMine = r.equipo_id === equipoId;
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 ${idx < nuevosReyes.length - 1 ? 'border-b border-outline-variant' : ''}`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: `${c}18`, color: c, border: `1px solid ${c}35` }}
                      >
                        {iniciales(eq.nombre)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-on-surface truncate flex items-center gap-1">
                          {eq.nombre}
                          {isMine && <span className="text-[9px] text-accent">• Tú</span>}
                        </div>
                        <div className="text-[10px] text-outline truncate">{cancha?.nombre ?? 'Cancha'}</div>
                      </div>
                      {dias !== null && (
                        <div className="text-[9px] text-outline flex-shrink-0">
                          {dias === 0 ? 'Hoy' : `${dias}d`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Acciones rápidas */}
       <div
            className="rounded-xl p-3.5 border"
            style={temporada ? {
              background: `${temporada.color ?? 'var(--color-accent)'}0e`,
              borderColor: `${temporada.color ?? 'var(--color-accent)'}30`,
            } : {
              background: 'var(--color-surface-container-low)',
              borderColor: 'var(--color-outline-variant)',
            }}
          >
            <div className="text-[10px] text-outline uppercase tracking-wider font-medium mb-3">Acciones rápidas</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/mapa',      emoji: '🗺️',  label: 'Mapa'      },
                { href: '/desafios',  emoji: '⚔️',  label: 'Desafíos'  },
                { href: '/ranking',   emoji: '🏆',  label: 'Ranking'   },
                { href: '/jugadores', emoji: '👤',  label: 'Jugadores' },
              ].map(({ href, emoji, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 bg-surface-container-low border border-outline-variant rounded-xl hover:border-outline hover:bg-surface-container transition-all text-center"
                >
                  <span className="text-[20px]">{emoji}</span>
                  <span className="text-[10px] font-medium text-on-surface-variant">{label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
