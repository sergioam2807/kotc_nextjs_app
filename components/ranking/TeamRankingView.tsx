'use client';

import type { TeamRankingStat } from './types';

interface Props {
  stats: TeamRankingStat[];
}

export function TeamRankingView({ stats }: Props) {
  return (
    <>
      {stats.length >= 1 && (
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-end justify-center gap-3">
            {stats[1] && (
              <div className="flex flex-col items-center gap-2 flex-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold border-2"
                  style={{ background: `${stats[1].color}20`, borderColor: `${stats[1].color}60`, color: stats[1].color }}
                >
                  {stats[1].nombre[0].toUpperCase()}
                </div>
                <div className="text-[11px] font-medium text-[#ccc] text-center truncate w-full px-1">{stats[1].nombre}</div>
                <div className="text-[10px] text-[#9aa8b8]">{stats[1].puntos} pts</div>
                <div
                  className="w-full h-14 rounded-t-[6px] flex items-center justify-center"
                  style={{ background: '#9aa8b820', border: '1px solid #9aa8b840' }}
                >
                  <span className="text-[#9aa8b8] text-[16px] font-bold">2</span>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-2 flex-1">
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
              <div className="text-[12px] font-semibold text-[#ddd] text-center truncate w-full px-1">{stats[0].nombre}</div>
              <div className="text-[11px] text-[#F5C344] font-medium">{stats[0].puntos} pts</div>
              <div
                className="w-full h-20 rounded-t-[6px] flex items-center justify-center"
                style={{ background: '#F5C34420', border: '1px solid #F5C34440' }}
              >
                <span className="text-[#F5C344] text-[20px] font-bold">1</span>
              </div>
            </div>

            {stats[2] && (
              <div className="flex flex-col items-center gap-2 flex-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold border-2"
                  style={{ background: `${stats[2].color}20`, borderColor: `${stats[2].color}60`, color: stats[2].color }}
                >
                  {stats[2].nombre[0].toUpperCase()}
                </div>
                <div className="text-[11px] font-medium text-[#ccc] text-center truncate w-full px-1">{stats[2].nombre}</div>
                <div className="text-[10px] text-[#cd7f32]">{stats[2].puntos} pts</div>
                <div
                  className="w-full h-10 rounded-t-[6px] flex items-center justify-center"
                  style={{ background: '#cd7f3220', border: '1px solid #cd7f3240' }}
                >
                  <span className="text-[#cd7f32] text-[16px] font-bold">3</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 pb-6">
        {stats.map((team, idx) => (
          <div
            key={team.id}
            className="flex items-center gap-3 px-3 py-3 rounded-[10px] mb-1 hover:bg-[#0f0f12] transition-colors"
          >
            <div
              className={`w-6 text-center text-[12px] font-bold flex-shrink-0 ${
                idx === 0 ? 'text-[#F5C344]' : idx === 1 ? 'text-[#9aa8b8]' : idx === 2 ? 'text-[#cd7f32]' : 'text-[#444]'
              }`}
            >
              {idx + 1}
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
              style={{ background: `${team.color}20`, color: team.color }}
            >
              {team.nombre[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[#ccc] truncate">{team.nombre}</div>
              <div className="text-[10px] text-[#555] mt-0.5">
                {team.miembros} miembros · {team.winRate}% win rate
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <div className="text-[11px] font-medium text-[#F5C344]">{team.kingCourts}</div>
                <div className="text-[9px] text-[#444]">🏆</div>
              </div>
              <div className="text-center">
                <div className="text-[11px] font-medium text-[#ccc]">{team.totalVictorias}W</div>
                <div className="text-[9px] text-[#444]">{team.totalDerrotas}L</div>
              </div>
              <div className="text-right">
                <div
                  className="text-[12px] font-semibold"
                  style={{ color: idx === 0 ? '#F5C344' : idx === 1 ? '#9aa8b8' : idx === 2 ? '#cd7f32' : '#888' }}
                >
                  {team.puntos}
                </div>
                <div className="text-[9px] text-[#444]">pts</div>
              </div>
            </div>
          </div>
        ))}
        {stats.length === 0 && (
          <div className="text-[#444] text-[12px] text-center py-12">Sin equipos registrados</div>
        )}
      </div>
    </>
  );
}
