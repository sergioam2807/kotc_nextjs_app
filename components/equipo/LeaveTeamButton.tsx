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
      <div className="mt-6 bg-[#1a0f0f] border border-[#E24B4A40] rounded-[10px] p-4 flex items-center justify-between gap-3">
        <p className="text-[13px] text-[#ddd]">¿Confirmas que quieres salir del equipo?</p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleLeave}
            disabled={loading}
            className="bg-[#E24B4A] text-white border-none rounded-[6px] px-3 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[#c43a39] transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Confirmar salida'}
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
    <button
      onClick={() => setConfirmando(true)}
      className="mt-6 w-full bg-transparent text-[#444] border border-[#1e1e24] rounded-[8px] py-2.5 text-[12px] cursor-pointer hover:border-[#E24B4A40] hover:text-[#E24B4A] transition-colors"
    >
      Salir del equipo
    </button>
  );
}
