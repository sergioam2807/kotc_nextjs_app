import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminEstadoPanel } from '@/components/ligas/admin/AdminEstadoPanel';
import { AdminEquiposPanel } from '@/components/ligas/admin/AdminEquiposPanel';
import { GenerarCalendarioButton } from '@/components/ligas/admin/GenerarCalendarioButton';
import Link from 'next/link';

// Normalise Supabase FK joins that may be returned as array or single object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap<T>(v: T | T[]): T | null {
  if (Array.isArray(v)) return (v as T[])[0] ?? null;
  return v ?? null;
}

export default async function LigaAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ligaRaw } = await supabase
    .from('ligas')
    .select(`
      id, nombre, deporte, modalidad, formato, estado, max_equipos,
      inscripcion_publica, fecha_inicio, fecha_fin, organizador_id,
      num_grupos, equipos_clasifican,
      liga_equipos(
        id, equipo_id, estado, grupo, seed,
        equipos(id, nombre, color, ciudad)
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (!ligaRaw) redirect('/ligas');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liga = ligaRaw as any;
  if (liga.organizador_id !== user.id) redirect(`/ligas/${id}`);

  // Match stats
  const { data: partidos } = await supabase
    .from('liga_partidos')
    .select('id, fase, ronda, estado')
    .eq('liga_id', id);

  const totalPartidos = partidos?.length ?? 0;
  const completados   = partidos?.filter(p => p.estado === 'completado').length ?? 0;
  const pendientes    = partidos?.filter(p => p.estado === 'pendiente').length ?? 0;
  const calGenerado   = totalPartidos > 0;

  const maxRonda = partidos && partidos.length > 0 ? Math.max(...partidos.map(p => p.ronda)) : 0;
  const rondaCompleta = maxRonda > 0
    ? (partidos ?? []).filter(p => p.ronda === maxRonda).every(p => p.estado === 'completado')
    : false;

  const gruposCompletos = liga.formato === 'grupos_playoffs'
    ? (partidos ?? []).filter(p => p.fase === 'grupos').length > 0 &&
      (partidos ?? []).filter(p => p.fase === 'grupos').every(p => p.estado === 'completado')
    : false;

  const hayPlayoffs = (partidos ?? []).some((p: { fase: string }) => !['regular', 'grupos'].includes(p.fase));

  // Normalise liga_equipos so equipos is always a plain object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ligaEquipos = (liga.liga_equipos ?? []).map((le: any) => ({
    ...le,
    equipos: unwrap(le.equipos) ?? { id: '', nombre: '?', color: '#888', ciudad: null },
  }));

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <Link href={`/ligas/${id}`} className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5">
        ← Ver liga
      </Link>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-on-surface">{liga.nombre}</h1>
          <p className="text-[12px] text-on-surface-variant mt-0.5">Panel de organización</p>
        </div>
      </div>

      {/* Estado */}
      <div className="mb-4">
        <AdminEstadoPanel ligaId={id} estadoActual={liga.estado} nombre={liga.nombre} />
      </div>

      {/* Stats rápidas */}
      {calGenerado && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { val: totalPartidos, label: 'Totales' },
            { val: completados,   label: 'Completados', accent: true },
            { val: pendientes,    label: 'Pendientes' },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-low border border-outline-variant rounded-xl p-3 text-center">
              <div className={`text-[22px] font-semibold ${s.accent ? 'text-status-libre' : 'text-on-surface'}`}>{s.val}</div>
              <div className="text-[10px] text-on-surface-variant mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Generar calendario */}
      {liga.estado === 'inscripciones' && !calGenerado && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-3">Generar calendario</div>
          <p className="text-[12px] text-on-surface-variant mb-3">
            {liga.formato === 'grupos_playoffs'
              ? 'Asigna grupos a los equipos y luego genera la fase de grupos.'
              : 'Una vez que tengas los equipos listos, genera el calendario. La liga pasará a "En curso".'}
          </p>
          {liga.formato === 'grupos_playoffs' ? (
            <GenerarCalendarioButton ligaId={id} formato={liga.formato} fase="grupos" label="Generar fase de grupos" />
          ) : (
            <GenerarCalendarioButton ligaId={id} formato={liga.formato} />
          )}
        </div>
      )}

      {/* Siguiente ronda */}
      {calGenerado && liga.estado === 'en_curso' && (
        <>
          {liga.formato === 'eliminacion_directa' && rondaCompleta && (
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-2">Ronda {maxRonda} completada</div>
              <p className="text-[12px] text-on-surface-variant mb-3">Genera la siguiente ronda con los ganadores.</p>
              <GenerarCalendarioButton ligaId={id} formato={liga.formato} label={`Generar ronda ${maxRonda + 1}`} />
            </div>
          )}
          {liga.formato === 'grupos_playoffs' && gruposCompletos && !hayPlayoffs && (
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-2">Fase de grupos completada</div>
              <p className="text-[12px] text-on-surface-variant mb-3">Genera el bracket de playoffs con los clasificados.</p>
              <GenerarCalendarioButton ligaId={id} formato={liga.formato} fase="playoffs" label="Generar playoffs" />
            </div>
          )}
        </>
      )}

      {/* Resultados */}
      {calGenerado && (
        <div className="mb-4">
          <Link
            href={`/ligas/${id}/admin/partidos`}
            className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 hover:border-outline transition-colors"
          >
            <div>
              <div className="text-[13px] font-medium text-on-surface">Cargar resultados</div>
              <div className="text-[11px] text-on-surface-variant mt-0.5">
                {pendientes > 0 ? `${pendientes} partido${pendientes !== 1 ? 's' : ''} pendiente${pendientes !== 1 ? 's' : ''}` : 'Todos completados'}
              </div>
            </div>
            {pendientes > 0 && (
              <span className="ml-2 bg-accent text-on-accent text-[11px] font-bold px-2 py-0.5 rounded-full">{pendientes}</span>
            )}
          </Link>
        </div>
      )}

      {/* Equipos */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-3">Equipos</div>
        <AdminEquiposPanel
          ligaId={id}
          ligaEquipos={ligaEquipos}
          formato={liga.formato}
          estadoLiga={liga.estado}
          maxEquipos={liga.max_equipos}
        />
      </div>
    </div>
  );
}
