'use client';

import Link from 'next/link';
import type { TeamRankingStat } from './types';

interface Props {
  stats: TeamRankingStat[];
}

const MEDAL = {
  gold:   { text: 'var(--medal-gold)',   bg: 'var(--medal-gold-bg)',   border: 'var(--medal-gold-border)'   },
  silver: { text: 'var(--medal-silver)', bg: 'var(--medal-silver-bg)', border: 'var(--medal-silver-border)' },
  bronze: { text: 'var(--medal-bronze)', bg: 'var(--medal-bronze-bg)', border: 'var(--medal-bronze-border)' },
};

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀',
  futbol:     '⚽',
  voleibol:   '🏐',
  tenis:      '🎾',
  padel:      '🏓',
};

function TeamAvatar({ team, size }: { team: TeamRankingStat; size: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-14 h-14 text-[20px]' : 'w-12 h-12 text-[18px]';
  const initials = team.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div
      className={`${dim} rounded-xl flex items-center justify-center font-bold border-2 flex-shrink-0`}
      style={{
        background: `${team.color}20`,
        borderColor: size === 'lg' ? team.color : `${team.color}60`,
        color: team.color,
        boxShadow: size === 'lg' ? `0 0 20px ${team.color}40` : undefined,
      }}
    >
      {initials}
    </div>
  );
}

export function TeamRankingView({ stats }: Props) {
  if (stats.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="text-[32px] mb-3">🏟️</div>
        <div className="text-[13px] text-on-surface font-medium mb-1">Sin equipos en este filtro</div>
        <div className="text-[11px] text-outline">Prueba seleccionando otra ciudad.</div>
      </div>
    );
  }

  return (
    <>
      {/* Podio top 3 */}
      {stats.length >= 1 && (
        <div className="px-4 sm:px-6 pt-6 pb-2">
          <div className="flex items-end justify-center gap-2 sm:gap-3">

            {/* 2do */}
            {stats[1] && (
              <Link href={`/equipos/${stats[1].id}`} className="flex flex-col items-center gap-2 flex-1 hover:opacity-90 transition-opacity">
                <TeamAvatar team={stats[1]} size="sm" />
                <div className="text-[11px] font-semibold text-on-surface text-center truncate w-full px-1">{stats[1].nombre}</div>
                {stats[1].ciudad && <div className="text-[9px] text-outline">📍 {stats[1].ciudad}</div>}
                <div className="text-[10px]" style={{ color: MEDAL.silver.text }}>{stats[1].puntos} pts</div>
                <div
                  className="w-full h-14 rounded-t-lg flex items-center justify-center"
                  style={{ background: MEDAL.silver.bg, border: `1px solid ${MEDAL.silver.border}` }}
                >
                  <span className="text-[16px] font-bold" style={{ color: MEDAL.silver.text }}>2</span>
                </div>
              </Link>
            )}

            {/* 1ro */}
            <Link href={`/equipos/${stats[0].id}`} className="flex flex-col items-center gap-2 flex-1 hover:opacity-90 transition-opacity">
              <div className="text-[18px]">👑</div>
              <TeamAvatar team={stats[0]} size="lg" />
              <div className="text-[12px] font-bold text-on-surface text-center truncate w-full px-1">{stats[0].nombre}</div>
              {stats[0].ciudad && <div className="text-[9px] text-outline">📍 {stats[0].ciudad}</div>}
              <div className="text-[11px] font-semibold" style={{ color: MEDAL.gold.text }}>{stats[0].puntos} pts</div>
              <div
                className="w-full h-20 rounded-t-lg flex items-center justify-center"
                style={{ background: MEDAL.gold.bg, border: `1px solid ${MEDAL.gold.border}` }}
              >
                <span className="text-[20px] font-bold" style={{ color: MEDAL.gold.text }}>1</span>
              </div>
            </Link>

            {/* 3ro */}
            {stats[2] && (
              <Link href={`/equipos/${stats[2].id}`} className="flex flex-col items-center gap-2 flex-1 hover:opacity-90 transition-opacity">
                <TeamAvatar team={stats[2]} size="sm" />
                <div className="text-[11px] font-semibold text-on-surface text-center truncate w-full px-1">{stats[2].nombre}</div>
                {stats[2].ciudad && <div className="text-[9px] text-outline">📍 {stats[2].ciudad}</div>}
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

      {/* Cómo se calculan los puntos */}
      <div className="px-4 sm:px-6 py-2">
        <div className="flex items-center gap-3 text-[9px] text-outline bg-surface-container rounded-lg px-3 py-2 flex-wrap">
          <span className="font-semibold uppercase tracking-wider">Puntos:</span>
          <span>👑 Cancha King = <strong className="text-on-surface-variant">100 pts</strong></span>
          <span>⚔️ Victoria = <strong className="text-on-surface-variant">10 pts</strong></span>
        </div>
      </div>

      {/* Lista completa */}
      <div className="px-4 pb-6">
        {stats.map((team, idx) => (
          <Link
            key={team.id}
            href={`/equipos/${team.id}`}
            className="flex items-center gap-3 px-3 py-3 rounded-xl mb-1 hover:bg-surface-container-low transition-colors"
          >
            {/* Posición */}
            <div
              className="w-6 text-center text-[12px] font-bold flex-shrink-0"
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
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold flex-shrink-0"
              style={{ background: `${team.color}20`, color: team.color }}
            >
              {team.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[12px] font-semibold text-on-surface truncate">{team.nombre}</span>
                {team.deporte && (
                  <span className="text-[11px]">{DEPORTE_EMOJI[team.deporte] ?? ''}</span>
                )}
              </div>
              <div className="text-[10px] text-outline mt-0.5 flex items-center gap-1.5 flex-wrap">
                {team.ciudad && <span>📍 {team.ciudad}</span>}
                {team.ciudad && <span>·</span>}
                <span>{team.miembros} miembros</span>
                {team.totalVictorias + team.totalDerrotas > 0 && (
                  <>
                    <span>·</span>
                    <span>{team.winRate}% WR</span>
                  </>
                )}
              </div>
            </div>

            {/* Stats columnas */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Canchas king */}
              <div className="text-center hidden sm:block">
                <div className="text-[11px] font-semibold" style={{ color: MEDAL.gold.text }}>{team.kingCourts}</div>
                <div className="text-[9px] text-outline">👑</div>
              </div>
              {/* V/D */}
              <div className="text-center">
                <div className="text-[11px] font-semibold text-status-libre">{team.totalVictorias}W</div>
                <div className="text-[9px] text-status-rival">{team.totalDerrotas}L</div>
              </div>
              {/* Puntos */}
              <div className="text-right min-w-[36px]">
                <div
                  className="text-[13px] font-bold"
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
      </div>
    </>
  );
}
