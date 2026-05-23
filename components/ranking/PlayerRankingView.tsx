'use client';

import Link from 'next/link';
import type { PlayerRankingStat } from './types';

interface Props {
  stats: PlayerRankingStat[];
  currentUserId: string | null;
}

// Colores de medalla vía CSS variables — cambian automáticamente con el tema
// dark: gold=#ffe083, silver=#9aa8b8, bronze=#cd7f32
// light: gold=#ffe083, silver=#667484, bronze=#ad5f12 (WCAG AA corregidos)
const MEDAL = {
  gold:   { text: 'var(--medal-gold)',   bg: 'var(--medal-gold-bg)',   border: 'var(--medal-gold-border)'   },
  silver: { text: 'var(--medal-silver)', bg: 'var(--medal-silver-bg)', border: 'var(--medal-silver-border)' },
  bronze: { text: 'var(--medal-bronze)', bg: 'var(--medal-bronze-bg)', border: 'var(--medal-bronze-border)' },
};

function PlayerAvatar({ player, size }: { player: PlayerRankingStat; size: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-14 h-14 text-[20px]' : 'w-12 h-12 text-[18px]';
  return (
    <div className={`${dim} rounded-full overflow-hidden bg-surface-container-high flex-shrink-0 flex items-center justify-center`}>
      {player.avatarUrl ? (
        <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="font-bold text-on-surface-variant">{player.displayName[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}

export function PlayerRankingView({ stats, currentUserId }: Props) {
  return (
    <>
      {stats.length >= 1 && (
        <div className="px-4 sm:px-6 pt-6 pb-2">
          <div className="flex items-end justify-center gap-2 sm:gap-3">
            {/* 2nd place */}
            {stats[1] && (
              <Link href={`/jugadores/${stats[1].id}`} className="flex flex-col items-center gap-2 flex-1 hover:opacity-80 transition-opacity">
                <PlayerAvatar player={stats[1]} size="sm" />
                <div className="text-[11px] font-semibold text-on-surface text-center truncate w-full px-1">{stats[1].displayName}</div>
                <div className="text-[9px] text-on-surface-variant bg-surface-container rounded-sm px-1.5 py-0.5">Lv{stats[1].nivel}</div>
                <div className="text-[10px]" style={{ color: MEDAL.silver.text }}>{stats[1].xp.toLocaleString()} XP</div>
                <div
                  className="w-full h-14 rounded-t-lg flex items-center justify-center"
                  style={{ background: MEDAL.silver.bg, border: `1px solid ${MEDAL.silver.border}` }}
                >
                  <span className="text-[16px] font-bold" style={{ color: MEDAL.silver.text }}>2</span>
                </div>
              </Link>
            )}

            {/* 1st place */}
            <Link href={`/jugadores/${stats[0].id}`} className="flex flex-col items-center gap-2 flex-1 hover:opacity-80 transition-opacity">
              <div className="text-[18px]">👑</div>
              <PlayerAvatar player={stats[0]} size="lg" />
              <div className="text-[12px] font-bold text-on-surface text-center truncate w-full px-1">{stats[0].displayName}</div>
              <div className="text-[9px] text-on-surface-variant bg-surface-container rounded-sm px-1.5 py-0.5">Lv{stats[0].nivel}</div>
              <div className="text-[11px] font-semibold" style={{ color: MEDAL.gold.text }}>{stats[0].xp.toLocaleString()} XP</div>
              <div
                className="w-full h-20 rounded-t-lg flex items-center justify-center"
                style={{ background: MEDAL.gold.bg, border: `1px solid ${MEDAL.gold.border}` }}
              >
                <span className="text-[20px] font-bold" style={{ color: MEDAL.gold.text }}>1</span>
              </div>
            </Link>

            {/* 3rd place */}
            {stats[2] && (
              <Link href={`/jugadores/${stats[2].id}`} className="flex flex-col items-center gap-2 flex-1 hover:opacity-80 transition-opacity">
                <PlayerAvatar player={stats[2]} size="sm" />
                <div className="text-[11px] font-semibold text-on-surface text-center truncate w-full px-1">{stats[2].displayName}</div>
                <div className="text-[9px] text-on-surface-variant bg-surface-container rounded-sm px-1.5 py-0.5">Lv{stats[2].nivel}</div>
                <div className="text-[10px]" style={{ color: MEDAL.bronze.text }}>{stats[2].xp.toLocaleString()} XP</div>
                <div
                  className="w-full h-10 rounded-t-lg flex items-center justify-center"
                  style={{ background: MEDAL.bronze.bg, border: `1px solid ${MEDAL.bronze.border}` }}
                >
                  <span className="text-[16px] font-bold" style={{ color: MEDAL.bronze.text }}>3</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="px-4 pb-6">
        {stats.map((player, idx) => (
          <Link
            key={player.id}
            href={`/jugadores/${player.id}`}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-colors ${
              player.id === currentUserId
                ? 'bg-accent/10 border border-accent/20'
                : 'hover:bg-surface-container-low'
            }`}
          >
            {/* Rank */}
            <div className="w-6 text-center text-[12px] font-bold flex-shrink-0"
              style={{
                color: idx === 0 ? MEDAL.gold.text
                     : idx === 1 ? MEDAL.silver.text
                     : idx === 2 ? MEDAL.bronze.text
                     : undefined,
              }}
            >
              <span className={idx > 2 ? 'text-outline' : undefined}>{idx + 1}</span>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high flex-shrink-0 flex items-center justify-center">
              {player.avatarUrl ? (
                <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[12px] font-bold text-on-surface-variant">{player.displayName[0]?.toUpperCase()}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-on-surface truncate">{player.displayName}</span>
                {player.id === currentUserId && (
                  <span className="text-[9px] text-accent bg-accent/15 px-1 rounded-sm">tú</span>
                )}
              </div>
              {player.equipoNombre && (
                <div className="text-[10px] mt-0.5 truncate" style={{ color: player.equipoColor ?? undefined }}>
                  <span className={!player.equipoColor ? 'text-outline' : undefined}>
                    {player.equipoNombre}
                  </span>
                </div>
              )}
              {/* XP mini-bar */}
              <div className="w-full h-0.5 bg-outline-variant rounded-full mt-1">
                <div
                  className="h-full rounded-full bg-accent/40"
                  style={{ width: `${(player.xp % 1000) / 10}%` }}
                />
              </div>
            </div>

            {/* Level + XP */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="text-[10px] text-on-surface-variant bg-surface-container rounded-sm px-1.5 py-0.5">
                Lv{player.nivel}
              </div>
              <div className="text-right">
                <div className="text-[12px] font-bold"
                  style={{
                    color: idx === 0 ? MEDAL.gold.text
                         : idx === 1 ? MEDAL.silver.text
                         : idx === 2 ? MEDAL.bronze.text
                         : undefined,
                  }}
                >
                  <span className={idx > 2 ? 'text-on-surface-variant' : undefined}>
                    {player.xp.toLocaleString()}
                  </span>
                </div>
                <div className="text-[9px] text-outline">XP</div>
              </div>
            </div>
          </Link>
        ))}
        {stats.length === 0 && (
          <div className="text-outline text-[12px] text-center py-12">Sin jugadores registrados</div>
        )}
      </div>
    </>
  );
}
