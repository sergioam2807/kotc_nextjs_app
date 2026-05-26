'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  eventoId: string;
  nombre: string;
  isActivo: boolean;
}

export function EventoAdminActions({ eventoId, nombre, isActivo }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmNombre, setConfirmNombre] = useState('');

  async function patch(updates: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/eventos/${eventoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
    return body;
  }

  async function handleToggleActivo() {
    setLoading('toggle');
    try {
      await patch({ activo: !isActivo });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar.');
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    if (confirmNombre !== nombre) {
      setError('El nombre no coincide.');
      return;
    }
    setLoading('delete');
    setError(null);
    try {
      const res = await fetch(`/api/admin/eventos/${eventoId}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      router.push('/admin/eventos');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar.');
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle activo */}
      <button
        onClick={handleToggleActivo}
        disabled={loading === 'toggle'}
        className={`w-full py-3 rounded-xl text-[13px] font-semibold transition-all border disabled:opacity-50 ${
          isActivo
            ? 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
            : 'bg-status-libre/15 border-status-libre/30 text-status-libre hover:brightness-110'
        }`}
      >
        {loading === 'toggle'
          ? 'Actualizando...'
          : isActivo
          ? '⏸ Desactivar evento'
          : '▶ Activar evento (publicar)'}
      </button>

      {/* Eliminar */}
      {!showDelete ? (
        <button
          onClick={() => setShowDelete(true)}
          className="w-full py-3 rounded-xl text-[13px] font-semibold border border-outline-variant text-error hover:bg-error/5 transition-colors"
        >
          Eliminar evento
        </button>
      ) : (
        <div className="bg-error/5 border border-error/25 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[12px] text-on-surface">
            Escribe <strong className="text-error">{nombre}</strong> para confirmar la eliminación.
          </p>
          <input
            type="text"
            value={confirmNombre}
            onChange={e => setConfirmNombre(e.target.value)}
            placeholder={nombre}
            className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-error/40 transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowDelete(false); setConfirmNombre(''); setError(null); }}
              className="flex-1 py-2 rounded-lg border border-outline-variant text-[12px] text-on-surface-variant hover:border-outline transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={loading === 'delete' || confirmNombre !== nombre}
              className="flex-1 py-2 rounded-lg bg-error text-white text-[12px] font-semibold hover:brightness-90 transition-all disabled:opacity-40"
            >
              {loading === 'delete' ? 'Eliminando...' : 'Eliminar definitivamente'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">
          {error}
        </div>
      )}
    </div>
  );
}
