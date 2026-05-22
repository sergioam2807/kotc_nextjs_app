'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlayerRow } from './PlayerRow';

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
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);

  const esPropio = props.isCurrentUser;
  const puedeExpulsar = props.isAdmin && !esPropio;
  const puedeSalir = esPropio && !props.roles.includes('admin');

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
    }
    setLoading(false);
    setConfirmando(false);
  };

  if (confirmando) {
    return (
      <div className="bg-error-container/50 border border-error/25 rounded-lg p-3 px-3.5 flex items-center gap-3">
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

  return (
    <Link href={`/jugadores/${props.jugadorId}`} className="block">
      <PlayerRow
        nombre={props.nombre}
        iniciales={props.iniciales}
        avatarColor={props.avatarColor}
        avatarUrl={props.avatarUrl}
        roles={props.roles}
        posicion={props.posicion}
        nivel={props.nivel}
        xp={props.xp}
        isCurrentUser={esPropio}
        canEdit={puedeExpulsar || puedeSalir}
        onRemove={puedeExpulsar || puedeSalir ? () => setConfirmando(true) : undefined}
      />
    </Link>
  );
}
