'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@heroui/react';
import { Badge } from '@/components/ui/Badge';

interface AdminEstadoPanelProps {
  ligaId: string;
  estadoActual: string;
  nombre: string;
}

// Nota: no hay una transición manual "inscripciones → en_curso" aquí a propósito.
// Esa transición ocurre automáticamente al generar el primer calendario (ver
// GenerarCalendarioButton más abajo en la misma página); un botón separado que
// solo navegara a /admin/partidos era un callejón sin salida mientras no exista
// calendario (esa ruta redirige de vuelta) y además duplicaba la misma acción.
const TRANSICIONES: Record<string, { label: string; siguiente: string; confirmMsg?: string; variant: 'accent' | 'neutral' }> = {
  borrador: { label: 'Abrir inscripciones', siguiente: 'inscripciones', variant: 'accent' },
  en_curso: {
    label: 'Finalizar liga',
    siguiente: 'finalizada',
    variant: 'neutral',
    confirmMsg: 'Esta acción es irreversible: la liga se cerrará y no podrás cargar más resultados ni volver a "En curso".',
  },
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

export function AdminEstadoPanel({ ligaId, estadoActual }: AdminEstadoPanelProps) {
  const router = useRouter();
  const [loading, setLoading]       = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const transicion = TRANSICIONES[estadoActual];

  const handleTransicion = async () => {
    if (!transicion) return;

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
    <Card variant="secondary" className="border border-outline-variant rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5">
            Estado de la liga
          </div>
          <Badge variant={ESTADO_VARIANT[estadoActual] ?? 'neutral'}>
            {ESTADO_LABEL[estadoActual] ?? estadoActual}
          </Badge>
        </div>

        {transicion && !confirmando && (
          <button
            onClick={handleTransicion}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-all disabled:opacity-50 ${
              transicion.variant === 'accent'
                ? 'bg-accent text-on-accent hover:brightness-95'
                : 'bg-surface-container text-on-surface border border-outline-variant hover:border-outline'
            }`}
          >
            {loading ? '…' : transicion.label}
          </button>
        )}
      </div>

      {/* Confirmación de acción irreversible — misma idea que "Disolver equipo":
          nombrar la consecuencia explícitamente antes de pedir confirmación. */}
      {transicion && confirmando && (
        <div className="mt-3 bg-error/5 border border-error/20 rounded-lg p-3">
          <p className="text-[12px] text-on-surface-variant leading-relaxed mb-3">
            {transicion.confirmMsg}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleTransicion}
              disabled={loading}
              className="flex-1 bg-error text-on-error border-none rounded-lg py-2 text-[12px] font-semibold cursor-pointer hover:brightness-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Finalizando…' : 'Sí, finalizar liga'}
            </button>
            <button
              onClick={() => setConfirmando(false)}
              disabled={loading}
              className="bg-surface-container text-on-surface-variant border-none rounded-lg px-4 py-2 text-[12px] cursor-pointer hover:text-on-surface transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
    </Card>
  );
}
