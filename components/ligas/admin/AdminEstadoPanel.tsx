'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';

interface AdminEstadoPanelProps {
  ligaId: string;
  estadoActual: string;
  nombre: string;
}

const TRANSICIONES: Record<string, { label: string; siguiente: string; confirmMsg?: string; variant: 'primary' | 'green' | 'error' | 'neutral' }> = {
  borrador:      { label: 'Abrir inscripciones',       siguiente: 'inscripciones', variant: 'primary' },
  inscripciones: { label: 'Ir a generar calendario →', siguiente: 'en_curso',      variant: 'green' },
  en_curso:      { label: 'Finalizar liga',             siguiente: 'finalizada',    variant: 'neutral', confirmMsg: '¿Confirmas que quieres finalizar la liga?' },
};

const ESTADO_LABEL: Record<string, string> = {
  borrador:      '📝 Borrador',
  inscripciones: '📬 Inscripciones abiertas',
  en_curso:      '🏆 En curso',
  finalizada:    '🏁 Finalizada',
  cancelada:     '❌ Cancelada',
};

const ESTADO_VARIANT: Record<string, 'accent' | 'primary' | 'green' | 'neutral' | 'error'> = {
  borrador:      'neutral',
  inscripciones: 'primary',
  en_curso:      'green',
  finalizada:    'neutral',
  cancelada:     'error',
};

export function AdminEstadoPanel({ ligaId, estadoActual, nombre }: AdminEstadoPanelProps) {
  const router = useRouter();
  const [loading, setLoading]       = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const transicion = TRANSICIONES[estadoActual];

  const handleTransicion = async () => {
    if (!transicion) return;
    // Special case: inscripciones → en_curso is handled by the generate page
    if (estadoActual === 'inscripciones') {
      router.push(`/ligas/${ligaId}/admin/partidos`);
      return;
    }

    if (transicion.confirmMsg && !confirmando) {
      setConfirmando(true);
      return;
    }

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/ligas/${ligaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: transicion.siguiente }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Error al cambiar el estado');
    } else {
      router.refresh();
    }
    setLoading(false);
    setConfirmando(false);
  };

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5">
            Estado de la liga
          </div>
          <Badge variant={ESTADO_VARIANT[estadoActual] ?? 'neutral'}>
            {ESTADO_LABEL[estadoActual] ?? estadoActual}
          </Badge>
        </div>

        {transicion && (
          <div className="flex items-center gap-2">
            {confirmando && (
              <span className="text-[12px] text-on-surface-variant">{transicion.confirmMsg}</span>
            )}
            <button
              onClick={handleTransicion}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-all disabled:opacity-50 ${
                transicion.variant === 'green'
                  ? 'bg-status-libre text-white hover:brightness-90'
                  : transicion.variant === 'error'
                  ? 'bg-error text-on-error hover:brightness-90'
                  : transicion.variant === 'primary'
                  ? 'bg-primary text-white hover:brightness-90'
                  : 'bg-surface-container text-on-surface border border-outline-variant hover:border-outline'
              }`}
            >
              {loading ? '…' : confirmando ? 'Confirmar' : transicion.label}
            </button>
            {confirmando && (
              <button
                onClick={() => setConfirmando(false)}
                className="px-3 py-2 rounded-lg text-[12px] text-on-surface-variant bg-surface-container border-none cursor-pointer hover:text-on-surface"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-[12px] text-error mt-2">{error}</p>
      )}

      {estadoActual === 'borrador' && (
        <p className="text-[11px] text-on-surface-variant mt-2">
          Invita equipos y abre inscripciones cuando estés listo.
        </p>
      )}
      {estadoActual === 'inscripciones' && (
        <p className="text-[11px] text-on-surface-variant mt-2">
          Acepta los equipos, asígna grupos si corresponde, y luego genera el calendario.
        </p>
      )}
    </div>
  );
}
