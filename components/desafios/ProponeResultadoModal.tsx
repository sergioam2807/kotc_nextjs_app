'use client';

import { useState } from 'react';
import type { DesafioConDatos, ResultadoDesafio } from './types';

interface Props {
  desafio: DesafioConDatos;
  equipoId: string;
  onClose: () => void;
  onSuccess: (resultado: ResultadoDesafio) => void;
}

export function ProponeResultadoModal({ desafio, equipoId, onClose, onSuccess }: Props) {
  const [ganadorSeleccionado, setGanadorSeleccionado] = useState<string | null>(null);
  const [puntosRetador, setPuntosRetador] = useState('');
  const [puntosRetado, setPuntosRetado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const miEquipo =
    desafio.equipo_retador_id === equipoId ? desafio.equipo_retador : desafio.equipo_retado;
  const rival =
    desafio.equipo_retador_id === equipoId ? desafio.equipo_retado : desafio.equipo_retador;

  async function handleProponer() {
    if (!ganadorSeleccionado) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desafio_id: desafio.id,
          ganador_id: ganadorSeleccionado,
          propuesto_por: equipoId,
          puntos_retador: puntosRetador !== '' ? parseInt(puntosRetador, 10) : null,
          puntos_retado:  puntosRetado  !== '' ? parseInt(puntosRetado,  10) : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      onSuccess(body.resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-surface/80 backdrop-blur-sm overflow-y-auto p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm bg-surface-container-low border border-outline-variant sm:rounded-xl rounded-t-xl p-6 max-h-[100dvh] sm:max-h-[92dvh] overflow-y-auto"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-bold text-on-surface">¿Quién ganó?</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-10 h-10 -mr-2 flex items-center justify-center text-outline hover:text-on-surface-variant transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Puntajes opcionales */}
        <div className="mb-4">
          <p className="text-[10px] text-outline uppercase tracking-wide mb-2 font-semibold">Puntaje (opcional)</p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-outline mb-1 block truncate" style={{ color: desafio.equipo_retador.color }}>
                {desafio.equipo_retador.nombre}
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={puntosRetador}
                onChange={(e) => setPuntosRetador(e.target.value)}
                placeholder="—"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface text-center outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div className="text-[12px] text-outline font-bold pt-5">vs</div>
            <div className="flex-1">
              <label className="text-[10px] text-outline mb-1 block truncate" style={{ color: desafio.equipo_retado.color }}>
                {desafio.equipo_retado.nombre}
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={puntosRetado}
                onChange={(e) => setPuntosRetado(e.target.value)}
                placeholder="—"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface text-center outline-none focus:border-accent/40 transition-colors"
              />
            </div>
          </div>
        </div>

        <p className="text-[10px] text-outline uppercase tracking-wide mb-2 font-semibold">¿Quién ganó?</p>
        <div className="flex flex-col gap-3 mb-5">
          {/* Mi equipo */}
          <button
            type="button"
            onClick={() => setGanadorSeleccionado(miEquipo.id)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
              ganadorSeleccionado === miEquipo.id
                ? 'border-accent/60 bg-accent/10'
                : 'border-outline-variant bg-surface hover:border-outline'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: miEquipo.color }}
            />
            <div>
              <div className="text-[12px] font-semibold text-on-surface">{miEquipo.nombre}</div>
              <div className="text-[10px] text-outline">Mi equipo</div>
            </div>
            {ganadorSeleccionado === miEquipo.id && (
              <span className="ml-auto text-accent text-[14px]">✓</span>
            )}
          </button>

          {/* El rival */}
          <button
            type="button"
            onClick={() => setGanadorSeleccionado(rival.id)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
              ganadorSeleccionado === rival.id
                ? 'border-accent/60 bg-accent/10'
                : 'border-outline-variant bg-surface hover:border-outline'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: rival.color }}
            />
            <div>
              <div className="text-[12px] font-semibold text-on-surface">{rival.nombre}</div>
              <div className="text-[10px] text-outline">El rival</div>
            </div>
            {ganadorSeleccionado === rival.id && (
              <span className="ml-auto text-accent text-[14px]">✓</span>
            )}
          </button>
        </div>

        {error && (
          <div className="text-[10px] px-2 py-1 rounded-md mb-3 bg-error/15 text-error border border-error/25">
            {error}
          </div>
        )}

        <button
          onClick={handleProponer}
          disabled={!ganadorSeleccionado || loading}
          className="w-full rounded-lg px-3 py-3 text-[13px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-accent text-on-accent hover:brightness-90 min-h-[44px]"
        >
          {loading ? 'Enviando...' : 'Proponer resultado'}
        </button>

        <p className="text-center text-[10px] text-outline mt-2">
          El rival deberá confirmar
        </p>
      </div>
    </div>
  );
}
