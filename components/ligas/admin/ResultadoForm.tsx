'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Equipo { id: string; nombre: string; color: string }

interface ResultadoFormProps {
  ligaId: string;
  partidoId: string;
  equipoLocal: Equipo | null;
  equipoVisitante: Equipo | null;
  puntosLocalActual?: number | null;
  puntosVisitanteActual?: number | null;
  onGuardado?: () => void;
}

export function ResultadoForm({
  ligaId, partidoId,
  equipoLocal, equipoVisitante,
  puntosLocalActual, puntosVisitanteActual,
  onGuardado,
}: ResultadoFormProps) {
  const router = useRouter();
  const [pLocal,    setPLocal]    = useState<string>(puntosLocalActual?.toString() ?? '');
  const [pVisit,    setPVisit]    = useState<string>(puntosVisitanteActual?.toString() ?? '');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [guardado,  setGuardado]  = useState(false);

  const handleGuardar = async () => {
    const pl = parseInt(pLocal);
    const pv = parseInt(pVisit);
    if (isNaN(pl) || isNaN(pv)) { setError('Ingresa puntos válidos'); return; }
    if (pl < 0 || pv < 0) { setError('Los puntos no pueden ser negativos'); return; }

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/ligas/${ligaId}/partidos/${partidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puntos_local: pl, puntos_visitante: pv }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Error al guardar resultado');
    } else {
      setGuardado(true);
      router.refresh();
      onGuardado?.();
    }
    setLoading(false);
  };

  if (guardado) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-status-libre">
        <span>✓</span>
        <span>Resultado guardado</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Local */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[11px] text-on-surface-variant truncate flex-1">
            {equipoLocal?.nombre ?? 'Local'}
          </span>
          <input
            type="number" min={0} max={999}
            value={pLocal}
            onChange={e => setPLocal(e.target.value)}
            placeholder="0"
            className="w-14 bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-[14px] font-bold text-on-surface text-center outline-none focus:border-accent/60 transition-colors"
          />
        </div>

        <span className="text-[12px] text-outline font-medium">–</span>

        {/* Visitante */}
        <div className="flex-1 flex items-center gap-2 flex-row-reverse">
          <span className="text-[11px] text-on-surface-variant truncate flex-1 text-right">
            {equipoVisitante?.nombre ?? 'Visitante'}
          </span>
          <input
            type="number" min={0} max={999}
            value={pVisit}
            onChange={e => setPVisit(e.target.value)}
            placeholder="0"
            className="w-14 bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-[14px] font-bold text-on-surface text-center outline-none focus:border-accent/60 transition-colors"
          />
        </div>

        <button
          onClick={handleGuardar}
          disabled={loading || pLocal === '' || pVisit === ''}
          className="bg-accent text-on-accent border-none rounded-lg px-3 py-1.5 text-[11px] font-semibold cursor-pointer hover:brightness-95 transition-all disabled:opacity-40 flex-shrink-0"
        >
          {loading ? '…' : 'Guardar'}
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-error">{error}</p>
      )}
    </div>
  );
}
