'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GenerarCalendarioButtonProps {
  ligaId: string;
  formato: string;
  /** 'grupos' | 'playoffs' — only relevant for grupos_playoffs */
  fase?: string;
  /** Label to show on the button */
  label?: string;
}

export function GenerarCalendarioButton({
  ligaId, formato, fase, label,
}: GenerarCalendarioButtonProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [ok,      setOk]      = useState(false);

  const handleGenerar = async () => {
    setLoading(true);
    setError(null);

    const body: Record<string, string> = {};
    if (formato === 'grupos_playoffs' && fase) body.fase = fase;

    const res = await fetch(`/api/ligas/${ligaId}/generar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Error al generar el calendario');
    } else {
      setOk(true);
      router.refresh();
    }
    setLoading(false);
  };

  if (ok) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-status-libre font-medium">
        <span>✓</span>
        <span>Calendario generado correctamente</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleGenerar}
        disabled={loading}
        className="bg-accent text-on-accent border-none rounded-xl px-5 py-2.5 text-[13px] font-semibold cursor-pointer hover:brightness-95 transition-all disabled:opacity-50"
      >
        {loading ? 'Generando…' : (label ?? 'Generar calendario')}
      </button>
      {error && (
        <p className="text-[12px] text-error">{error}</p>
      )}
    </div>
  );
}
