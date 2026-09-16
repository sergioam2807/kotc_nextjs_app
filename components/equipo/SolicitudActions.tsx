'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { SoftButton } from '@/components/ui/SoftButton';

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
          <SoftButton color="green" onPress={() => handleAction('aceptada')} isDisabled={loading || isPending} className="flex-1">
            {loading ? 'Procesando...' : 'Sí, aceptar'}
          </SoftButton>
          <Button variant="outline" onPress={() => setConfirmando(null)} isDisabled={loading || isPending} className="flex-1">
            Cancelar
          </Button>
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
          <SoftButton color="red" onPress={() => handleAction('rechazada')} isDisabled={loading || isPending} className="flex-1">
            {loading ? 'Procesando...' : 'Sí, rechazar'}
          </SoftButton>
          <Button variant="outline" onPress={() => setConfirmando(null)} isDisabled={loading || isPending} className="flex-1">
            Cancelar
          </Button>
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
        <SoftButton color="green" onPress={() => setConfirmando('aceptar')} className="flex-1">
          Aceptar
        </SoftButton>
        <Button variant="outline" onPress={() => setConfirmando('rechazar')} className="flex-1">
          Rechazar
        </Button>
      </div>
    </div>
  );
}
