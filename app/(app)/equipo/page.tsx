import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { RosterRow } from '@/components/equipo/RosterRow';
import { RosterSlots } from '@/components/equipo/RosterSlots';
import { LeaveTeamButton } from '@/components/equipo/LeaveTeamButton';
import { CrearEquipoForm } from '@/components/equipo/CrearEquipoForm';
import { Badge } from '@/components/ui/Badge';

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
    ? await supabase.from('equipos').select('id, nombre, deporte, modalidad, ciudad, color, nivel, xp, creador_id').eq('id', equipoId).maybeSingle()
    : { data: null };

  // ------------------------------------------------------------------
  // Sin equipo → pantalla de bienvenida
  // ------------------------------------------------------------------
  if (!miMembresia || !equipoData) {
    return (
      <div className="p-5 max-w-lg mx-auto">
        <div className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[14px] p-6 text-center mb-6">
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
        <CrearEquipoForm />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Con equipo
  // ------------------------------------------------------------------
  const equipo = equipoData;
  const isAdmin = miMembresia.rol === 'admin';

  // Step 3: roster (miembros sin join)
  const { data: rosterMiembros } = await supabase
    .from('equipo_miembros')
    .select('id, rol, posicion, jugador_id')
    .eq('equipo_id', equipo.id)
    .order('posicion');

  // Step 4: perfiles de los miembros
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
    <div className="p-5">
      {/* Team hero */}
      <div className="bg-[#0f0f12] border border-[#1e1e24] rounded-[14px] p-4 flex items-center gap-4 mb-5">
        <div
          className="w-16 h-16 rounded-[12px] border-2 flex items-center justify-center text-[22px] font-medium flex-shrink-0"
          style={{ background: `${equipo.color}20`, borderColor: equipo.color, color: equipo.color }}
        >
          {equipoIniciales}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[20px] font-medium text-white mb-0.5 truncate">{equipo.nombre}</div>
          <div className="text-[12px] text-[#555] mb-2">
            {equipo.ciudad} · {deporteLabel} {equipo.modalidad}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="purple">Nivel {equipo.nivel}</Badge>
            <Badge variant="gold">{equipo.xp} XP</Badge>
            <Badge variant="green">{(roster?.length ?? 0)}/{rosterConfig.titulares + rosterConfig.suplentes} jugadores</Badge>
            <Badge variant="neutral">Sin temporada activa</Badge>
          </div>
        </div>
        {isAdmin && (
          <div className="flex-shrink-0">
            <Link
              href="/equipo/invitaciones"
              className="bg-[#F5C344] text-[#080809] rounded-[7px] px-3.5 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[#e8b53d] transition-colors inline-flex items-center gap-1.5"
            >
              + Invitar jugador
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { val: '0', label: 'Victorias' },
          { val: '0', label: 'Derrotas' },
          { val: '0', label: 'Canchas king' },
          { val: 'Sin temporada', label: 'Temporada activa', sm: true },
        ].map(s => (
          <div key={s.label} className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[10px] p-3 text-center">
            <div className={`font-medium text-[#F5C344] ${s.sm ? 'text-[13px]' : 'text-[22px]'}`}>{s.val}</div>
            <div className="text-[10px] text-[#444] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Roster header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-[#444] tracking-[0.1em] font-medium uppercase">
          Roster — {deporteLabel} {equipo.modalidad}
        </span>
        {isAdmin && (
          <Link
            href="/equipo/invitaciones"
            className="bg-transparent text-[#555] border border-[#2a2a2a] rounded-[7px] px-3.5 py-1.5 text-[12px] cursor-pointer hover:border-[#444] hover:text-[#aaa] transition-colors inline-flex items-center"
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

      {/* Admin también puede salir si quiere */}
      {isAdmin && (
        <LeaveTeamButton miembroId={miMembresia.id} />
      )}
    </div>
  );
}
