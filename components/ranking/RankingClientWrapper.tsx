'use client';

import { useState, useMemo } from 'react';
import { TeamRankingView } from './TeamRankingView';
import { PlayerRankingView } from './PlayerRankingView';
import { Player1v1RankingView } from './Player1v1RankingView';
import type { TeamRankingStat, PlayerRankingStat, Player1v1Stat } from './types';
import { REGIONES_CHILE } from '@/lib/chile-geo';

interface Props {
  teamStats: TeamRankingStat[];
  playerStats: PlayerRankingStat[];
  stats1v1: Player1v1Stat[];
  currentUserId: string | null;
  temporadaNombre: string | null;
  temporadaColor?: string | null;
  temporadaEmoji?: string | null;
  temporadaNumero?: number | null;
}

export default function RankingClientWrapper({ teamStats, playerStats, stats1v1, currentUserId, temporadaNombre, temporadaColor, temporadaEmoji, temporadaNumero }: Props) {
  const [tab, setTab] = useState<'equipos' | 'jugadores' | '1v1'>('equipos');
  const [regionFiltro, setRegionFiltro] = useState('');

  // All 16 Chilean regions — always visible so users can filter even before data is populated
  const todasLasRegiones = REGIONES_CHILE.map(r => r.nombreCorto);

  const teamStatsFiltrados = useMemo(() => {
    if (!regionFiltro) return teamStats;
    return teamStats.filter(t => t.region === regionFiltro);
  }, [teamStats, regionFiltro]);

  const playerStatsFiltrados = useMemo(() => {
    if (!regionFiltro) return playerStats;
    return playerStats.filter(p => p.region === regionFiltro);
  }, [playerStats, regionFiltro]);

  function handleTabChange(newTab: 'equipos' | 'jugadores' | '1v1') {
    setTab(newTab);
    setRegionFiltro(''); // reset region filter on tab change
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-outline-variant flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-bold text-on-surface">Ranking</div>
            <div className="text-[11px] text-outline mt-0.5">Clasificación territorial por canchas conquistadas</div>
          </div>
          {temporadaNombre && (
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 flex-shrink-0"
              style={{
                background: temporadaColor ? `${temporadaColor}15` : 'var(--color-accent)/10',
                border: `1px solid ${temporadaColor ? `${temporadaColor}35` : 'var(--color-accent)/25'}`,
              }}
            >
              <span className="text-[12px]">{temporadaEmoji ?? '🏆'}</span>
              <div className="max-w-[120px] truncate">
                {temporadaNumero && (
                  <span
                    className="text-[9px] font-semibold mr-0.5"
                    style={{ color: temporadaColor ?? 'var(--color-accent)' }}
                  >
                    T{String(temporadaNumero).padStart(2, '0')} ·{' '}
                  </span>
                )}
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: temporadaColor ?? 'var(--color-accent)' }}
                >
                  {temporadaNombre}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 pt-4 flex gap-1 flex-shrink-0">
        <button
          onClick={() => handleTabChange('equipos')}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors min-h-[40px] ${tab === 'equipos' ? 'bg-accent/15 text-accent' : 'text-outline hover:text-on-surface-variant'}`}
        >
          Equipos
        </button>
        <button
          onClick={() => handleTabChange('jugadores')}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors min-h-[40px] ${tab === 'jugadores' ? 'bg-accent/15 text-accent' : 'text-outline hover:text-on-surface-variant'}`}
        >
          Jugadores
        </button>
        <button
          onClick={() => handleTabChange('1v1')}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors min-h-[40px] ${tab === '1v1' ? 'bg-accent/15 text-accent' : 'text-outline hover:text-on-surface-variant'}`}
        >
          ⚔️ 1v1
        </button>
      </div>

      {/* Región filter — select dropdown, always visible on equipos/jugadores tabs */}
      {tab !== '1v1' && (
        <div className="px-4 sm:px-6 pt-3 flex items-center gap-2 flex-shrink-0">
          <select
            value={regionFiltro}
            onChange={e => setRegionFiltro(e.target.value)}
            className={`h-8 rounded-full border text-[10px] font-semibold px-3 outline-none transition-colors ${
              regionFiltro
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-surface-container border-outline-variant text-outline'
            }`}
          >
            <option value="">📍 Todas las regiones</option>
            {todasLasRegiones.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {regionFiltro && (
            <button
              onClick={() => setRegionFiltro('')}
              className="text-[10px] text-outline hover:text-on-surface-variant transition-colors"
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      )}

      <div className="flex-1">
        {tab === 'equipos' ? (
          <TeamRankingView stats={teamStatsFiltrados} />
        ) : tab === 'jugadores' ? (
          <PlayerRankingView stats={playerStatsFiltrados} currentUserId={currentUserId} />
        ) : (
          <Player1v1RankingView stats={stats1v1} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}
