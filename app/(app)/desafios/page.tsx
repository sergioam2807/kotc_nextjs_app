import { createClient } from '@/lib/supabase/server';
import { DesafiosClientWrapper } from '@/components/desafios/DesafiosClientWrapper';
import type { DesafioConDatos, EquipoSimple, CanchaSimple } from '@/components/desafios/types';

export default async function DesafiosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-[#080809]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#444] text-[13px] mb-2">No tienes equipo</div>
            <a href="/equipo" className="text-[11px] text-[#F5C344] hover:underline">
              Crear o unirte a un equipo
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id')
    .eq('jugador_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membresia) {
    return (
      <div className="flex flex-col h-full bg-[#080809]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#444] text-[13px] mb-2">No tienes equipo</div>
            <a href="/equipo" className="text-[11px] text-[#F5C344] hover:underline">
              Crear o unirte a un equipo
            </a>
          </div>
        </div>
      </div>
    );
  }

  const equipoId = membresia.equipo_id;

  const { data: desafiosRaw } = await supabase
    .from('desafios')
    .select('*')
    .or(`equipo_retador_id.eq.${equipoId},equipo_retado_id.eq.${equipoId}`)
    .order('fecha', { ascending: true });

  const desafiosList = desafiosRaw ?? [];

  const equipoIds = [...new Set(desafiosList.flatMap((d) => [d.equipo_retador_id, d.equipo_retado_id]))];
  const canchaIds = [...new Set(desafiosList.map((d) => d.cancha_id).filter(Boolean))];

  const [{ data: equiposDesafio }, { data: canchasDesafio }, { data: todosEquipos }, { data: todasCanchas }] =
    await Promise.all([
      equipoIds.length
        ? supabase.from('equipos').select('id, nombre, color').in('id', equipoIds)
        : Promise.resolve({ data: [] }),
      canchaIds.length
        ? supabase.from('canchas').select('id, nombre, direccion').in('id', canchaIds)
        : Promise.resolve({ data: [] }),
      supabase.from('equipos').select('id, nombre, color'),
      supabase.from('canchas').select('id, nombre, direccion').order('nombre'),
    ]);

  const equipoMap = Object.fromEntries((equiposDesafio ?? []).map((e) => [e.id, e]));
  const canchaMap = Object.fromEntries((canchasDesafio ?? []).map((c) => [c.id, c]));

  const desafios: DesafioConDatos[] = desafiosList.map((d) => ({
    ...d,
    equipo_retador: equipoMap[d.equipo_retador_id] ?? { id: d.equipo_retador_id, nombre: 'Equipo', color: '#888' },
    equipo_retado: equipoMap[d.equipo_retado_id] ?? { id: d.equipo_retado_id, nombre: 'Equipo', color: '#888' },
    cancha: canchaMap[d.cancha_id] ?? { id: d.cancha_id, nombre: 'Cancha', direccion: '' },
  }));

  const equipos: EquipoSimple[] = (todosEquipos ?? []).filter((e) => e.id !== equipoId);
  const canchas: CanchaSimple[] = todasCanchas ?? [];

  return (
    <div className="flex flex-col h-full bg-[#080809]">
      <DesafiosClientWrapper
        desafios={desafios}
        equipoId={equipoId}
        equipos={equipos}
        canchas={canchas}
      />
    </div>
  );
}
