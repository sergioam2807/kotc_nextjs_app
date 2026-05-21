'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayerRow } from './PlayerRow';

interface RosterRowProps {
  miembroId: string;
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
      <div className="bg-[#1a0f0f] border border-[#E24B4A40] rounded-[10px] p-3 px-3.5 flex items-center gap-3">
        <div className="flex-1 text-[13px] text-[#ddd]">
          {esPropio
            ? '¿Confirmas que quieres salir del equipo?'
            : `¿Expulsar a ${props.nombre} del equipo?`}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-[#E24B4A] text-white border-none rounded-[6px] px-3 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[#c43a39] transition-colors disabled:opacity-50"
          >
            {loading ? '...' : esPropio ? 'Salir' : 'Expulsar'}
          </button>
          <button
            onClick={() => setConfirmando(false)}
            className="bg-[#1a1a1f] text-[#888] border-none rounded-[6px] px-3 py-1.5 text-[12px] cursor-pointer hover:text-[#ccc] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
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
  );
}
