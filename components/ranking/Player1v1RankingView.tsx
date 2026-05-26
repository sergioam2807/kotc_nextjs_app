import type { Player1v1Stat } from './types';
import { nombreNivel } from '@/lib/levels';

interface Props {
  stats: Player1v1Stat[];
  currentUserId: string | null;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function Player1v1RankingView({ stats, currentUserId }: Props) {
  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="text-[32px] mb-3">⚔️</div>
        <div className="text-[15px] font-semibold text-on-surface mb-1">Sin datos 1v1 aún</div>
        <p className="text-[13px] text-on-surface-variant max-w-xs">
          Desafía a otros jugadores en duelos 1v1 para aparecer en el ranking.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="text-[11px] text-outline mb-3">
        Clasificados por puntos (3 pts victoria · el mejor historial define desempates)
      </div>

      <div className="space-y-2">
        {stats.map((p, idx) => {
          const pos = idx + 1;
          const medal = MEDAL[pos];
          const isMe = p.jugador_id === currentUserId;
          const totalPartidos = p.victorias + p.derrotas;
          const winRate = totalPartidos > 0
            ? Math.round((p.victorias / totalPartidos) * 100)
            : 0;
          const iniciales = p.displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

          return (
            <div
              key={p.jugador_id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                isMe
                  ? 'bg-accent/8 border-accent/30'
                  : 'bg-surface-container-low border-outline-variant'
              }`}
            >
              {/* Position */}
              <div className="w-7 text-center flex-shrink-0">
                {medal ? (
                  <span className="text-[18px]">{medal}</span>
                ) : (
                  <span className="text-[13px] font-semibold text-on-surface-variant">{pos}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.avatarUrl}
                    alt={p.displayName}
                    className="w-9 h-9 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-[11px] font-bold">
                    {iniciales}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] font-semibold truncate ${isMe ? 'text-accent' : 'text-on-surface'}`}>
                  {p.displayName}
                  {isMe && <span className="text-[10px] text-accent/70 ml-1">(tú)</span>}
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  Nv.{p.nivel} {nombreNivel(p.nivel)}
                  {p.equipoNombre && (
                    <span
                      className="ml-1.5"
                      style={{ color: p.equipoColor ?? undefined }}
                    >
                      · {p.equipoNombre}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="text-right flex-shrink-0">
                <div className="text-[15px] font-bold text-on-surface">{p.puntos} pts</div>
                <div className="text-[10px] text-on-surface-variant">
                  {p.victorias}V–{p.derrotas}D
                  {totalPartidos > 0 && <span className="ml-1 text-outline">({winRate}%)</span>}
                </div>
              </div>

              {/* Racha */}
              {p.racha_actual >= 2 && (
                <div className="flex-shrink-0 text-[10px] font-semibold text-orange-500 bg-orange-500/10 rounded-full px-2 py-0.5">
                  🔥{p.racha_actual}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
