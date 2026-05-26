import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { XPBar } from '@/components/ui/XPBar';
import { Badge } from '@/components/ui/Badge';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { nombreNivel } from '@/lib/levels';
import Link from 'next/link';

// MVP: Basketball únicamente
const DEPORTES_MAP: Record<string, { emoji: string; label: string }> = {
  basketball: { emoji: '🏀', label: 'Basketball' },
};

const ESTADO_BADGE: Record<string, { label: string; variant: 'accent' | 'neutral' | 'error' | 'green' }> = {
  pendiente:           { label: 'Pendiente',           variant: 'accent' },
  aceptado:            { label: 'Confirmado',          variant: 'green'  },
  resultado_pendiente: { label: 'Resultado pendiente', variant: 'error'  },
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

type UltimoResultadoRow = {
  id: string;
  equipo_retador_id: string;
  equipo_retado_id: string;
  resultados: {
    ganador_id: string | null;
    puntos_retador: number | null;
    puntos_retado: number | null;
    confirmado_por_perdedor: boolean;
  }[] | {
    ganador_id: string | null;
    puntos_retador: number | null;
    puntos_retado: number | null;
    confirmado_por_perdedor: boolean;
  } | null;
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
        .select('id, nombre, color, xp, racha_victorias, racha_derrotas')
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
    { count: equiposDelanteCount },
    { data: ultimosResultadosRaw },
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
          .select('id, equipo_retador_id, equipo_retado_id, estado, fecha, equipo_retador:equipo_retador_id(nombre, color), equipo_retado:equipo_retado_id(nombre, color)')
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

    // Invitaciones pendientes (solo sin equipo)
    !equipoId
      ? supabase
          .from('invitaciones')
          .select('id', { count: 'exact', head: true })
          .eq('jugador_id', user.id)
          .is('usado_at', null)
      : Promise.resolve({ count: null }),

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

    // Ranking global: cuántos equipos tienen más XP que el mío
    miEquipo
      ? supabase
          .from('equipos')
          .select('id', { count: 'exact', head: true })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .gt('xp', (miEquipo as any).xp ?? 0)
      : Promise.resolve({ count: null }),

    // Últimos desafíos completados con marcadores para PPG
    equipoId
      ? supabase
          .from('desafios')
          .select('id, equipo_retador_id, equipo_retado_id, resultados(ganador_id, puntos_retador, puntos_retado, confirmado_por_perdedor)')
          .or(`equipo_retador_id.eq.${equipoId},equipo_retado_id.eq.${equipoId}`)
          .eq('estado', 'completado')
          .order('fecha', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: null }),
  ]);

  const canchaDominio: CanchaDominio[] = (canchaDominioRaw as CanchaDominio[] | null) ?? [];
  const desafiosPendientes: DesafioRow[] = (desafiosRaw as DesafioRow[] | null) ?? [];
  const proximosPartidos: DesafioRow[] = (proximosRaw as DesafioRow[] | null) ?? [];
  const nuevosReyes: NuevoReyRow[] = (nuevosReyesRaw as NuevoReyRow[] | null) ?? [];
  const cortesRivales: CorteRivalRow[] = (cortesRivalesRaw as CorteRivalRow[] | null) ?? [];
  const ultimosResultados: UltimoResultadoRow[] = (ultimosResultadosRaw as UltimoResultadoRow[] | null) ?? [];
  const temporada = temporadaActiva as TemporadaRow | null;

  // Desafíos que requieren confirmar resultado
  const disputados = desafiosPendientes.filter(d => d.estado === 'resultado_pendiente');

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

  // ── Analíticas ────────────────────────────────────────────────────────────
  const partidos = totalV + totalD;
  const winRate = partidos > 0 ? (totalV / partidos) * 100 : 0;
  const rankingGlobal = equiposDelanteCount != null ? equiposDelanteCount + 1 : null;

  // PPG y PAPG desde resultados confirmados con marcadores
  let ppg: number | null = null;
  let papg: number | null = null;
  let formaReciente: ('W' | 'L')[] = [];

  if (ultimosResultados.length > 0) {
    let sumaM = 0; let sumaR = 0; let conMarcador = 0;
    for (const d of ultimosResultados) {
      const res = Array.isArray(d.resultados) ? d.resultados[0] : d.resultados;
      if (!res) continue;
      const esRetador = d.equipo_retador_id === equipoId;
      const gane = res.ganador_id === equipoId;
      formaReciente.push(gane ? 'W' : 'L');
      if (res.puntos_retador != null && res.puntos_retado != null) {
        sumaM += esRetador ? res.puntos_retador : res.puntos_retado;
        sumaR += esRetador ? res.puntos_retado : res.puntos_retador;
        conMarcador++;
      }
    }
    if (conMarcador > 0) {
      ppg = sumaM / conMarcador;
      papg = sumaR / conMarcador;
    }
    formaReciente = formaReciente.slice(0, 5);
  }

  // Eficiencia (letra) basada en win rate
  function eficienciaLetra(pct: number): string {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'A−';
    if (pct >= 60) return 'B+';
    if (pct >= 50) return 'B';
    if (pct >= 40) return 'B−';
    if (pct >= 30) return 'C+';
    return 'C';
  }
  const eficiencia = partidos > 0 ? eficienciaLetra(winRate) : '—';

  // Valores normalizados para barras (0–100)
  const ataqueBar = ppg != null
    ? Math.min(100, (ppg / 25) * 100)          // ~25 pts promedio = 100%
    : Math.min(100, winRate * 1.1);
  const defensaBar = papg != null && ppg != null
    ? Math.max(0, 100 - (papg / Math.max(ppg, 1)) * 80)
    : Math.min(100, winRate * 0.9);
  const territorioBar = Math.min(100, kingCount * 25); // 4 canchas King = 100%
  const consistenciaBar = winRate;

  // ── Usuario ───────────────────────────────────────────────────────────────
  const displayName = user?.user_metadata?.full_name ?? profile?.username ?? 'Player';
  const nivel = profile?.nivel ?? 1;
  const xp = profile?.xp ?? 0;
  const avatarUrl: string | null = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const nivelNombre = nombreNivel(nivel);
  const userIniciales = iniciales(displayName);

  // ── Constantes para eventos ───────────────────────────────────────────────
  const TIPO_COLORS: Record<string, string> = {
    torneo_express: '#eab308', bonus_xp: '#a855f7', cancha_especial: '#3b82f6',
    nightball: '#6366f1', king_challenge: '#ef4444', reto_semanal: '#22c55e', otro: '#f97316',
  };
  const TIPO_EMOJI: Record<string, string> = {
    torneo_express: '🏆', bonus_xp: '⚡', cancha_especial: '📍',
    nightball: '🌙', king_challenge: '👑', reto_semanal: '🎯', otro: '🎉',
  };

  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto">

      {/* ── Season banner ────────────────────────────────────────────────── */}
      {temporada && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-4"
          style={{
            background: temporada.color ? `${temporada.color}12` : 'rgba(var(--color-accent-rgb),0.06)',
            border: `1px solid ${temporada.color ? `${temporada.color}35` : 'rgba(var(--color-accent-rgb),0.2)'}`,
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
              const c = ev.color ?? TIPO_COLORS[ev.tipo] ?? '#f97316';
              const e = ev.emoji ?? TIPO_EMOJI[ev.tipo] ?? '🎉';
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

      {/* ── Banner invitaciones (sin equipo) ─────────────────────────────── */}
      {!miEquipo && invitacionesCount && invitacionesCount > 0 ? (
        <Link
          href="/equipo"
          className="flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 mb-4 hover:bg-accent/15 transition-colors"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-error text-white text-[11px] font-bold flex-shrink-0">
            {invitacionesCount}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-on-surface">
              {invitacionesCount === 1 ? 'Tienes una invitación' : `Tienes ${invitacionesCount} invitaciones`} de equipo
            </div>
            <div className="text-[11px] text-on-surface-variant">Toca para ver y aceptar →</div>
          </div>
        </Link>
      ) : null}

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

          {/* Stats strip — solo con equipo */}
          {miEquipo ? (
            <div className="grid grid-cols-3 gap-3">
              {/* Canchas King */}
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 sm:p-4 text-center hover:border-outline transition-colors">
                <div
                  className="text-[26px] sm:text-[30px] font-black leading-none mb-1"
                  style={{ color: kingCount > 0 ? equipoColor : 'var(--color-outline)' }}
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
              <Link href="/mapa" className="text-[11px] text-accent hover:underline font-medium">Ver mapa →</Link>
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
                      {/* Deporte icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-[20px] flex-shrink-0 border"
                        style={cd.es_king
                          ? { background: `${equipoColor}15`, borderColor: `${equipoColor}35` }
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
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap"
                              style={{ background: `${equipoColor}18`, color: equipoColor }}
                            >
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
                <Link href="/mapa" className="text-[12px] text-accent hover:underline">Ir al mapa a desafiar →</Link>
              </div>
            ) : null}
          </div>

          {/* ── Próximos partidos confirmados ─────────────────────────────── */}
          {proximosPartidos.length > 0 && (
            <div>
              <div className="text-[10px] text-outline tracking-[0.08em] font-medium uppercase mb-3">
                Próximos partidos
              </div>
              <div className="flex flex-col gap-2.5">
                {proximosPartidos.map(p => {
                  const esRetador = p.equipo_retador_id === equipoId;
                  const rivalEq = unwrapEq(esRetador ? p.equipo_retado : p.equipo_retador);
                  const rivalColor = rivalEq?.color ?? '#888888';
                  return (
                    <Link
                      key={p.id}
                      href="/desafios"
                      className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 flex items-center gap-3 hover:border-outline transition-colors"
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
                        style={{ background: `${rivalColor}18`, color: rivalColor, border: `1px solid ${rivalColor}35` }}
                      >
                        {iniciales(rivalEq?.nombre)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-on-surface truncate">
                          vs {rivalEq?.nombre ?? 'Rival'}
                        </div>
                        <div className="text-[10px] font-medium" style={{ color: equipoColor }}>
                          {countdownText(p.fecha)}
                        </div>
                      </div>

                      <div className="text-[10px] text-outline flex-shrink-0 text-right hidden sm:block">
                        {formatFecha(p.fecha)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {/* ── Resultado pendiente — acción requerida ────────────────────── */}
          {disputados.length > 0 && (
            <div>
              <div className="text-[10px] text-outline tracking-[0.08em] font-medium uppercase mb-3">
                ⚠️ Acción requerida
              </div>
              <div className="flex flex-col gap-2">
                {disputados.map(d => {
                  const esRetador = d.equipo_retador_id === equipoId;
                  const rivalEq = unwrapEq(esRetador ? d.equipo_retado : d.equipo_retador);
                  const rivalColor = rivalEq?.color ?? '#888888';
                  return (
                    <Link
                      key={d.id}
                      href="/desafios"
                      className="flex items-center gap-3 rounded-xl p-3.5 hover:opacity-90 transition-opacity"
                      style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderLeft: '3px solid rgba(239,68,68,0.7)' }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: `${equipoColor}18`, color: equipoColor, border: `1px solid ${equipoColor}35` }}
                      >
                        {equipoIniciales}
                      </div>
                      <span className="text-[9px] font-black text-outline">VS</span>
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: `${rivalColor}18`, color: rivalColor, border: `1px solid ${rivalColor}35` }}
                      >
                        {iniciales(rivalEq?.nombre)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-on-surface truncate">
                          vs {rivalEq?.nombre ?? 'Rival'}
                        </div>
                        <div className="text-[10px] font-medium text-error">
                          Confirma el resultado del partido →
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Analíticas del equipo ────────────────────────────────────── */}
          {miEquipo && (
            <div>
              <div className="text-[10px] text-outline tracking-[0.08em] font-medium uppercase mb-3">
                📊 Analíticas del equipo
              </div>

              {partidos > 0 ? (
                <div className="flex flex-col gap-3">
                  {/* 4 stat cards — 2×2 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Win Rate */}
                    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-center hover:border-outline transition-colors">
                      <div
                        className="text-[26px] font-black leading-none mb-1"
                        style={{ color: winRate >= 50 ? 'var(--color-status-libre)' : 'var(--color-status-rival)' }}
                      >
                        {winRate.toFixed(0)}%
                      </div>
                      <div className="text-[9px] text-outline uppercase tracking-widest font-medium">Win Rate</div>
                      <div className="text-[8px] text-on-surface-variant mt-0.5">{partidos} partidos</div>
                    </div>

                    {/* Ranking Global */}
                    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-center hover:border-outline transition-colors">
                      <div className="text-[26px] font-black leading-none mb-1 text-on-surface">
                        {rankingGlobal != null ? `#${rankingGlobal}` : '—'}
                      </div>
                      <div className="text-[9px] text-outline uppercase tracking-widest font-medium">Ranking</div>
                      <div className="text-[8px] text-on-surface-variant mt-0.5">Global XP</div>
                    </div>

                    {/* PPG */}
                    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-center hover:border-outline transition-colors">
                      <div className="text-[26px] font-black leading-none mb-1 text-on-surface">
                        {ppg != null ? ppg.toFixed(1) : '—'}
                      </div>
                      <div className="text-[9px] text-outline uppercase tracking-widest font-medium">PPG</div>
                      <div className="text-[8px] text-on-surface-variant mt-0.5">
                        {papg != null ? `${papg.toFixed(1)} en contra` : 'Pts por partido'}
                      </div>
                    </div>

                    {/* Eficiencia */}
                    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-center hover:border-outline transition-colors">
                      <div
                        className="text-[26px] font-black leading-none mb-1"
                        style={{ color: equipoColor }}
                      >
                        {eficiencia}
                      </div>
                      <div className="text-[9px] text-outline uppercase tracking-widest font-medium">Eficiencia</div>
                      <div className="text-[8px] text-on-surface-variant mt-0.5">Rendimiento</div>
                    </div>
                  </div>

                  {/* Team Analytics — barra de radar visual */}
                  <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] text-outline uppercase tracking-widest font-medium">Team Analytics</div>
                      {/* Forma reciente */}
                      {formaReciente.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-outline mr-1">Forma</span>
                          {formaReciente.map((r, i) => (
                            <span
                              key={i}
                              className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-black"
                              style={{
                                background: r === 'W' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: r === 'W' ? '#22c55e' : '#ef4444',
                              }}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: 'Ataque',       value: ataqueBar,      color: '#22c55e', desc: ppg != null ? `${ppg.toFixed(1)} PPG` : `${winRate.toFixed(0)}% WR` },
                        { label: 'Defensa',      value: defensaBar,     color: '#3b82f6', desc: papg != null ? `${papg.toFixed(1)} en contra` : 'Pts concedidos' },
                        { label: 'Territorio',   value: territorioBar,  color: equipoColor, desc: `${kingCount} cancha${kingCount !== 1 ? 's' : ''} King` },
                        { label: 'Consistencia', value: consistenciaBar, color: '#a855f7', desc: `${totalV}V · ${totalD}D` },
                      ].map(({ label, value, color, desc }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-medium text-on-surface-variant">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-outline">{desc}</span>
                              <span className="text-[10px] font-bold text-on-surface w-8 text-right">
                                {Math.round(value)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(2, value))}%`,
                                background: color,
                                opacity: 0.85,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Sin partidos aún */
                <div
                  className="rounded-xl p-5 text-center"
                  style={{ background: `${equipoColor}09`, border: `1px solid ${equipoColor}25` }}
                >
                  <div className="text-[30px] mb-2">📊</div>
                  <div className="text-[13px] font-semibold text-on-surface mb-1">
                    Sin estadísticas todavía
                  </div>
                  <div className="text-[11px] text-on-surface-variant mb-3 leading-relaxed">
                    Juega tu primer desafío para ver Win Rate, PPG, ranking global y analíticas de equipo.
                  </div>
                  <Link
                    href="/mapa"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-lg hover:brightness-95 transition-all"
                    style={{ background: equipoColor, color: 'var(--color-on-accent)' }}
                  >
                    🗺️ Ir a desafiar
                  </Link>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ════════════════ RIGHT COLUMN (1/3) ════════════════ */}
        <div className="space-y-5">

          {/* Temporada info card */}
          {/* <div
            className="rounded-xl p-3.5 border"
            style={temporada ? {
              background: `${temporada.color ?? 'var(--color-accent)'}0e`,
              borderColor: `${temporada.color ?? 'var(--color-accent)'}30`,
            } : {
              background: 'var(--color-surface-container-low)',
              borderColor: 'var(--color-outline-variant)',
            }}
          > */}
            {/* <div className="text-[9px] text-outline mb-2 uppercase tracking-wider font-medium">Temporada activa</div> */}
            {/* {temporada ? (
              <>
                <div className="text-[13px] font-semibold text-on-surface mb-0.5">
                  {temporada.emoji ?? '🏆'}{' '}
                  {temporada.numero && (
                    <span style={{ color: temporada.color ?? undefined }}>
                      T{String(temporada.numero).padStart(2, '0')} ·{' '}
                    </span>
                  )}
                  {temporada.nombre}
                </div>
                {temporada.slogan && (
                  <div className="text-[10px] italic text-outline mb-1 line-clamp-2">{temporada.slogan}</div>
                )}
                {(() => {
                  const dias = Math.ceil((new Date(temporada.fin).getTime() - Date.now()) / 86400000);
                  return dias > 0 ? (
                    <div className="text-[10px] font-medium mb-2" style={{ color: temporada.color ?? 'var(--color-accent)' }}>
                      {dias}d restantes
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              <div className="text-[11px] text-outline italic mb-2">Sin temporada activa</div>
            )} */}
            {/* <Link href="/ranking" className="text-[11px] text-accent hover:underline font-medium">
              Ver ranking →
            </Link> */}
          {/* </div> */}

          {/* Desafíos feed */}
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
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-outline uppercase tracking-wider font-medium">⚔️ Desafíos</span>
              <Link href="/desafios" className="text-[10px] text-accent hover:underline">Ver todos →</Link>
            </div>

            {desafiosPendientes.length > 0 ? (
              <div className="flex flex-col gap-2">
                {desafiosPendientes.map(d => {
                  const esRetador = d.equipo_retador_id === equipoId;
                  const rivalEq = unwrapEq(esRetador ? d.equipo_retado : d.equipo_retador);
                  const rivalColor = rivalEq?.color ?? '#888888';
                  const estadoInfo = ESTADO_BADGE[d.estado] ?? { label: d.estado, variant: 'neutral' as const };
                  // Desafío recibido pendiente → destacar
                  const esRecibido = d.estado === 'pendiente' && !esRetador;

                  return (
                    <Link
                      key={d.id}
                      href="/desafios"
                      className={`block rounded-xl p-3 transition-colors ${
                        esRecibido
                          ? 'border-l-[3px] bg-accent/5 border-y border-r border-accent/30'
                          : 'border border-outline-variant bg-surface-container-low hover:border-outline'
                      }`}
                      style={esRecibido ? { borderLeftColor: 'var(--color-accent)' } : undefined}
                    >
                      {esRecibido && (
                        <div className="text-[9px] font-black text-accent uppercase tracking-widest mb-2">
                          ⚡ Desafío recibido
                        </div>
                      )}

                      {/* VS visual */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: `${equipoColor}18`, color: equipoColor, border: `1px solid ${equipoColor}35` }}
                        >
                          {equipoIniciales}
                        </div>
                        <span className="text-[9px] font-black text-outline flex-1 text-center">VS</span>
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: `${rivalColor}18`, color: rivalColor, border: `1px solid ${rivalColor}35` }}
                        >
                          {iniciales(rivalEq?.nombre)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-on-surface-variant truncate flex-1">
                          {rivalEq?.nombre ?? 'Rival'}
                        </div>
                        <Badge variant={estadoInfo.variant}>{estadoInfo.label}</Badge>
                      </div>
                      <div className="text-[9px] text-outline mt-1">{formatFecha(d.fecha)}</div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-center">
                <div className="text-[22px] mb-1.5">⚔️</div>
                <div className="text-[12px] text-on-surface-variant">Sin desafíos activos</div>
                <Link href="/mapa" className="text-[11px] text-accent hover:underline mt-1.5 block">
                  Ir a desafiar →
                </Link>
              </div>
            )}
          </div>

          {/* Nuevos Reyes (feed global) */}
          {nuevosReyes.length > 0 && (
            <div>
              <div className="text-[10px] text-outline uppercase tracking-wider font-medium mb-3">👑 Nuevos reyes</div>
              <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
                {nuevosReyes.map((r, idx) => {
                  const eq = unwrapEq(r.equipos);
                  const cancha = (Array.isArray(r.canchas) ? r.canchas[0] : r.canchas) as { nombre?: string } | null;
                  if (!eq) return null;
                  const c = eq.color ?? '#F5C344';
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
