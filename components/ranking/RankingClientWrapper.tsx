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
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#1a1a1f] flex-shrink-0">
        <div className="text-[15px] font-semibold text-[#ddd]">Ranking</div>
        <div className="text-[11px] text-[#555] mt-0.5">Clasificación territorial de la temporada</div>
      </div>

      <div className="px-6 pt-4 flex gap-1 flex-shrink-0">
        <button
          onClick={() => setTab('equipos')}
          className={`px-4 py-1.5 rounded-[7px] text-[12px] font-medium transition-colors ${tab === 'equipos' ? 'bg-[#F5C34420] text-[#F5C344]' : 'text-[#555] hover:text-[#888]'}`}
        >
          Equipos
        </button>
        <button
          onClick={() => setTab('jugadores')}
          className={`px-4 py-1.5 rounded-[7px] text-[12px] font-medium transition-colors ${tab === 'jugadores' ? 'bg-[#F5C34420] text-[#F5C344]' : 'text-[#555] hover:text-[#888]'}`}
        >
          Jugadores
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'equipos' ? (
          <TeamRankingView stats={teamStats} />
        ) : (
          <PlayerRankingView stats={playerStats} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}
