'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LeaveTeamButton({ miembroId }: { miembroId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLeave = async () => {
    setLoading(true);
    const res = await fetch('/api/equipo/miembros', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ miembro_id: miembroId }),
    });
    if (res.ok) {
      router.push('/equipo');
      router.refresh();
    }
    setLoading(false);
  };

  if (confirmando) {
    return (
      <div className="mt-6 bg-error-container/50 border border-error/25 rounded-lg p-4 flex items-center justify-between gap-3">
        <p className="text-[13px] text-on-surface">¿Confirmas que quieres salir del equipo?</p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleLeave}
            disabled={loading}
            className="bg-error text-on-error border-none rounded-md px-3 py-1.5 text-[12px] font-semibold cursor-pointer hover:brightness-90 transition-all disabled:opacity-50"
          >
            {loading ? '...' : 'Confirmar salida'}
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
    <button
      onClick={() => setConfirmando(true)}
      className="mt-6 w-full bg-transparent text-outline border border-outline-variant rounded-lg py-2.5 text-[12px] cursor-pointer hover:border-error/40 hover:text-error transition-colors"
    >
      Salir del equipo
    </button>
  );
}
