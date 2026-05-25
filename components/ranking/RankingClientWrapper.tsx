'use client';

import { useState, useMemo } from 'react';
import { TeamRankingView } from './TeamRankingView';
import { PlayerRankingView } from './PlayerRankingView';
import type { TeamRankingStat, PlayerRankingStat } from './types';

interface Props {
  teamStats: TeamRankingStat[];
  playerStats: PlayerRankingStat[];
  currentUserId: string | null;
  temporadaNombre: string | null;
}

export default function RankingClientWrapper({ teamStats, playerStats, currentUserId, temporadaNombre }: Props) {
  const [tab, setTab] = useState<'equipos' | 'jugadores'>('equipos');
  const [ciudadFiltro, setCiudadFiltro] = useState<string>('todas');

  // Unique cities from teams (sorted alphabetically, ignoring nulls)
  const ciudades = useMemo(() => {
    const set = new Set<string>();
    teamStats.forEach(t => { if (t.ciudad) set.add(t.ciudad); });
    return Array.from(set).sort();
  }, [teamStats]);

  const teamStatsFiltrados = useMemo(() => {
    if (ciudadFiltro === 'todas') return teamStats;
    return teamStats.filter(t => t.ciudad === ciudadFiltro);
  }, [teamStats, ciudadFiltro]);

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
            <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/25 rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <span className="text-[12px]">🏆</span>
              <span className="text-[10px] font-semibold text-accent truncate max-w-[120px]">{temporadaNombre}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 pt-4 flex gap-1 flex-shrink-0">
        <button
          onClick={() => setTab('equipos')}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors min-h-[40px] ${tab === 'equipos' ? 'bg-accent/15 text-accent' : 'text-outline hover:text-on-surface-variant'}`}
        >
          Equipos
        </button>
        <button
          onClick={() => setTab('jugadores')}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors min-h-[40px] ${tab === 'jugadores' ? 'bg-accent/15 text-accent' : 'text-outline hover:text-on-surface-variant'}`}
        >
          Jugadores
        </button>
      </div>

      {/* City filter — only in equipos tab */}
      {tab === 'equipos' && ciudades.length > 1 && (
        <div className="px-4 sm:px-6 pt-3 flex gap-1.5 flex-wrap flex-shrink-0">
          <button
            onClick={() => setCiudadFiltro('todas')}
            className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
              ciudadFiltro === 'todas'
                ? 'bg-surface-container border-outline-variant text-on-surface'
                : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant'
            }`}
          >
            Todas las ciudades
          </button>
          {ciudades.map(c => (
            <button
              key={c}
              onClick={() => setCiudadFiltro(c)}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                ciudadFiltro === c
                  ? 'bg-surface-container border-outline-variant text-on-surface'
                  : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1">
        {tab === 'equipos' ? (
          <TeamRankingView stats={teamStatsFiltrados} />
        ) : (
          <PlayerRankingView stats={playerStats} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}
