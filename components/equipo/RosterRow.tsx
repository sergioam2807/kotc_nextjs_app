'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface RosterRowProps {
  miembroId: string;
  jugadorId: string;
  nombre: string;
  iniciales: string;
  avatarColor: string;
  avatarUrl?: string | null;
  roles: ('admin' | 'capitan' | 'jugador')[];
  posicion: 'titular' | 'suplente';
  nivel: number;
  xp: number;
  isCurrentUser: boolean;
  isAdmin: boolean;
}

export function RosterRow(props: RosterRowProps) {
  const router = useRouter();

  // Posicion state (optimistic)
  const [posicion, setPosicion] = useState<'titular' | 'suplente'>(props.posicion);
  const [updatingPos, setUpdatingPos] = useState(false);

  // Remove / leave state
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esPropio = props.isCurrentUser;
  const esAdminTarget = props.roles.includes('admin');

  // Admin can change posicion of any non-admin member (including their own capitan / jugadores)
  const puedeEditarPosicion = props.isAdmin && !esAdminTarget;

  // Admin can expel non-admin members that are not themselves
  const puedeExpulsar = props.isAdmin && !esPropio && !esAdminTarget;

  // Non-admin members can leave (their own row)
  const puedeSalir = esPropio && !esAdminTarget;

  // -------------------------------------------------------------------------
  // Toggle posición
  // -------------------------------------------------------------------------
  const handleTogglePosicion = async () => {
    const nuevaPosicion: 'titular' | 'suplente' =
      posicion === 'titular' ? 'suplente' : 'titular';
    setUpdatingPos(true);

    const res = await fetch('/api/equipo/miembros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ miembro_id: props.miembroId, posicion: nuevaPosicion }),
    });

    if (res.ok) {
      setPosicion(nuevaPosicion);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Error al cambiar posición');
      setTimeout(() => setError(null), 3000);
    }
    setUpdatingPos(false);
  };

  // -------------------------------------------------------------------------
  // Confirm leave / expel
  // -------------------------------------------------------------------------
  const handleConfirm = async () => {
    setLoading(true);
    const res = await fetch('/api/equipo/miembros', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ miembro_id: props.miembroId }),
    });

    if (res.ok) {
      if (esPropio) {
        router.push('/equipo');
        router.refresh();
      } else {
        router.refresh();
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'No se pudo realizar la acción');
      setTimeout(() => setError(null), 4000);
    }
    setLoading(false);
    setConfirmando(false);
  };

  // -------------------------------------------------------------------------
  // Confirming state
  // -------------------------------------------------------------------------
  if (confirmando) {
    return (
      <div className="bg-error/5 border border-error/25 rounded-lg p-3 px-3.5 flex items-center gap-3">
        <div className="flex-1 text-[13px] text-on-surface">
          {esPropio
            ? '¿Confirmas que quieres salir del equipo?'
            : `¿Expulsar a ${props.nombre} del equipo?`}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-error text-on-error border-none rounded-md px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:brightness-90 transition-all disabled:opacity-50"
          >
            {loading ? '...' : esPropio ? 'Salir' : 'Expulsar'}
          </button>
          <button
            onClick={() => setConfirmando(false)}
            className="bg-surface-container text-on-surface-variant border-none rounded-md px-3 py-1.5 text-[12px] cursor-pointer hover:text-on-surface transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Normal state
  // -------------------------------------------------------------------------
  return (
    <div className="relative">
      <div className="bg-surface-container-low border border-outline-variant rounded-lg p-2.5 px-3.5 flex items-center gap-3 hover:border-outline transition-colors">

        {/* Avatar */}
        <Link href={`/jugadores/${props.jugadorId}`} className="flex-shrink-0">
          {props.avatarUrl ? (
            <img
              src={props.avatarUrl}
              alt={props.nombre}
              className="w-10 h-10 rounded-lg object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-[13px] font-semibold"
              style={{ background: `${props.avatarColor}20`, color: props.avatarColor }}
            >
              {props.iniciales}
            </div>
          )}
        </Link>

        {/* Name + badges */}
        <Link href={`/jugadores/${props.jugadorId}`} className="flex-1 min-w-0 block">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] text-on-surface font-semibold truncate">{props.nombre}</span>
            {props.roles.includes('admin') && <Badge variant="accent">Admin</Badge>}
            {props.roles.includes('capitan') && !props.roles.includes('admin') && (
              <Badge variant="purple">Capitán</Badge>
            )}
            {!props.roles.includes('admin') && !props.roles.includes('capitan') && (
              <Badge variant="neutral">Jugador</Badge>
            )}
            {esPropio && <Badge variant="green">Tú</Badge>}
          </div>
          <div className="text-[11px] text-outline mt-0.5">
            Lv.{props.nivel} · {props.xp} XP
          </div>
        </Link>

        {/* Posición + actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Posición toggle (admin → clickable; otherwise → display only) */}
          {puedeEditarPosicion ? (
            <button
              onClick={handleTogglePosicion}
              disabled={updatingPos}
              title={`Cambiar a ${posicion === 'titular' ? 'suplente' : 'titular'}`}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                posicion === 'titular'
                  ? 'border-status-libre/40 text-status-libre bg-status-libre/10 hover:bg-status-libre/20'
                  : 'border-outline-variant text-on-surface-variant bg-surface-container hover:border-outline'
              }`}
            >
              {updatingPos ? '…' : posicion === 'titular' ? 'Titular' : 'Suplente'}
            </button>
          ) : (
            <span
              className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${
                posicion === 'titular'
                  ? 'border-status-libre/40 text-status-libre bg-status-libre/10'
                  : 'border-outline-variant text-on-surface-variant bg-surface-container'
              }`}
            >
              {posicion === 'titular' ? 'Titular' : 'Suplente'}
            </span>
          )}

          {/* Remove / leave icon */}
          {(puedeExpulsar || puedeSalir) && (
            <button
              onClick={() => setConfirmando(true)}
              className="bg-surface-container border-none rounded-md w-7 h-7 flex items-center justify-center cursor-pointer text-outline hover:bg-error/10 hover:text-error transition-colors"
              title={esPropio ? 'Salir del equipo' : 'Expulsar'}
              aria-label={esPropio ? 'Salir del equipo' : 'Expulsar jugador'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Inline error */}
      {error && (
        <div className="mt-1 bg-error/10 border border-error/25 rounded-lg px-3 py-2 text-[12px] text-error">
          {error}
        </div>
      )}
    </div>
  );
}
