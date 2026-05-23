'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DisolverEquipoButtonProps {
  equipoNombre: string;
}

export function DisolverEquipoButton({ equipoNombre }: DisolverEquipoButtonProps) {
  const router = useRouter();
  const [paso, setPaso] = useState<'idle' | 'confirmar'>('idle');
  const [inputNombre, setInputNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nombreCoincide =
    inputNombre.trim().toLowerCase() === equipoNombre.trim().toLowerCase();

  const handleDisolver = async () => {
    if (!nombreCoincide) return;
    setLoading(true);
    setError(null);

    const res = await fetch('/api/equipo/disolver', { method: 'DELETE' });
    if (res.ok) {
      router.push('/equipo');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'No se pudo disolver el equipo. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    setPaso('idle');
    setInputNombre('');
    setError(null);
  };

  // -------------------------------------------------------------------------
  // Idle — botón discreto al pie de la página
  // -------------------------------------------------------------------------
  if (paso === 'idle') {
    return (
      <button
        onClick={() => setPaso('confirmar')}
        className="mt-6 w-full bg-transparent text-outline border border-outline-variant rounded-lg py-2.5 text-[12px] cursor-pointer hover:border-error/40 hover:text-error transition-colors"
      >
        Disolver equipo
      </button>
    );
  }

  // -------------------------------------------------------------------------
  // Confirmar — panel de advertencia con input de nombre
  // -------------------------------------------------------------------------
  return (
    <div className="mt-6 bg-error/5 border border-error/20 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[18px]">⚠️</span>
        <span className="text-[14px] font-semibold text-error">Disolver equipo</span>
      </div>

      {/* Warning text */}
      <p className="text-[12px] text-on-surface-variant leading-relaxed mb-1">
        Esta acción es <strong className="text-on-surface">permanente e irreversible</strong>.
        Se eliminarán todos los datos del equipo: canchas dominadas, desafíos y resultados.
      </p>
      <p className="text-[12px] text-on-surface-variant leading-relaxed mb-4">
        Los jugadores quedarán libres para unirse a otros equipos. El historial personal
        de cada jugador se conservará.
      </p>

      {/* Input confirmation */}
      <p className="text-[12px] text-on-surface mb-2">
        Para confirmar, escribe el nombre del equipo:
        {' '}<strong className="text-on-surface">{equipoNombre}</strong>
      </p>
      <input
        type="text"
        value={inputNombre}
        onChange={e => setInputNombre(e.target.value)}
        placeholder={equipoNombre}
        autoFocus
        className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline mb-3 outline-none focus:border-error/50 transition-colors"
      />

      {/* Error message */}
      {error && (
        <p className="text-[12px] text-error mb-3">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDisolver}
          disabled={!nombreCoincide || loading}
          className="flex-1 bg-error text-on-error border-none rounded-lg py-2.5 text-[12px] font-semibold cursor-pointer hover:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Disolviendo...' : 'Confirmar — disolver equipo'}
        </button>
        <button
          onClick={handleCancelar}
          disabled={loading}
          className="bg-surface-container text-on-surface-variant border-none rounded-lg px-4 py-2.5 text-[12px] cursor-pointer hover:text-on-surface transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
