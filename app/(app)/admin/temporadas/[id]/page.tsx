import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { TemporadaAdminActions } from '@/components/admin/TemporadaAdminActions';

const TEMA_LABELS: Record<string, string> = {
  street:      '🟥 Street / Urbano',
  competitivo: '🟦 Competitivo',
  summer:      '🟨 Summer Vibes',
  nightball:   '⬛ Nightball',
  playoffs:    '🟪 Playoffs',
  underground: '🟩 Underground Courts',
};

export default async function TemporadaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, nombre, descripcion, slogan, deporte, deporte_filter, inicio, fin, activa, created_at, numero, color, tema, emoji')
    .eq('id', id)
    .maybeSingle();

  if (!temporada) notFound();

  // Stats de la temporada
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

  const seasonColor = (temporada as { color?: string | null }).color ?? null;

  return (
    <div className="max-w-lg">
      {/* Hero banner */}
      <div
        className="rounded-2xl overflow-hidden mb-5"
        style={{
          background: seasonColor
            ? `linear-gradient(135deg, ${seasonColor}22 0%, ${seasonColor}08 100%)`
            : undefined,
          border: seasonColor ? `1px solid ${seasonColor}40` : '1px solid var(--color-outline-variant)',
        }}
      >
        {/* Color stripe */}
        {seasonColor && (
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${seasonColor}, ${seasonColor}60)` }} />
        )}

        <div className="p-5">
          {/* Numero + Emoji */}
          <div className="flex items-center gap-3 mb-3">
            {(temporada as { emoji?: string | null }).emoji && (
              <span className="text-[40px]">{(temporada as { emoji?: string | null }).emoji}</span>
            )}
            <div>
              {(temporada as { numero?: number | null }).numero && (
                <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: seasonColor ?? undefined }}>
                  Temporada {String((temporada as { numero?: number | null }).numero).padStart(2, '0')}
                </div>
              )}
              <h2 className="text-[22px] font-black text-on-surface leading-tight">{temporada.nombre}</h2>
            </div>
          </div>

          {/* Slogan */}
          {(temporada as { slogan?: string | null }).slogan && (
            <p
              className="text-[13px] italic mb-3 font-medium"
              style={{ color: seasonColor ? `${seasonColor}dd` : 'var(--color-on-surface-variant)' }}
            >
              "{(temporada as { slogan?: string | null }).slogan}"
            </p>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {temporada.activa && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: seasonColor ? `${seasonColor}25` : undefined,
                  color: seasonColor ?? undefined,
                  border: `1px solid ${seasonColor ? `${seasonColor}50` : 'transparent'}`,
                }}
              >
                ● Activa
              </span>
            )}
            {(temporada as { tema?: string | null }).tema && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-container text-on-surface-variant border border-outline-variant">
                {TEMA_LABELS[(temporada as { tema?: string | null }).tema!] ?? (temporada as { tema?: string | null }).tema}
              </span>
            )}
            {seasonColor && (
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-surface-container border border-outline-variant"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: seasonColor }}
                />
                <span className="text-on-surface-variant">{seasonColor}</span>
              </span>
            )}
          </div>
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

        {temporada.descripcion && (
          <p className="text-[11px] text-on-surface-variant border-t border-outline-variant pt-3 mb-3">
            {temporada.descripcion}
          </p>
        )}

        {temporada.activa && (
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-on-surface-variant">Progreso de la temporada</span>
              <span className="text-on-surface-variant">
                {diasRestantes > 0 ? `${diasRestantes}d restantes` : 'Finalizada'}
              </span>
            </div>
            <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progreso}%`,
                  background: seasonColor ?? 'var(--color-accent)',
                }}
              />
            </div>
            <div className="text-[10px] text-outline mt-1">{progreso}% completada</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 text-center">
          <div
            className="text-[22px] font-bold"
            style={{ color: seasonColor ?? 'var(--color-on-surface)' }}
          >
            {equiposCount ?? 0}
          </div>
          <div className="text-[10px] text-on-surface-variant">Equipos</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 text-center">
          <div
            className="text-[22px] font-bold"
            style={{ color: seasonColor ?? 'var(--color-on-surface)' }}
          >
            {desafiosCount ?? 0}
          </div>
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
