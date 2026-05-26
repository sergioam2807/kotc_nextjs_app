import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const TEMA_LABELS: Record<string, string> = {
  street:      '🟥 Street',
  competitivo: '🟦 Competitivo',
  summer:      '🟨 Summer',
  nightball:   '⬛ Nightball',
  playoffs:    '🟪 Playoffs',
  underground: '🟩 Underground',
};

export default async function AdminTemporadasPage() {
  const supabase = await createClient();

  const { data: temporadas } = await supabase
    .from('temporadas')
    .select('id, nombre, descripcion, slogan, deporte, deporte_filter, inicio, fin, activa, numero, color, tema, emoji')
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
    slogan?: string | null;
    deporte?: string | null;
    deporte_filter?: string[] | null;
    inicio: string;
    fin: string;
    activa: boolean;
    numero?: number | null;
    color?: string | null;
    tema?: string | null;
    emoji?: string | null;
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

  const seasonColor = temporada.color ?? (isActiva ? 'var(--color-accent)' : undefined);

  return (
    <Link
      href={`/admin/temporadas/${temporada.id}`}
      className="block rounded-xl overflow-hidden border transition-colors hover:border-outline"
      style={{
        borderColor: isActiva && seasonColor ? `${seasonColor}50` : undefined,
        background: isActiva && seasonColor ? `${seasonColor}08` : undefined,
      }}
    >
      {/* Color bar top */}
      {seasonColor && (
        <div className="h-1" style={{ background: seasonColor }} />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Numero + Emoji + Nombre */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {temporada.emoji && (
                <span className="text-[16px]">{temporada.emoji}</span>
              )}
              <span className="text-[14px] font-bold text-on-surface truncate">
                {temporada.numero && (
                  <span
                    className="text-[11px] font-normal mr-1"
                    style={{ color: seasonColor ?? undefined }}
                  >
                    T{String(temporada.numero).padStart(2, '0')} ·{' '}
                  </span>
                )}
                {temporada.nombre}
              </span>
              {isActiva && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
                  style={{
                    background: seasonColor ? `${seasonColor}20` : 'var(--color-accent)/15',
                    color: seasonColor ?? 'var(--color-accent)',
                    border: `1px solid ${seasonColor ? `${seasonColor}40` : 'var(--color-accent)/30'}`,
                  }}
                >
                  Activa
                </span>
              )}
            </div>

            {/* Slogan */}
            {temporada.slogan && (
              <p
                className="text-[11px] mb-1 italic line-clamp-1"
                style={{ color: seasonColor ? `${seasonColor}cc` : undefined }}
              >
                "{temporada.slogan}"
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-outline">
              <span>
                {inicioDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' — '}
                {finDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span>·</span>
              <span>{deporteLabel}</span>
              {temporada.tema && (
                <>
                  <span>·</span>
                  <span>{TEMA_LABELS[temporada.tema] ?? temporada.tema}</span>
                </>
              )}
              {isActiva && diasRestantes > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: seasonColor ?? undefined }}>{diasRestantes}d restantes</span>
                </>
              )}
            </div>
          </div>
          <span className="text-outline text-[16px] ml-3">›</span>
        </div>
      </div>
    </Link>
  );
}
