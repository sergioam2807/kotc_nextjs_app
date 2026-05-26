'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  temporadaId: string;
  nombre: string;
  isActiva: boolean;
}

export function TemporadaAdminActions({ temporadaId, nombre, isActiva }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [confirmCerrar, setConfirmCerrar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleActivar() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/temporadas/${temporadaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'activar' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      setSuccess('Temporada activada correctamente.');
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCerrar() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/temporadas/${temporadaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'cerrar' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      setSuccess('Temporada cerrada. Se guardaron los snapshots de Kings actuales.');
      setConfirmCerrar(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {success && (
        <div className="bg-status-libre/10 border border-status-libre/30 rounded-lg px-3 py-2 text-[12px] text-status-libre">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">
          {error}
        </div>
      )}

      {!isActiva && (
        <button
          onClick={handleActivar}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-accent text-on-accent text-[13px] font-semibold hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Procesando...' : '🏆 Activar temporada'}
        </button>
      )}

      {isActiva && !confirmCerrar && (
        <button
          onClick={() => setConfirmCerrar(true)}
          disabled={loading}
          className="w-full py-2.5 rounded-lg border border-error/40 text-error text-[13px] font-semibold hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cerrar temporada
        </button>
      )}

      {isActiva && confirmCerrar && (
        <div className="bg-error/8 border border-error/30 rounded-xl p-4">
          <div className="text-[13px] font-medium text-on-surface mb-1">
            ¿Confirmar cierre de &quot;{nombre}&quot;?
          </div>
          <div className="text-[11px] text-on-surface-variant mb-4">
            Se registrarán snapshots de los equipos King actuales en el historial.
            Esta acción no se puede deshacer.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmCerrar(false)}
              disabled={loading}
              className="flex-1 py-2 rounded-lg border border-outline-variant text-[12px] text-on-surface-variant hover:border-outline transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCerrar}
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-error text-white text-[12px] font-semibold hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cerrando...' : 'Confirmar cierre'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
