import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EventoAdminActions } from '@/components/admin/EventoAdminActions';

const TIPO_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  torneo_express:  { label: 'Torneo exprés',   emoji: '🏆', color: '#eab308' },
  bonus_xp:        { label: 'Bonus XP',        emoji: '⚡', color: '#a855f7' },
  cancha_especial: { label: 'Cancha especial', emoji: '📍', color: '#3b82f6' },
  nightball:       { label: 'Nightball',        emoji: '🌙', color: '#374151' },
  king_challenge:  { label: 'King Challenge',  emoji: '👑', color: '#ef4444' },
  reto_semanal:    { label: 'Reto semanal',    emoji: '🎯', color: '#22c55e' },
  otro:            { label: 'Evento especial', emoji: '🎉', color: '#f97316' },
};

export default async function EventoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento } = await supabase
    .from('eventos')
    .select('id, nombre, descripcion, tipo, fecha_inicio, fecha_fin, activo, color, emoji, premio, reglas, bonus_xp_mult, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!evento) notFound();

  const info = TIPO_INFO[evento.tipo] ?? TIPO_INFO.otro;
  const displayColor = evento.color ?? info.color;
  const displayEmoji = evento.emoji ?? info.emoji;

  const now = Date.now();
  const inicio = new Date(evento.fecha_inicio);
  const fin    = new Date(evento.fecha_fin);
  const vigente = evento.activo && inicio.getTime() <= now && now <= fin.getTime();
  const proximo = evento.activo && inicio.getTime() > now;
  const duracionMs = fin.getTime() - inicio.getTime();
  const transcurridoMs = Math.max(0, now - inicio.getTime());
  const progreso = vigente ? Math.min(100, Math.round((transcurridoMs / duracionMs) * 100)) : 0;

  const diasRestantes = Math.max(0, Math.ceil((fin.getTime() - now) / 86400000));

  return (
    <div className="max-w-lg">
      {/* Hero */}
      <div
        className="rounded-2xl overflow-hidden mb-5"
        style={{
          background: `linear-gradient(135deg, ${displayColor}20 0%, ${displayColor}08 100%)`,
          border: `1px solid ${displayColor}40`,
        }}
      >
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${displayColor}, ${displayColor}50)` }} />
        <div className="p-5">
          <div className="flex items-start gap-4">
            <span className="text-[44px] leading-none">{displayEmoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                  style={{ background: `${displayColor}25`, color: displayColor }}
                >
                  {info.label}
                </span>
                {vigente && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-status-libre/20 text-status-libre">
                    ● En curso
                  </span>
                )}
                {proximo && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-surface-container text-on-surface-variant">
                    Próximo
                  </span>
                )}
                {!evento.activo && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-surface-container text-outline">
                    Inactivo
                  </span>
                )}
              </div>
              <h2 className="text-[20px] font-black text-on-surface leading-tight">{evento.nombre}</h2>
            </div>
          </div>

          {evento.descripcion && (
            <p className="text-[12px] text-on-surface-variant mt-3">{evento.descripcion}</p>
          )}

          {/* Progress bar */}
          {vigente && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-outline mb-1">
                <span>Progreso</span>
                <span>{diasRestantes > 0 ? `${diasRestantes}d restantes` : 'Último día'}</span>
              </div>
              <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${progreso}%`, background: displayColor }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider mb-0.5 font-medium">Inicio</div>
            <div className="text-on-surface">
              {inicio.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
              <br />
              <span className="text-[11px] text-on-surface-variant">
                {inicio.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider mb-0.5 font-medium">Fin</div>
            <div className="text-on-surface">
              {fin.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
              <br />
              <span className="text-[11px] text-on-surface-variant">
                {fin.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {evento.premio && (
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider mb-0.5 font-medium">Premio / Beneficio</div>
            <div className="text-[12px] text-on-surface">🎁 {evento.premio}</div>
          </div>
        )}

        {evento.bonus_xp_mult && evento.bonus_xp_mult > 1 && (
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider mb-0.5 font-medium">Bonus XP</div>
            <div className="text-[12px]" style={{ color: displayColor }}>⚡ ×{evento.bonus_xp_mult} XP por partido</div>
          </div>
        )}

        {evento.reglas && (
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider mb-0.5 font-medium">Reglas</div>
            <p className="text-[12px] text-on-surface-variant whitespace-pre-line">{evento.reglas}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <EventoAdminActions
        eventoId={evento.id}
        nombre={evento.nombre}
        isActivo={evento.activo}
      />
    </div>
  );
}
