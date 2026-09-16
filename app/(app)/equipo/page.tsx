import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { RosterRow } from '@/components/equipo/RosterRow';
import { RosterSlots } from '@/components/equipo/RosterSlots';
import { LeaveTeamButton } from '@/components/equipo/LeaveTeamButton';
import { DisolverEquipoButton } from '@/components/equipo/DisolverEquipoButton';
import { CrearEquipoForm } from '@/components/equipo/CrearEquipoForm';
import { InvitacionesRecibidas } from '@/components/equipo/InvitacionesRecibidas';
import { Badge } from '@/components/ui/Badge';
import { BuscandoRivalToggle } from '@/components/equipo/BuscandoRivalToggle';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avatarColor(id: string): string {
  const palette = ['#F5C344', '#7F77DD', '#378ADD', '#1D9E75', '#D85A30'];
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return palette[n % palette.length];
}

function getIniciales(displayName: string | null, username: string): string {
  if (displayName) {
    const words = displayName.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

// Roster config: titulares + suplentes per modalidad
const ROSTER_CONFIG: Record<string, { titulares: number; suplentes: number }> = {
  '3v3':   { titulares: 3, suplentes: 2 },
  '5v5':   { titulares: 5, suplentes: 3 },
  '7v7':   { titulares: 7, suplentes: 4 },
  '11v11': { titulares: 11, suplentes: 5 },
  '6v6':   { titulares: 6, suplentes: 3 },
  '1v1':   { titulares: 1, suplentes: 1 },
  '2v2':   { titulares: 2, suplentes: 1 },
};

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

export default async function EquipoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Step 1: membresía del usuario (sin join para evitar ambigüedad en FK)
  const { data: membresias } = await supabase
    .from('equipo_miembros')
    .select('id, rol, posicion, equipo_id')
    .eq('jugador_id', user.id)
    .limit(1);

  const miMembresia = membresias?.[0] ?? null;

  // Step 2: datos del equipo por ID separado
  const equipoId = miMembresia?.equipo_id ?? null;
  const { data: equipoData } = equipoId
    ? await supabase.from('equipos').select('id, nombre, deporte, modalidad, ciudad, region, comuna, color, nivel, xp, creador_id, buscando_rival, rival_modalidad, descripcion, logo_url').eq('id', equipoId).maybeSingle()
    : { data: null };

  // ------------------------------------------------------------------
  // Sin equipo → pantalla de bienvenida
  // ------------------------------------------------------------------
  if (!miMembresia || !equipoData) {
    return (
      <div className="p-5 max-w-lg mx-auto">

        {/* Invitaciones recibidas — client component, carga async */}
        <InvitacionesRecibidas />

        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 text-center mb-4">
          <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center text-[24px] bg-accent-dim text-accent">
            🏆
          </div>
          <h1 className="text-[20px] font-medium text-on-surface mb-2">Crea tu equipo</h1>
          <p className="text-[13px] text-on-surface-variant leading-relaxed">
            Aún no perteneces a ningún equipo. Crea el tuyo para desafiar canchas,
            competir por territorio y subir en el ranking.
          </p>
        </div>

        {/* Opción alternativa: unirse a un equipo existente */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-on-surface mb-0.5">¿Prefieres unirte?</div>
            <div className="text-[11px] text-on-surface-variant">Busca equipos que aceptan solicitudes.</div>
          </div>
          <Link
            href="/equipos"
            className="flex-shrink-0 text-[12px] text-accent font-semibold hover:underline whitespace-nowrap"
          >
            Ver equipos →
          </Link>
        </div>

        <CrearEquipoForm />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Con equipo
  // ------------------------------------------------------------------
  const equipo = equipoData;
  const isAdmin = miMembresia.rol === 'admin';

  // Step 3: solicitudes pendientes (for admins)
  const { data: solicitudesPendientes } = isAdmin
    ? await supabase
        .from('solicitudes_equipo')
        .select('id')
        .eq('equipo_id', equipo.id)
        .eq('estado', 'pendiente')
    : { data: null };
  const solicitudesCount = solicitudesPendientes?.length ?? 0;

  // Step 4: victorias y derrotas agregadas desde cancha_dominio
  const { data: dominio } = await supabase
    .from('cancha_dominio')
    .select('victorias, derrotas, es_king')
    .eq('equipo_id', equipo.id);

  const totalVictorias = dominio?.reduce((sum, d) => sum + (d.victorias ?? 0), 0) ?? 0;
  const totalDerrotas  = dominio?.reduce((sum, d) => sum + (d.derrotas  ?? 0), 0) ?? 0;
  const totalKing      = dominio?.filter(d => d.es_king).length ?? 0;

  // Step 4b: ranking global (cuántos equipos tienen más XP) + últimos resultados con marcador (PPG)
  const [{ count: equiposDelanteCount }, { data: ultimosResultadosRaw }] = await Promise.all([
    supabase
      .from('equipos')
      .select('id', { count: 'exact', head: true })
      .gt('xp', equipo.xp ?? 0),
    supabase
      .from('desafios')
      .select('id, equipo_retador_id, equipo_retado_id, resultados(ganador_id, puntos_retador, puntos_retado)')
      .or(`equipo_retador_id.eq.${equipo.id},equipo_retado_id.eq.${equipo.id}`)
      .eq('estado', 'completado')
      .order('fecha', { ascending: false })
      .limit(10),
  ]);

  type UltimoResultadoRow = {
    equipo_retador_id: string;
    resultados:
      | { ganador_id: string | null; puntos_retador: number | null; puntos_retado: number | null }[]
      | { ganador_id: string | null; puntos_retador: number | null; puntos_retado: number | null }
      | null;
  };
  const ultimosResultados = (ultimosResultadosRaw as UltimoResultadoRow[] | null) ?? [];

  const partidos = totalVictorias + totalDerrotas;
  const winRate = partidos > 0 ? (totalVictorias / partidos) * 100 : 0;
  const rankingGlobal = equiposDelanteCount != null ? equiposDelanteCount + 1 : null;

  let ppg: number | null = null;
  let papg: number | null = null;
  let formaReciente: ('W' | 'L')[] = [];

  if (ultimosResultados.length > 0) {
    let sumaM = 0; let sumaR = 0; let conMarcador = 0;
    for (const d of ultimosResultados) {
      const res = Array.isArray(d.resultados) ? d.resultados[0] : d.resultados;
      if (!res) continue;
      const esRetador = d.equipo_retador_id === equipo.id;
      formaReciente.push(res.ganador_id === equipo.id ? 'W' : 'L');
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

  const ataqueBar = ppg != null
    ? Math.min(100, (ppg / 25) * 100)
    : Math.min(100, winRate * 1.1);
  const defensaBar = papg != null && ppg != null
    ? Math.max(0, 100 - (papg / Math.max(ppg, 1)) * 80)
    : Math.min(100, winRate * 0.9);
  const territorioBar = Math.min(100, totalKing * 25);
  const consistenciaBar = winRate;

  // Step 5: roster (miembros sin join)
  const { data: rosterMiembros } = await supabase
    .from('equipo_miembros')
    .select('id, rol, posicion, jugador_id')
    .eq('equipo_id', equipo.id)
    .order('posicion');

  // Step 6: perfiles de los miembros
  const jugadorIds = rosterMiembros?.map(m => m.jugador_id) ?? [];
  const { data: perfiles } = jugadorIds.length > 0
    ? await supabase.from('profiles').select('id, username, display_name, avatar_url, nivel, xp').in('id', jugadorIds)
    : { data: [] };

  const perfilMap = Object.fromEntries((perfiles ?? []).map(p => [p.id, p]));

  const roster = rosterMiembros?.map(m => ({
    ...m,
    jugador: perfilMap[m.jugador_id] ?? null,
  })) ?? [];

  const rosterConfig = ROSTER_CONFIG[equipo.modalidad] ?? { titulares: 5, suplentes: 3 };
  const titularesCount = roster?.filter(m => m.posicion === 'titular').length ?? 0;
  const suplentesCount = roster?.filter(m => m.posicion === 'suplente').length ?? 0;

  const deporteLabel = DEPORTE_LABELS[equipo.deporte] ?? equipo.deporte;
  const equipoIniciales = equipo.nombre.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <div className="p-4 sm:p-5">
      {/* Team hero */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-[12px] border-2 overflow-hidden flex items-center justify-center text-[20px] sm:text-[22px] font-medium flex-shrink-0"
            style={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              background: (equipo as any).logo_url ? 'transparent' : `${equipo.color}20`,
              borderColor: equipo.color,
              color: equipo.color,
            }}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(equipo as any).logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                src={(equipo as any).logo_url as string}
                alt={equipo.nombre}
                className="w-full h-full object-cover"
              />
            ) : (
              equipoIniciales
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] sm:text-[20px] font-medium text-on-surface mb-0.5 truncate">{equipo.nombre}</div>
            <div className="text-[12px] text-on-surface-variant mb-2 truncate">
              {equipo.ciudad
                ? `${equipo.ciudad} · `
                : equipo.region
                  ? `${equipo.region} · `
                  : ''}
              {deporteLabel} {equipo.modalidad}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="purple">Nivel {equipo.nivel}</Badge>
              <Badge variant="gold">{equipo.xp} XP</Badge>
              <Badge variant="green">{(roster?.length ?? 0)}/{rosterConfig.titulares + rosterConfig.suplentes} jugadores</Badge>
              <Badge variant="neutral">Sin temporada activa</Badge>
            </div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(equipo as any).descripcion && (
              <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed line-clamp-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(equipo as any).descripcion}
              </p>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex-shrink-0 w-full sm:w-auto flex gap-2">
            <Link
              href="/equipo/editar"
              className="flex items-center justify-center gap-1.5 bg-surface-container border border-outline-variant text-on-surface-variant rounded-lg px-3 py-2.5 text-[12px] font-medium hover:border-outline hover:text-on-surface transition-colors min-h-[44px]"
              aria-label="Editar equipo"
            >
              ✏️ Editar
            </Link>
            <Link
              href="/equipo/invitaciones"
              className="flex-1 bg-accent text-on-accent rounded-lg px-4 py-2.5 text-[12px] font-medium cursor-pointer hover:brightness-95 transition-all inline-flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              + Invitar
            </Link>
          </div>
        )}
      </div>

      {/* Admin quick actions */}
      {isAdmin && (
        <div className="flex gap-2 mb-4">
          <Link
            href="/equipo/solicitudes"
            className="flex-1 flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 hover:border-outline transition-colors"
          >
            <div>
              <div className="text-[13px] font-medium text-on-surface">Solicitudes de ingreso</div>
              <div className="text-[11px] text-on-surface-variant mt-0.5">
                {solicitudesCount > 0
                  ? `${solicitudesCount} solicitud${solicitudesCount !== 1 ? 'es' : ''} pendiente${solicitudesCount !== 1 ? 's' : ''}`
                  : 'Sin solicitudes pendientes'}
              </div>
            </div>
            {solicitudesCount > 0 && (
              <span className="ml-2 bg-error text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                {solicitudesCount}
              </span>
            )}
          </Link>
          <Link
            href="/jugadores"
            className="flex items-center justify-center bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 hover:border-outline transition-colors flex-shrink-0"
          >
            <div className="text-center">
              <div className="text-[13px] font-medium text-accent">Buscar</div>
              <div className="text-[10px] text-on-surface-variant mt-0.5">jugadores</div>
            </div>
          </Link>
        </div>
      )}

      {/* Analíticas del equipo */}
      <div className="mb-5">
        <div className="text-[10px] text-outline tracking-[0.08em] font-medium uppercase mb-3">
          📊 Analíticas del equipo
        </div>

        {partidos > 0 ? (
          <div className="flex flex-col gap-3">
            {/* 4 stat cards — 2×2 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-center hover:border-outline transition-colors">
                <div className="text-[26px] font-black leading-none mb-1 text-on-surface">
                  {rankingGlobal != null ? `#${rankingGlobal}` : '—'}
                </div>
                <div className="text-[9px] text-outline uppercase tracking-widest font-medium">Ranking</div>
                <div className="text-[8px] text-on-surface-variant mt-0.5">Global XP</div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-center hover:border-outline transition-colors">
                <div className="text-[26px] font-black leading-none mb-1 text-on-surface">
                  {ppg != null ? ppg.toFixed(1) : '—'}
                </div>
                <div className="text-[9px] text-outline uppercase tracking-widest font-medium">PPG</div>
                <div className="text-[8px] text-on-surface-variant mt-0.5">
                  {papg != null ? `${papg.toFixed(1)} en contra` : 'Pts por partido'}
                </div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-center hover:border-outline transition-colors">
                <div className="text-[26px] font-black leading-none mb-1" style={{ color: equipo.color }}>
                  {eficiencia}
                </div>
                <div className="text-[9px] text-outline uppercase tracking-widest font-medium">Eficiencia</div>
                <div className="text-[8px] text-on-surface-variant mt-0.5">Rendimiento</div>
              </div>
            </div>

            {/* Radar: ataque / defensa / territorio / consistencia */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] text-outline uppercase tracking-widest font-medium">Team Analytics</div>
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
                  { label: 'Ataque',       value: ataqueBar,       color: '#22c55e', desc: ppg != null ? `${ppg.toFixed(1)} PPG` : `${winRate.toFixed(0)}% WR` },
                  { label: 'Defensa',      value: defensaBar,      color: '#3b82f6', desc: papg != null ? `${papg.toFixed(1)} en contra` : 'Pts concedidos' },
                  { label: 'Territorio',   value: territorioBar,   color: equipo.color, desc: `${totalKing} cancha${totalKing !== 1 ? 's' : ''} King` },
                  { label: 'Consistencia', value: consistenciaBar, color: '#a855f7', desc: `${totalVictorias}V · ${totalDerrotas}D` },
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
                        style={{ width: `${Math.min(100, Math.max(2, value))}%`, background: color, opacity: 0.85 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-5 text-center"
            style={{ background: `${equipo.color}09`, border: `1px solid ${equipo.color}25` }}
          >
            <div className="text-[30px] mb-2">📊</div>
            <div className="text-[13px] font-semibold text-on-surface mb-1">Sin estadísticas todavía</div>
            <div className="text-[11px] text-on-surface-variant mb-3 leading-relaxed">
              Juega tu primer desafío para ver Win Rate, PPG, ranking global y analíticas de equipo.
            </div>
            <Link
              href="/mapa"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-lg hover:brightness-95 transition-all"
              style={{ background: equipo.color, color: 'var(--color-on-accent)' }}
            >
              🗺️ Ir a desafiar
            </Link>
          </div>
        )}
      </div>

      {/* Buscando rival — solo admin */}
      {isAdmin && (
        <div className="mb-4">
          <BuscandoRivalToggle
            equipoId={equipo.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialBuscando={(equipo as any).buscando_rival ?? false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialModalidad={(equipo as any).rival_modalidad ?? null}
          />
        </div>
      )}

      {/* Roster header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] text-outline tracking-[0.1em] font-medium uppercase truncate">
          Roster — {deporteLabel} {equipo.modalidad}
        </span>
        {isAdmin && (
          <Link
            href="/equipo/invitaciones"
            className="bg-transparent text-on-surface-variant border border-outline-variant rounded-lg px-3.5 py-1.5 text-[12px] cursor-pointer hover:border-outline hover:text-on-surface transition-colors inline-flex items-center flex-shrink-0 min-h-[44px]"
          >
            + Invitar
          </Link>
        )}
      </div>

      <RosterSlots
        modalidad={`${deporteLabel} ${equipo.modalidad}`}
        titulares={titularesCount}
        maxTitulares={rosterConfig.titulares}
        suplentes={suplentesCount}
        maxSuplentes={rosterConfig.suplentes}
      />

      <div className="flex flex-col gap-1.5 mt-2">
        {roster.map(miembro => {
          const jugador = miembro.jugador;
          if (!jugador) return null;

          const nombre = jugador.display_name ?? jugador.username;
          const iniciales = getIniciales(jugador.display_name, jugador.username);
          const color = avatarColor(jugador.id);
          const isCurrentUser = jugador.id === user.id;

          return (
            <RosterRow
              key={miembro.id}
              miembroId={miembro.id}
              jugadorId={jugador.id}
              nombre={nombre}
              iniciales={iniciales}
              avatarColor={color}
              avatarUrl={jugador.avatar_url}
              roles={[miembro.rol as 'admin' | 'capitan' | 'jugador']}
              posicion={miembro.posicion as 'titular' | 'suplente'}
              nivel={jugador.nivel}
              xp={jugador.xp}
              isCurrentUser={isCurrentUser}
              isAdmin={isAdmin}
            />
          );
        })}
      </div>

      {/* Admin: disolver equipo (con doble confirmación) */}
      {isAdmin && <DisolverEquipoButton equipoNombre={equipo.nombre} />}

      {/* Jugador regular: salir del equipo */}
      {!isAdmin && <LeaveTeamButton miembroId={miMembresia.id} />}
    </div>
  );
}
