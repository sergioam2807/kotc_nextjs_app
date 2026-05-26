import { createClient } from '@/lib/supabase/server';
import { DesafiosClientWrapper } from '@/components/desafios/DesafiosClientWrapper';
import type { DesafioConDatos, EquipoSimple, CanchaSimple } from '@/components/desafios/types';
import { Desafios1v1Section } from '@/components/desafios1v1/Desafios1v1Section';
import type { Desafio1v1ConDatos, ProfileSimple } from '@/components/desafios1v1/types';

export default async function DesafiosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-surface">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-outline text-[13px] mb-2">Inicia sesión para ver tus desafíos</div>
            <a href="/login" className="text-[11px] text-accent hover:underline">
              Iniciar sesión →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Team membership ─────────────────────────────────────────────────────────
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id')
    .eq('jugador_id', user.id)
    .limit(1)
    .maybeSingle();

  const equipoId = membresia?.equipo_id ?? null;

  // ── 1v1 challenges + players + courts (always fetched) ─────────────────────
  const [
    { data: desafios1v1Raw },
    { data: todosJugadoresRaw },
    { data: todasCanchasRaw },
  ] = await Promise.all([
    supabase
      .from('desafios_individual')
      .select('*')
      .or(`retador_id.eq.${user.id},retado_id.eq.${user.id}`)
      .order('created_at', { ascending: false }),
    // All players except current user — for the "choose rival" picker
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, nivel, xp')
      .neq('id', user.id)
      .order('display_name', { ascending: true }),
    supabase
      .from('canchas')
      .select('id, nombre, direccion')
      .order('nombre', { ascending: true }),
  ]);

  const desafios1v1List = desafios1v1Raw ?? [];

  // Fetch profiles for 1v1 opponents (to enrich cards)
  const jugadorIds = [...new Set(desafios1v1List.flatMap(d => [d.retador_id, d.retado_id]))].filter(Boolean);

  const [profilesResult, resultados1v1Result] = await Promise.all([
    jugadorIds.length
      ? supabase.from('profiles').select('id, username, display_name, avatar_url, nivel, xp').in('id', jugadorIds)
      : Promise.resolve({ data: [] }),
    (async () => {
      const conResultadoIds = desafios1v1List
        .filter(d => ['resultado_pendiente', 'completado'].includes(d.estado))
        .map(d => d.id);
      if (!conResultadoIds.length) return { data: [] };
      return supabase.from('resultados_individual').select('*').in('desafio_id', conResultadoIds);
    })(),
  ]);

  const profileMap = Object.fromEntries((profilesResult.data ?? []).map(p => [p.id, p]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultadoMap1v1 = Object.fromEntries(((resultados1v1Result.data ?? []) as any[]).map((r: any) => [r.desafio_id, r]));

  const desafios1v1: Desafio1v1ConDatos[] = desafios1v1List.map(d => ({
    ...d,
    retador: profileMap[d.retador_id] ?? null,
    retado:  profileMap[d.retado_id]  ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resultado: (resultadoMap1v1[d.id] as any) ?? null,
  }));

  // All players for the picker (exclude current user, already filtered by .neq)
  const jugadoresPicker: ProfileSimple[] = (todosJugadoresRaw ?? []).map(p => ({
    id: p.id,
    username:     p.username     ?? null,
    display_name: p.display_name ?? null,
    avatar_url:   p.avatar_url   ?? null,
    nivel:        p.nivel        ?? null,
    xp:           p.xp          ?? null,
  }));

  const canchasPicker: CanchaSimple[] = (todasCanchasRaw ?? []).map(c => ({
    id:        c.id,
    nombre:    c.nombre,
    direccion: c.direccion,
  }));

  // ── Team challenges (only if user has a team) ───────────────────────────────
  let desafios: DesafioConDatos[] = [];
  let todosEquipos: EquipoSimple[] = [];
  let todasCanchas: CanchaSimple[] = [];

  if (equipoId) {
    const { data: desafiosRaw } = await supabase
      .from('desafios')
      .select('*')
      .or(`equipo_retador_id.eq.${equipoId},equipo_retado_id.eq.${equipoId}`)
      .order('fecha', { ascending: true });

    const desafiosList = desafiosRaw ?? [];
    const equIds  = [...new Set(desafiosList.flatMap(d => [d.equipo_retador_id, d.equipo_retado_id]))];
    const cancIds = [...new Set(desafiosList.map(d => d.cancha_id).filter(Boolean))];
    const dsConResultado = desafiosList.filter(d =>
      ['resultado_pendiente', 'disputado', 'completado', 'jugado'].includes(d.estado),
    );
    const dsIds = dsConResultado.map(d => d.id);

    const [
      { data: equiposDesafio },
      { data: canchasDesafio },
      { data: todosEqs },
      { data: todasCanchasData },
      { data: resultadosData },
    ] = await Promise.all([
      equIds.length
        ? supabase.from('equipos').select('id, nombre, color').in('id', equIds)
        : Promise.resolve({ data: [] }),
      cancIds.length
        ? supabase.from('canchas').select('id, nombre, direccion').in('id', cancIds)
        : Promise.resolve({ data: [] }),
      supabase.from('equipos').select('id, nombre, color'),
      supabase.from('canchas').select('id, nombre, direccion').order('nombre'),
      dsIds.length
        ? supabase.from('resultados').select('*').in('desafio_id', dsIds)
        : Promise.resolve({ data: [] }),
    ]);

    const equipoMap = Object.fromEntries((equiposDesafio ?? []).map(e => [e.id, e]));
    const canchaMap = Object.fromEntries((canchasDesafio ?? []).map(c => [c.id, c]));
    const resultadoMap = Object.fromEntries((resultadosData ?? []).map(r => [r.desafio_id, r]));

    desafios = desafiosList.map(d => ({
      ...d,
      equipo_retador: equipoMap[d.equipo_retador_id] ?? { id: d.equipo_retador_id, nombre: 'Equipo', color: '#888' },
      equipo_retado:  equipoMap[d.equipo_retado_id]  ?? { id: d.equipo_retado_id,  nombre: 'Equipo', color: '#888' },
      cancha:    canchaMap[d.cancha_id] ?? { id: d.cancha_id, nombre: 'Cancha', direccion: '' },
      resultado: resultadoMap[d.id] ?? null,
    }));

    todosEquipos = (todosEqs ?? []).filter(e => e.id !== equipoId);
    todasCanchas = todasCanchasData ?? [];
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-surface">
      {equipoId ? (
        <div className="flex flex-col min-h-full">
          {/* Team challenges section */}
          <DesafiosClientWrapper
            desafios={desafios}
            equipoId={equipoId}
            equipos={todosEquipos}
            canchas={todasCanchas}
            jugadores1v1={jugadoresPicker}
          />
          {/* 1v1 section */}
          <div className="border-t border-outline-variant">
            <div className="px-4 py-4 sm:px-6">
              <Desafios1v1Section
                desafios={desafios1v1}
                userId={user.id}
                jugadores={jugadoresPicker}
                canchas={canchasPicker}
              />
            </div>
          </div>
        </div>
      ) : (
        /* No team: only 1v1 */
        <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-5 flex items-center gap-3">
            <span className="text-[20px]">🏀</span>
            <div>
              <div className="text-[13px] font-semibold text-on-surface">¿Quieres desafíos en equipo?</div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Crea o únete a un equipo para conquistar canchas y competir en torneos.
              </p>
            </div>
            <a href="/equipo" className="ml-auto text-[12px] text-accent hover:underline flex-shrink-0">
              Ver equipos →
            </a>
          </div>

          <Desafios1v1Section
            desafios={desafios1v1}
            userId={user.id}
            jugadores={jugadoresPicker}
            canchas={canchasPicker}
          />
        </div>
      )}
    </div>
  );
}
