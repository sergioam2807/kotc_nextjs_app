import { createClient } from '@/lib/supabase/server';
import { XPBar } from '@/components/ui/XPBar';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

const DEPORTES_MAP: Record<string, { emoji: string; label: string }> = {
  basketball: { emoji: '🏀', label: 'Basketball' },
  futbol:     { emoji: '⚽', label: 'Fútbol' },
  voleibol:   { emoji: '🏐', label: 'Vóleibol' },
  tenis:      { emoji: '🎾', label: 'Tenis' },
  padel:      { emoji: '🏓', label: 'Pádel' },
};

const ESTADO_BADGE: Record<string, { label: string; variant: 'accent' | 'neutral' | 'error' | 'green' }> = {
  pendiente:          { label: 'Pendiente',          variant: 'accent' },
  resultado_pendiente:{ label: 'Resultado pendiente', variant: 'error' },
  aceptado:           { label: 'Aceptado',           variant: 'green' },
};

import { nombreNivel } from '@/lib/levels';

function SidebarContent() {
  return (
    <>
      {/* Temporada */}
      <div className="bg-[#151518] border border-[#1e1e24] rounded-[8px] p-2.5 mb-5">
        <div className="text-[10px] text-[#555] mb-1">Temporada activa</div>
        <div className="text-[12px] text-[#444] italic">No hay temporada activa</div>
      </div>

      {/* Ranking */}
      <div className="text-[10px] text-[#444] tracking-[0.1em] font-medium mb-2.5 uppercase">Ranking temporada</div>
      <div className="text-[12px] text-[#444] italic mb-5">Sin datos de ranking aún.</div>

      {/* Próximos */}
      <div className="text-[10px] text-[#444] tracking-[0.1em] font-medium mb-2.5 uppercase">Próximos partidos</div>
      <div className="text-[12px] text-[#444] italic">No hay partidos programados.</div>
    </>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, nivel, xp, deportes_activos')
    .eq('id', user!.id)
    .maybeSingle();

  // Fetch user's team (if any)
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id')
    .eq('jugador_id', user!.id)
    .limit(1)
    .maybeSingle();

  const { data: equipoData } = membresia?.equipo_id
    ? await supabase
        .from('equipos')
        .select('id, nombre, color')
        .eq('id', membresia.equipo_id)
        .maybeSingle()
    : { data: null };

  const miEquipo = equipoData ?? null;
  const equipoId = miEquipo?.id ?? null;

  // Fetch canchas bajo control (victorias > 0)
  type CanchaDominio = {
    id: string;
    victorias: number;
    es_king: boolean;
    cancha_id: string;
    canchas: { nombre: string; deporte: string[] } | null;
  };
  const { data: canchaDominioRaw } = equipoId
    ? await supabase
        .from('cancha_dominio')
        .select('id, victorias, es_king, cancha_id, canchas(nombre, deporte)')
        .eq('equipo_id', equipoId)
        .gt('victorias', 0)
    : { data: null };
  const canchaDominio: CanchaDominio[] = (canchaDominioRaw as CanchaDominio[] | null) ?? [];

  // Fetch desafíos pendientes (limit 3)
  type DesafioRow = {
    id: string;
    equipo_retador_id: string;
    equipo_retado_id: string;
    estado: string;
    fecha: string;
    equipo_retador: { nombre: string } | null;
    equipo_retado: { nombre: string } | null;
  };
  const { data: desafiosRaw } = equipoId
    ? await supabase
        .from('desafios')
        .select('id, equipo_retador_id, equipo_retado_id, estado, fecha, equipo_retador:equipo_retador_id(nombre), equipo_retado:equipo_retado_id(nombre)')
        .or(`equipo_retador_id.eq.${equipoId},equipo_retado_id.eq.${equipoId}`)
        .in('estado', ['pendiente', 'resultado_pendiente'])
        .order('fecha', { ascending: true })
        .limit(3)
    : { data: null };
  const desafiosPendientes: DesafioRow[] = (desafiosRaw as DesafioRow[] | null) ?? [];

  const displayName = user?.user_metadata?.full_name ?? profile?.username ?? 'Player';
  const nivel = profile?.nivel ?? 1;
  const xp = profile?.xp ?? 0;
  const deportes: string[] = profile?.deportes_activos ?? [];
  const palabras = displayName.trim().split(/\s+/);
  const iniciales = palabras.length >= 2
    ? (palabras[0][0] + palabras[1][0]).toUpperCase()
    : displayName.slice(0, 2).toUpperCase();
  const avatarUrl: string | null = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const nivelNombre = nombreNivel(nivel);

  return (
    <div className="flex h-full">
      {/* Main column */}
      <div className="flex-1 p-5 overflow-y-auto">

        {/* Player banner */}
        <div className="bg-[#0f0f12] border border-[#1e1e24] rounded-[12px] p-3.5 flex items-center gap-3.5 mb-5">
          <div className="w-14 h-14 rounded-[10px] border-2 border-[#F5C344] overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#1a1a0a]">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[20px] font-medium text-[#F5C344]">{iniciales}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-medium text-white mb-0.5 truncate">{displayName}</div>
            <div className="text-[12px] text-[#F5C344] mb-1.5">Nivel {nivel} — {nivelNombre}</div>
            <XPBar xp={xp} nivel={nivel} />
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end flex-shrink-0">
            {miEquipo ? (
              <Badge variant="gold">{miEquipo.nombre}</Badge>
            ) : (
              <Badge variant="neutral">Sin equipo aún</Badge>
            )}
          </div>
        </div>

        {/* Deportes activos */}
        <div className="text-[10px] text-[#444] tracking-[0.1em] font-medium mb-2.5 uppercase">Mis deportes activos</div>
        {deportes.length > 0 ? (
          <div className="flex gap-2 mb-5 flex-wrap">
            {deportes.map(id => {
              const d = DEPORTES_MAP[id];
              if (!d) return null;
              return (
                <div key={id} className="bg-[#111114] border border-[#F5C34460] rounded-[8px] px-3 py-2 flex items-center gap-1.5">
                  <span className="text-[15px]">{d.emoji}</span>
                  <span className="text-[12px] text-[#ddd]">{d.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#111114] border border-[#1e1e24] rounded-[10px] p-4 mb-5 text-center">
            <p className="text-[13px] text-[#555] mb-2">No tienes deportes seleccionados.</p>
            <Link href="/onboarding" className="text-[12px] text-[#F5C344] hover:underline">
              Configurar deportes →
            </Link>
          </div>
        )}

        {/* Canchas */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-[#888] tracking-[0.06em] font-medium uppercase">Canchas bajo control</span>
          <Link href="/mapa" className="text-[11px] text-[#F5C344] hover:underline">Ver mapa</Link>
        </div>
        {canchaDominio.length > 0 ? (
          <div className="flex flex-col gap-1.5 mb-5">
            {canchaDominio.map(cd => {
              const deportesCancha: string[] = Array.isArray(cd.canchas?.deporte) ? cd.canchas!.deporte : [];
              const primerDeporte = deportesCancha[0] ?? '';
              const deporteInfo = DEPORTES_MAP[primerDeporte];
              return (
                <div
                  key={cd.id}
                  className="bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 flex items-center gap-3"
                >
                  <span className="text-[20px] flex-shrink-0">{deporteInfo?.emoji ?? '🏟️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-on-surface font-medium truncate">{cd.canchas?.nombre ?? '—'}</div>
                    <div className="text-[11px] text-on-surface-variant">{deporteInfo?.label ?? primerDeporte}</div>
                  </div>
                  {cd.es_king && <Badge variant="king">King 👑</Badge>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#111114] border border-[#1e1e24] rounded-[10px] p-6 mb-5 text-center">
            <p className="text-[28px] mb-2">🏀</p>
            <p className="text-[13px] text-[#555] mb-1">Aún no controlas ninguna cancha.</p>
            <p className="text-[12px] text-[#444]">Desafía a otros equipos para conquistarlas.</p>
          </div>
        )}

        {/* Desafíos */}
        <div className="text-[10px] text-[#888] tracking-[0.06em] font-medium uppercase mb-3">Desafíos pendientes</div>
        {desafiosPendientes.length > 0 ? (
          <div className="flex flex-col gap-1.5 mb-5">
            {desafiosPendientes.map(d => {
              const esRetador = d.equipo_retador_id === equipoId;
              const rival = esRetador
                ? (d.equipo_retado?.nombre ?? 'Rival')
                : (d.equipo_retador?.nombre ?? 'Rival');
              const fechaLabel = new Date(d.fecha).toLocaleDateString('es', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              });
              const estadoInfo = ESTADO_BADGE[d.estado] ?? { label: d.estado, variant: 'neutral' as const };
              return (
                <div
                  key={d.id}
                  className="bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 flex items-center gap-3"
                >
                  <span className="text-[20px] flex-shrink-0">⚔️</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-on-surface font-medium truncate">vs {rival}</div>
                    <div className="text-[11px] text-on-surface-variant">{fechaLabel}</div>
                  </div>
                  <Badge variant={estadoInfo.variant}>{estadoInfo.label}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#111114] border border-[#1e1e24] rounded-[10px] p-6 mb-5 text-center">
            <p className="text-[28px] mb-2">⚔️</p>
            <p className="text-[13px] text-[#555] mb-1">Sin desafíos pendientes.</p>
            <p className="text-[12px] text-[#444]">Ve al mapa y reta a los equipos que dominan una cancha.</p>
          </div>
        )}

        {/* Sidebar content — only visible on mobile, rendered inline */}
        <div className="md:hidden border-t border-[#1a1a1f] pt-5">
          <SidebarContent />
        </div>
      </div>

      {/* Right panel — desktop only */}
      <div className="hidden md:flex md:flex-col w-[210px] bg-[#0a0a0c] border-l border-[#1a1a1f] p-4 overflow-y-auto flex-shrink-0">
        <SidebarContent />
      </div>
    </div>
  );
}
