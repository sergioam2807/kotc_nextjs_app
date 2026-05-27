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
    ? await supabase.from('equipos').select('id, nombre, deporte, modalidad, ciudad, region, comuna, color, nivel, xp, creador_id, buscando_rival, rival_modalidad, descripcion').eq('id', equipoId).maybeSingle()
    : { data: null };

  // ------------------------------------------------------------------
  // Sin equipo → pantalla de bienvenida
  // ------------------------------------------------------------------
  if (!miMembresia || !equipoData) {
    return (
      <div className="p-5 max-w-lg mx-auto">

        {/* Invitaciones recibidas — client component, carga async */}
        <InvitacionesRecibidas />

        <div className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[14px] p-6 text-center mb-4">
          <div
            className="w-14 h-14 rounded-[12px] mx-auto mb-4 flex items-center justify-center text-[24px]"
            style={{ background: '#F5C34420', color: '#F5C344' }}
          >
            🏆
          </div>
          <h1 className="text-[20px] font-medium text-white mb-2">Crea tu equipo</h1>
          <p className="text-[13px] text-[#555] leading-relaxed">
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
      <div className="bg-[#0f0f12] border border-[#1e1e24] rounded-[14px] p-4 flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-[12px] border-2 flex items-center justify-center text-[20px] sm:text-[22px] font-medium flex-shrink-0"
            style={{ background: `${equipo.color}20`, borderColor: equipo.color, color: equipo.color }}
          >
            {equipoIniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] sm:text-[20px] font-medium text-white mb-0.5 truncate">{equipo.nombre}</div>
            <div className="text-[12px] text-[#555] mb-2 truncate">
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
              <p className="text-[11px] text-[#666] mt-2 leading-relaxed line-clamp-2">
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {[
          { val: String(totalVictorias), label: 'Victorias' },
          { val: String(totalDerrotas),  label: 'Derrotas' },
          { val: String(totalKing),      label: 'Canchas king' },
          { val: 'Sin temporada', label: 'Temporada activa', sm: true },
        ].map(s => (
          <div key={s.label} className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[10px] p-3 text-center">
            <div className={`font-medium text-[#F5C344] ${s.sm ? 'text-[13px]' : 'text-[22px]'}`}>{s.val}</div>
            <div className="text-[10px] text-[#444] mt-0.5">{s.label}</div>
          </div>
        ))}
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
        <span className="text-[10px] text-[#444] tracking-[0.1em] font-medium uppercase truncate">
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
