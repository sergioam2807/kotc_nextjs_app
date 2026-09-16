'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SoftButton } from '@/components/ui/SoftButton';

interface Props {
  canchaId: string;
  nombre: string;
}

/**
 * Aprobar / rechazar una cancha descubierta.
 *
 * Optimista: la fila desaparece de la lista de pendientes apenas se decide, y
 * vuelve con el error a la vista si el server rechaza la operación.
 */
export function CanchaModeracionActions({ canchaId, nombre }: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'resuelta'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function moderar(accion: 'aprobar' | 'rechazar') {
    setEstado('enviando');
    setError(null);

    const res = await fetch(`/api/admin/canchas/${canchaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion }),
    }).catch(() => null);

    const data = res ? await res.json().catch(() => ({})) : {};

    if (!res || !res.ok) {
      setError(data.error ?? 'No se pudo completar la acción');
      setEstado('idle');
      return;
    }

    setEstado('resuelta');
    router.refresh();
  }

  if (estado === 'resuelta') {
    return (
      <span className="kotc-confirm-in text-[11px] text-status-libre font-medium">
        Listo
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <SoftButton color="green" onPress={() => moderar('aprobar')} isDisabled={estado === 'enviando'}>
          {estado === 'enviando' ? '…' : '✓ Aprobar'}
        </SoftButton>
        <SoftButton color="red" onPress={() => moderar('rechazar')} isDisabled={estado === 'enviando'}>
          ✗ Rechazar
        </SoftButton>
      </div>
      {error && (
        <span className="text-[10px] text-error text-right max-w-[240px]">
          {nombre}: {error}
        </span>
      )}
    </div>
  );
}
