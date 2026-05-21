'use client';

import type { PlayerRankingStat } from './types';

interface Props {
  stats: PlayerRankingStat[];
  currentUserId: string | null;
}

function PlayerAvatar({ player, size }: { player: PlayerRankingStat; size: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-14 h-14 text-[20px]' : 'w-12 h-12 text-[18px]';
  return (
    <div className={`${dim} rounded-full overflow-hidden bg-[#1e1e24] flex-shrink-0 flex items-center justify-center`}>
      {player.avatarUrl ? (
        <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-[#555]">{player.displayName[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}

export function PlayerRankingView({ stats, currentUserId }: Props) {
  return (
    <>
      {stats.length >= 1 && (
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-end justify-center gap-3">
            {stats[1] && (
              <div className="flex flex-col items-center gap-2 flex-1">
                <PlayerAvatar player={stats[1]} size="sm" />
                <div className="text-[11px] font-medium text-[#ccc] text-center truncate w-full px-1">{stats[1].displayName}</div>
                <div className="text-[9px] text-[#555] bg-[#1e1e24] rounded-[4px] px-1.5 py-0.5">Lv{stats[1].nivel}</div>
                <div className="text-[10px] text-[#9aa8b8]">{stats[1].xp.toLocaleString()} XP</div>
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
              <PlayerAvatar player={stats[0]} size="lg" />
              <div className="text-[12px] font-semibold text-[#ddd] text-center truncate w-full px-1">{stats[0].displayName}</div>
              <div className="text-[9px] text-[#555] bg-[#1e1e24] rounded-[4px] px-1.5 py-0.5">Lv{stats[0].nivel}</div>
              <div className="text-[11px] text-[#F5C344] font-medium">{stats[0].xp.toLocaleString()} XP</div>
              <div
                className="w-full h-20 rounded-t-[6px] flex items-center justify-center"
                style={{ background: '#F5C34420', border: '1px solid #F5C34440' }}
              >
                <span className="text-[#F5C344] text-[20px] font-bold">1</span>
              </div>
            </div>

            {stats[2] && (
              <div className="flex flex-col items-center gap-2 flex-1">
                <PlayerAvatar player={stats[2]} size="sm" />
                <div className="text-[11px] font-medium text-[#ccc] text-center truncate w-full px-1">{stats[2].displayName}</div>
                <div className="text-[9px] text-[#555] bg-[#1e1e24] rounded-[4px] px-1.5 py-0.5">Lv{stats[2].nivel}</div>
                <div className="text-[10px] text-[#cd7f32]">{stats[2].xp.toLocaleString()} XP</div>
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
        {stats.map((player, idx) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 px-3 py-3 rounded-[10px] mb-1 transition-colors ${
              player.id === currentUserId ? 'bg-[#F5C34410] border border-[#F5C34420]' : 'hover:bg-[#0f0f12]'
            }`}
          >
            <div
              className={`w-6 text-center text-[12px] font-bold flex-shrink-0 ${
                idx === 0 ? 'text-[#F5C344]' : idx === 1 ? 'text-[#9aa8b8]' : idx === 2 ? 'text-[#cd7f32]' : 'text-[#444]'
              }`}
            >
              {idx + 1}
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1e1e24] flex-shrink-0 flex items-center justify-center">
              {player.avatarUrl ? (
                <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[12px] font-bold text-[#555]">{player.displayName[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium text-[#ccc] truncate">{player.displayName}</span>
                {player.id === currentUserId && (
                  <span className="text-[9px] text-[#F5C344] bg-[#F5C34420] px-1 rounded">tú</span>
                )}
              </div>
              {player.equipoNombre && (
                <div className="text-[10px] mt-0.5 truncate" style={{ color: player.equipoColor ?? '#555' }}>
                  {player.equipoNombre}
                </div>
              )}
              <div className="w-full h-0.5 bg-[#1a1a1f] rounded-full mt-1">
                <div
                  className="h-full rounded-full bg-[#F5C34440]"
                  style={{ width: `${(player.xp % 1000) / 10}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <div className="text-[10px] text-[#555] bg-[#1e1e24] rounded-[4px] px-1.5 py-0.5">Lv{player.nivel}</div>
              </div>
              <div className="text-right">
                <div
                  className="text-[12px] font-semibold"
                  style={{ color: idx === 0 ? '#F5C344' : idx === 1 ? '#9aa8b8' : idx === 2 ? '#cd7f32' : '#888' }}
                >
                  {player.xp.toLocaleString()}
                </div>
                <div className="text-[9px] text-[#444]">XP</div>
              </div>
            </div>
          </div>
        ))}
        {stats.length === 0 && (
          <div className="text-[#444] text-[12px] text-center py-12">Sin jugadores registrados</div>
        )}
      </div>
    </>
  );
}
