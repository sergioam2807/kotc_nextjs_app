import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const TIPO_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  torneo_express: { label: 'Torneo exprés',    emoji: '🏆', color: '#eab308' },
  bonus_xp:       { label: 'Bonus XP',         emoji: '⚡', color: '#a855f7' },
  cancha_especial:{ label: 'Cancha especial',   emoji: '📍', color: '#3b82f6' },
  nightball:      { label: 'Nightball',         emoji: '🌙', color: '#374151' },
  king_challenge: { label: 'King Challenge',    emoji: '👑', color: '#ef4444' },
  reto_semanal:   { label: 'Reto semanal',      emoji: '🎯', color: '#22c55e' },
  otro:           { label: 'Evento especial',   emoji: '🎉', color: '#f97316' },
};

function formatRange(inicio: string, fin: string) {
  const i = new Date(inicio);
  const f = new Date(fin);
  return `${i.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} → ${f.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function isVigente(inicio: string, fin: string) {
  const now = Date.now();
  return new Date(inicio).getTime() <= now && now <= new Date(fin).getTime();
}

export default async function AdminEventosPage() {
  const supabase = await createClient();

  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, nombre, descripcion, tipo, fecha_inicio, fecha_fin, activo, color, emoji, premio, bonus_xp_mult')
    .order('fecha_inicio', { ascending: false });

  const lista = eventos ?? [];
  const vigentes  = lista.filter(e => e.activo && isVigente(e.fecha_inicio, e.fecha_fin));
  const proximos  = lista.filter(e => e.activo && new Date(e.fecha_inicio).getTime() > Date.now());
  const pasados   = lista.filter(e => !e.activo || new Date(e.fecha_fin).getTime() < Date.now());

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[16px] font-semibold text-on-surface">Eventos especiales</h2>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Torneos exprés, bonus XP, retos semanales y más — aparecen en el dashboard de todos.
          </p>
        </div>
        <Link
          href="/admin/eventos/nuevo"
          className="px-3 py-1.5 rounded-lg bg-accent text-on-accent text-[12px] font-medium hover:brightness-90 transition-all flex-shrink-0"
        >
          + Nuevo evento
        </Link>
      </div>

      {lista.length === 0 && (
        <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-xl p-8 text-center">
          <div className="text-[36px] mb-3">🎉</div>
          <p className="text-[13px] text-on-surface font-medium mb-1">Sin eventos creados</p>
          <p className="text-[11px] text-on-surface-variant mb-4">
            Crea torneos, retos y bonus para mantener activa la comunidad.
          </p>
          <Link href="/admin/eventos/nuevo" className="inline-flex px-4 py-2 rounded-lg bg-accent text-on-accent text-[12px] font-medium hover:brightness-90 transition-all">
            Crear primer evento
          </Link>
        </div>
      )}

      {vigentes.length > 0 && (
        <Section title="En curso ahora" items={vigentes} />
      )}
      {proximos.length > 0 && (
        <Section title="Próximos" items={proximos} />
      )}
      {pasados.length > 0 && (
        <Section title="Historial" items={pasados} muted />
      )}
    </div>
  );
}

type Evento = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  color?: string | null;
  emoji?: string | null;
  premio?: string | null;
  bonus_xp_mult?: number | null;
};

function Section({ title, items, muted }: { title: string; items: Evento[]; muted?: boolean }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] text-outline uppercase tracking-wider mb-2 font-medium">{title}</div>
      <div className="flex flex-col gap-2">
        {items.map(e => <EventoCard key={e.id} evento={e} muted={muted} />)}
      </div>
    </div>
  );
}

function EventoCard({ evento, muted }: { evento: Evento; muted?: boolean }) {
  const info = TIPO_INFO[evento.tipo] ?? TIPO_INFO.otro;
  const displayColor = evento.color ?? info.color;
  const displayEmoji = evento.emoji ?? info.emoji;

  return (
    <Link
      href={`/admin/eventos/${evento.id}`}
      className="flex items-center gap-3 rounded-xl overflow-hidden border transition-colors hover:border-outline"
      style={{
        borderColor: !muted ? `${displayColor}40` : undefined,
        background: !muted ? `${displayColor}06` : undefined,
        opacity: muted ? 0.65 : 1,
      }}
    >
      {/* Left color strip */}
      <div className="w-1 self-stretch flex-shrink-0" style={{ background: displayColor }} />

      {/* Emoji */}
      <div className="text-[24px] py-3 flex-shrink-0">{displayEmoji}</div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-3">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-[13px] font-bold text-on-surface truncate">{evento.nombre}</span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider flex-shrink-0"
            style={{ background: `${displayColor}20`, color: displayColor }}
          >
            {info.label}
          </span>
          {evento.bonus_xp_mult && evento.bonus_xp_mult > 1 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant flex-shrink-0">
              ⚡ ×{evento.bonus_xp_mult} XP
            </span>
          )}
        </div>
        <div className="text-[11px] text-outline">{formatRange(evento.fecha_inicio, evento.fecha_fin)}</div>
        {evento.premio && (
          <div className="text-[10px] text-on-surface-variant mt-0.5 truncate">🎁 {evento.premio}</div>
        )}
      </div>

      <span className="text-outline text-[16px] pr-3 flex-shrink-0">›</span>
    </Link>
  );
}
