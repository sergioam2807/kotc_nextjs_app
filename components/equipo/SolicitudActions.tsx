'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  solicitudId: string;
  jugadorNombre: string;
}

export function SolicitudActions({ solicitudId, jugadorNombre }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState<'aceptar' | 'rechazar' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (estado: 'aceptada' | 'rechazada') => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Error al procesar la solicitud');
        setConfirmando(null);
        return;
      }

      setConfirmando(null);
      startTransition(() => router.refresh());
    } finally {
      setLoading(false);
    }
  };

  if (confirmando === 'aceptar') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[12px] text-on-surface-variant">
          ¿Aceptar a <span className="font-semibold text-on-surface">{jugadorNombre}</span> en el equipo?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('aceptada')}
            disabled={loading || isPending}
            className="flex-1 bg-status-libre/15 border border-status-libre/40 text-status-libre text-[12px] font-semibold py-2 rounded-lg hover:bg-status-libre/25 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Procesando...' : 'Sí, aceptar'}
          </button>
          <button
            onClick={() => setConfirmando(null)}
            disabled={loading || isPending}
            className="flex-1 bg-surface-container border border-outline-variant text-on-surface-variant text-[12px] py-2 rounded-lg hover:border-outline transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (confirmando === 'rechazar') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[12px] text-on-surface-variant">
          ¿Rechazar la solicitud de <span className="font-semibold text-on-surface">{jugadorNombre}</span>?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('rechazada')}
            disabled={loading || isPending}
            className="flex-1 bg-error/15 border border-error/40 text-error text-[12px] font-semibold py-2 rounded-lg hover:bg-error/25 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Procesando...' : 'Sí, rechazar'}
          </button>
          <button
            onClick={() => setConfirmando(null)}
            disabled={loading || isPending}
            className="flex-1 bg-surface-container border border-outline-variant text-on-surface-variant text-[12px] py-2 rounded-lg hover:border-outline transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-[11px] text-error">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => setConfirmando('aceptar')}
          className="flex-1 bg-status-libre/15 border border-status-libre/40 text-status-libre text-[12px] font-semibold py-2 rounded-lg hover:bg-status-libre/25 transition-colors cursor-pointer"
        >
          Aceptar
        </button>
        <button
          onClick={() => setConfirmando('rechazar')}
          className="flex-1 bg-surface-container border border-outline-variant text-on-surface-variant text-[12px] py-2 rounded-lg hover:border-outline transition-colors cursor-pointer"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
