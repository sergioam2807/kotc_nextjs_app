import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { TemporadaAdminActions } from '@/components/admin/TemporadaAdminActions';

export default async function TemporadaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, nombre, descripcion, deporte, deporte_filter, inicio, fin, activa, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!temporada) notFound();

  // Stats de la temporada (si está activa o fue activa)
  const [
    { count: equiposCount },
    { count: desafiosCount },
  ] = await Promise.all([
    supabase.from('equipos').select('*', { count: 'exact', head: true }),
    supabase.from('desafios').select('*', { count: 'exact', head: true }).eq('estado', 'completado'),
  ]);

  const inicioDate = new Date(temporada.inicio);
  const finDate = new Date(temporada.fin);
  const now = new Date();
  const diasRestantes = Math.ceil((finDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const diasTranscurridos = Math.floor((now.getTime() - inicioDate.getTime()) / (1000 * 60 * 60 * 24));
  const duracionTotal = Math.ceil((finDate.getTime() - inicioDate.getTime()) / (1000 * 60 * 60 * 24));
  const progreso = Math.max(0, Math.min(100, Math.round((diasTranscurridos / duracionTotal) * 100)));

  const deporteLabel = temporada.deporte_filter?.length
    ? temporada.deporte_filter.join(', ')
    : temporada.deporte
    ? temporada.deporte
    : 'Todos los deportes';

  return (
    <div className="max-w-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-[18px] font-bold text-on-surface">{temporada.nombre}</h2>
            {temporada.activa && (
              <span className="px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30 text-[9px] text-accent font-semibold uppercase tracking-wider">
                Activa
              </span>
            )}
          </div>
          {temporada.descripcion && (
            <p className="text-[12px] text-on-surface-variant">{temporada.descripcion}</p>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 text-[12px] mb-3">
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider mb-0.5 font-medium">Inicio</div>
            <div className="text-on-surface">
              {inicioDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider mb-0.5 font-medium">Fin</div>
            <div className="text-on-surface">
              {finDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider mb-0.5 font-medium">Deportes</div>
            <div className="text-on-surface capitalize">{deporteLabel}</div>
          </div>
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider mb-0.5 font-medium">Duración</div>
            <div className="text-on-surface">{duracionTotal} días</div>
          </div>
        </div>

        {temporada.activa && (
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-on-surface-variant">Progreso</span>
              <span className="text-on-surface-variant">
                {diasRestantes > 0 ? `${diasRestantes}d restantes` : 'Finalizada'}
              </span>
            </div>
            <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 text-center">
          <div className="text-[22px] font-bold text-on-surface">{equiposCount ?? 0}</div>
          <div className="text-[10px] text-on-surface-variant">Equipos</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 text-center">
          <div className="text-[22px] font-bold text-on-surface">{desafiosCount ?? 0}</div>
          <div className="text-[10px] text-on-surface-variant">Partidos jugados</div>
        </div>
      </div>

      {/* Actions — client component */}
      <TemporadaAdminActions
        temporadaId={temporada.id}
        nombre={temporada.nombre}
        isActiva={temporada.activa}
      />
    </div>
  );
}
