'use client';

import Link from 'next/link';
import type { TeamRankingStat } from './types';

interface Props {
  stats: TeamRankingStat[];
}

// Colores de medalla vía CSS variables — cambian automáticamente con el tema
// dark: gold=#ffe083, silver=#9aa8b8, bronze=#cd7f32
// light: gold=#ffe083, silver=#667484, bronze=#ad5f12 (WCAG AA corregidos)
const MEDAL = {
  gold:   { text: 'var(--medal-gold)',   bg: 'var(--medal-gold-bg)',   border: 'var(--medal-gold-border)'   },
  silver: { text: 'var(--medal-silver)', bg: 'var(--medal-silver-bg)', border: 'var(--medal-silver-border)' },
  bronze: { text: 'var(--medal-bronze)', bg: 'var(--medal-bronze-bg)', border: 'var(--medal-bronze-border)' },
};

export function TeamRankingView({ stats }: Props) {
  return (
    <>
      {stats.length >= 1 && (
        <div className="px-4 sm:px-6 pt-6 pb-2">
          <div className="flex items-end justify-center gap-2 sm:gap-3">
            {/* 2nd place */}
            {stats[1] && (
              <Link href={`/equipos/${stats[1].id}`} className="flex flex-col items-center gap-2 flex-1 hover:opacity-90 transition-opacity">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold border-2"
                  style={{ background: `${stats[1].color}20`, borderColor: `${stats[1].color}60`, color: stats[1].color }}
                >
                  {stats[1].nombre[0].toUpperCase()}
                </div>
                <div className="text-[11px] font-semibold text-on-surface text-center truncate w-full px-1">{stats[1].nombre}</div>
                <div className="text-[10px]" style={{ color: MEDAL.silver.text }}>{stats[1].puntos} pts</div>
                <div
                  className="w-full h-14 rounded-t-lg flex items-center justify-center"
                  style={{ background: MEDAL.silver.bg, border: `1px solid ${MEDAL.silver.border}` }}
                >
                  <span className="text-[16px] font-bold" style={{ color: MEDAL.silver.text }}>2</span>
                </div>
              </Link>
            )}

            {/* 1st place */}
            <Link href={`/equipos/${stats[0].id}`} className="flex flex-col items-center gap-2 flex-1 hover:opacity-90 transition-opacity">
              <div className="text-[18px]">👑</div>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-bold border-2"
                style={{
                  background: `${stats[0].color}20`,
                  borderColor: stats[0].color,
                  color: stats[0].color,
                  boxShadow: `0 0 20px ${stats[0].color}40`,
                }}
              >
                {stats[0].nombre[0].toUpperCase()}
              </div>
              <div className="text-[12px] font-bold text-on-surface text-center truncate w-full px-1">{stats[0].nombre}</div>
              <div className="text-[11px] font-semibold" style={{ color: MEDAL.gold.text }}>{stats[0].puntos} pts</div>
              <div
                className="w-full h-20 rounded-t-lg flex items-center justify-center"
                style={{ background: MEDAL.gold.bg, border: `1px solid ${MEDAL.gold.border}` }}
              >
                <span className="text-[20px] font-bold" style={{ color: MEDAL.gold.text }}>1</span>
              </div>
            </Link>

            {/* 3rd place */}
            {stats[2] && (
              <Link href={`/equipos/${stats[2].id}`} className="flex flex-col items-center gap-2 flex-1 hover:opacity-90 transition-opacity">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold border-2"
                  style={{ background: `${stats[2].color}20`, borderColor: `${stats[2].color}60`, color: stats[2].color }}
                >
                  {stats[2].nombre[0].toUpperCase()}
                </div>
                <div className="text-[11px] font-semibold text-on-surface text-center truncate w-full px-1">{stats[2].nombre}</div>
                <div className="text-[10px]" style={{ color: MEDAL.bronze.text }}>{stats[2].puntos} pts</div>
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
        {stats.map((team, idx) => (
          <Link
            key={team.id}
            href={`/equipos/${team.id}`}
            className="flex items-center gap-3 px-3 py-3 rounded-lg mb-1 hover:bg-surface-container-low transition-colors"
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
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
              style={{ background: `${team.color}20`, color: team.color }}
            >
              {team.nombre[0].toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-on-surface truncate">{team.nombre}</div>
              <div className="text-[10px] text-outline mt-0.5">
                {team.miembros} miembros · {team.winRate}% win rate
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="text-center">
                <div className="text-[11px] font-semibold" style={{ color: MEDAL.gold.text }}>{team.kingCourts}</div>
                <div className="text-[9px] text-outline">🏆</div>
              </div>
              <div className="text-center">
                <div className="text-[11px] font-semibold text-on-surface">{team.totalVictorias}W</div>
                <div className="text-[9px] text-outline">{team.totalDerrotas}L</div>
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
                  <span className={idx > 2 ? 'text-on-surface-variant' : undefined}>{team.puntos}</span>
                </div>
                <div className="text-[9px] text-outline">pts</div>
              </div>
            </div>
          </Link>
        ))}
        {stats.length === 0 && (
          <div className="text-outline text-[12px] text-center py-12">Sin equipos registrados</div>
        )}
      </div>
    </>
  );
}
