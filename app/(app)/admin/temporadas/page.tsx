import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminTemporadasPage() {
  const supabase = await createClient();

  const { data: temporadas } = await supabase
    .from('temporadas')
    .select('id, nombre, descripcion, deporte, deporte_filter, inicio, fin, activa')
    .order('created_at', { ascending: false });

  const lista = temporadas ?? [];
  const activa = lista.find(t => t.activa);
  const historial = lista.filter(t => !t.activa);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[16px] font-semibold text-on-surface">Temporadas</h2>
        <Link
          href="/admin/temporadas/nueva"
          className="px-3 py-1.5 rounded-lg bg-accent text-on-accent text-[12px] font-medium hover:brightness-90 transition-all"
        >
          + Nueva temporada
        </Link>
      </div>

      {/* Temporada activa */}
      {activa ? (
        <div className="mb-5">
          <div className="text-[10px] text-outline uppercase tracking-wider mb-2 font-medium">Activa ahora</div>
          <TemporadaCard temporada={activa} isActiva />
        </div>
      ) : (
        <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-xl p-6 text-center mb-5">
          <div className="text-[28px] mb-2">🏆</div>
          <p className="text-[13px] text-on-surface font-medium mb-1">Sin temporada activa</p>
          <p className="text-[11px] text-on-surface-variant mb-3">
            Crea y activa una temporada para habilitar el ranking competitivo.
          </p>
          <Link
            href="/admin/temporadas/nueva"
            className="inline-flex px-4 py-2 rounded-lg bg-accent text-on-accent text-[12px] font-medium hover:brightness-90 transition-all"
          >
            Crear primera temporada
          </Link>
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div>
          <div className="text-[10px] text-outline uppercase tracking-wider mb-2 font-medium">Historial</div>
          <div className="flex flex-col gap-3">
            {historial.map(t => (
              <TemporadaCard key={t.id} temporada={t} isActiva={false} />
            ))}
          </div>
        </div>
      )}

      {lista.length === 0 && (
        <p className="text-[12px] text-on-surface-variant text-center py-8">
          No hay temporadas registradas aún.
        </p>
      )}
    </div>
  );
}

function TemporadaCard({
  temporada,
  isActiva,
}: {
  temporada: {
    id: string;
    nombre: string;
    descripcion?: string | null;
    deporte?: string | null;
    deporte_filter?: string[] | null;
    inicio: string;
    fin: string;
    activa: boolean;
  };
  isActiva: boolean;
}) {
  const inicioDate = new Date(temporada.inicio);
  const finDate = new Date(temporada.fin);
  const now = new Date();
  const diasRestantes = Math.ceil((finDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const deporteLabel = temporada.deporte_filter?.length
    ? temporada.deporte_filter.join(', ')
    : temporada.deporte
    ? temporada.deporte
    : 'Todos los deportes';

  return (
    <Link
      href={`/admin/temporadas/${temporada.id}`}
      className={`block rounded-xl p-4 border transition-colors hover:border-outline ${
        isActiva
          ? 'bg-accent/8 border-accent/30'
          : 'bg-surface-container-low border-outline-variant'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[14px] font-semibold text-on-surface truncate">{temporada.nombre}</span>
            {isActiva && (
              <span className="px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30 text-[9px] text-accent font-semibold uppercase tracking-wider">
                Activa
              </span>
            )}
          </div>
          {temporada.descripcion && (
            <p className="text-[11px] text-on-surface-variant mb-1 line-clamp-1">{temporada.descripcion}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-outline">
            <span>
              {inicioDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' — '}
              {finDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span>·</span>
            <span>{deporteLabel}</span>
            {isActiva && diasRestantes > 0 && (
              <>
                <span>·</span>
                <span className="text-accent">{diasRestantes}d restantes</span>
              </>
            )}
          </div>
        </div>
        <span className="text-outline text-[16px] ml-3">›</span>
      </div>
    </Link>
  );
}
