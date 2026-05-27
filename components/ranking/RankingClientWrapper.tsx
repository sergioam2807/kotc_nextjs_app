'use client';

import { useState, useMemo } from 'react';
import { TeamRankingView } from './TeamRankingView';
import { PlayerRankingView } from './PlayerRankingView';
import { Player1v1RankingView } from './Player1v1RankingView';
import type { TeamRankingStat, PlayerRankingStat, Player1v1Stat } from './types';

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

  // Regions available for the current tab (equipos + jugadores only — 1v1 has no region)
  const regionesDisponibles = useMemo(() => {
    const allItems = tab === 'equipos' ? teamStats : playerStats;
    const set = new Set<string>();
    (allItems as { region?: string | null }[]).forEach(t => { if (t.region) set.add(t.region); });
    return Array.from(set).sort();
  }, [teamStats, playerStats, tab]);

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

      {/* Región filter — equipos and jugadores tabs only */}
      {tab !== '1v1' && regionesDisponibles.length > 1 && (
        <div className="px-4 sm:px-6 pt-3 flex gap-1.5 flex-wrap flex-shrink-0">
          <button
            onClick={() => setRegionFiltro('')}
            className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
              regionFiltro === ''
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant'
            }`}
          >
            Todas las regiones
          </button>
          {regionesDisponibles.map(r => (
            <button
              key={r}
              onClick={() => setRegionFiltro(regionFiltro === r ? '' : r)}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                regionFiltro === r
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant'
              }`}
            >
              {r}
            </button>
          ))}
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
