'use client';

import { Badge } from '@/components/ui/Badge';

interface PlayerRowProps {
  nombre: string;
  iniciales: string;
  avatarColor: string;
  avatarUrl?: string | null;
  roles: ('admin' | 'capitan' | 'jugador')[];
  posicion: 'titular' | 'suplente';
  nivel: number;
  xp: number;
  isCurrentUser?: boolean;
  canEdit?: boolean;
  onViewProfile?: () => void;
  onEditRole?: () => void;
  onRemove?: () => void;
}

export function PlayerRow({
  nombre,
  iniciales,
  avatarColor,
  avatarUrl,
  roles,
  posicion,
  nivel,
  xp,
  isCurrentUser = false,
  canEdit = false,
  onViewProfile,
  onEditRole,
  onRemove,
}: PlayerRowProps) {
  return (
    <div className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[10px] p-2.5 px-3.5 flex items-center gap-3 hover:border-[#2a2a2a] transition-colors">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={nombre}
          className="w-10 h-10 rounded-[8px] object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[13px] font-medium flex-shrink-0"
          style={{ background: `${avatarColor}20`, color: avatarColor }}
        >
          {iniciales}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] text-[#ddd] font-medium">{nombre}</span>
          {roles.includes('admin') && <Badge variant="gold">Admin</Badge>}
          {roles.includes('capitan') && <Badge variant="purple">Capitán</Badge>}
          {roles.includes('jugador') && !roles.includes('admin') && !roles.includes('capitan') && (
            <Badge variant="neutral">Jugador</Badge>
          )}
        </div>
        <div className="text-[11px] text-[#444] mt-0.5 flex items-center gap-2">
          <span>Lv.{nivel} · {xp} XP</span>
          <span className="text-[#555]">{posicion}</span>
          <span className="text-[#5a9e5a]">Activo</span>
        </div>
      </div>
      {(canEdit || onViewProfile) && (
        <div className="flex gap-1.5">
          {onViewProfile && (
            <button
              onClick={onViewProfile}
              className="bg-[#1a1a1f] border-none rounded-[6px] w-7 h-7 flex items-center justify-center cursor-pointer text-[#555] hover:bg-[#2a2a2f] hover:text-[#aaa] transition-colors"
              title="Ver perfil"
              aria-label="Ver perfil"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          )}
          {canEdit && onEditRole && !isCurrentUser && (
            <button
              onClick={onEditRole}
              className="bg-[#1a1a1f] border-none rounded-[6px] w-7 h-7 flex items-center justify-center cursor-pointer text-[#555] hover:bg-[#2a2a2f] hover:text-[#aaa] transition-colors"
              title="Editar rol"
              aria-label="Editar rol"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </button>
          )}
          {canEdit && onRemove && !isCurrentUser && (
            <button
              onClick={onRemove}
              className="bg-[#1a1a1f] border-none rounded-[6px] w-7 h-7 flex items-center justify-center cursor-pointer text-[#555] hover:bg-[#3a1515] hover:text-[#E24B4A] transition-colors"
              title="Expulsar"
              aria-label="Expulsar jugador"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
