'use client';

import { useState } from 'react';
import { TeamRankingView } from './TeamRankingView';
import { PlayerRankingView } from './PlayerRankingView';
import type { TeamRankingStat, PlayerRankingStat } from './types';

interface Props {
  teamStats: TeamRankingStat[];
  playerStats: PlayerRankingStat[];
  currentUserId: string | null;
}

export default function RankingClientWrapper({ teamStats, playerStats, currentUserId }: Props) {
  const [tab, setTab] = useState<'equipos' | 'jugadores'>('equipos');

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 sm:px-6 py-4 border-b border-outline-variant flex-shrink-0">
        <div className="text-[15px] font-bold text-on-surface">Ranking</div>
        <div className="text-[11px] text-outline mt-0.5">Clasificación territorial de la temporada</div>
      </div>

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

      <div className="flex-1">
        {tab === 'equipos' ? (
          <TeamRankingView stats={teamStats} />
        ) : (
          <PlayerRankingView stats={playerStats} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}
