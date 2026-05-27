'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DesafioConDatos, EstadoDesafio, ResultadoDesafio } from './types';
import { ProponeResultadoModal } from './ProponeResultadoModal';

interface Props {
  desafio: DesafioConDatos;
  equipoId: string;
  onEstadoCambiado: (id: string, estado: EstadoDesafio, resultado?: ResultadoDesafio) => void;
}

const estadoBadgeStyle: Record<EstadoDesafio, { bg: string; color: string; label: string }> = {
  pendiente:          { bg: 'bg-accent/15',              color: 'text-accent',               label: 'Pendiente'          },
  aceptado:           { bg: 'bg-status-libre/15',        color: 'text-status-libre',          label: 'Aceptado'           },
  rechazado:          { bg: 'bg-error/15',               color: 'text-error',                 label: 'Rechazado'          },
  jugado:             { bg: 'bg-surface-container',      color: 'text-on-surface-variant',    label: 'Jugado'             },
  resultado_pendiente:{ bg: 'bg-primary/15',             color: 'text-primary',               label: 'Resultado pendiente'},
  disputado:          { bg: 'bg-error/15',               color: 'text-error',                 label: 'Disputado'          },
  completado:         { bg: 'bg-status-libre/15',        color: 'text-status-libre',          label: 'Completado'         },
  cancelado:          { bg: 'bg-surface-container',      color: 'text-on-surface-variant',    label: 'Cancelado'          },
};

function formatFecha(fechaStr: string): string {
  const d = new Date(fechaStr);
  const fecha = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return `${fecha.charAt(0).toUpperCase() + fecha.slice(1)} · ${hora}`;
}

export function DesafioCard({ desafio, equipoId, onEstadoCambiado }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProponer, setShowProponer] = useState(false);
  const [showReproponer, setShowReproponer] = useState(false);
  const [desafioLocal, setDesafioLocal] = useState<DesafioConDatos>(desafio);

  const badge = estadoBadgeStyle[desafioLocal.estado];
  const esEnviado = desafioLocal.equipo_retador_id === equipoId;
  const esRecibido = desafioLocal.equipo_retado_id === equipoId;
  const puedeAceptarRechazar = desafioLocal.estado === 'pendiente' && esRecibido;

  const resultado = desafioLocal.resultado ?? null;

  // Helpers for resultado display
  const ganador = resultado
    ? desafioLocal.equipo_retador_id === resultado.ganador_id
      ? desafioLocal.equipo_retador
      : desafioLocal.equipo_retado
    : null;

  const rival = desafioLocal.equipo_retador_id === equipoId
    ? desafioLocal.equipo_retado
    : desafioLocal.equipo_retador;

  const propusoYo = resultado?.propuesto_por === equipoId;

  async function handleAccion(estado: 'aceptado' | 'rechazado') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/desafios/${desafioLocal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const updated = { ...desafioLocal, estado };
      setDesafioLocal(updated);
      onEstadoCambiado(desafioLocal.id, estado);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmar() {
    if (!resultado) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/resultados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resultado.id, accion: 'confirmar' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const body = await res.json();
      const updatedResultado: ResultadoDesafio = body.resultado;
      const updated = { ...desafioLocal, estado: 'completado' as EstadoDesafio, resultado: updatedResultado };
      setDesafioLocal(updated);
      onEstadoCambiado(desafioLocal.id, 'completado', updatedResultado);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisputar() {
    if (!resultado) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/resultados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resultado.id, accion: 'disputar' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const body = await res.json();
      const updatedResultado: ResultadoDesafio = body.resultado;
      const updated = { ...desafioLocal, estado: 'disputado' as EstadoDesafio, resultado: updatedResultado };
      setDesafioLocal(updated);
      onEstadoCambiado(desafioLocal.id, 'disputado', updatedResultado);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  async function handleAceptarOriginal() {
    if (!resultado) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/resultados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resultado.id, accion: 'aceptar_original' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      const data = await res.json();
      const updatedResultado: ResultadoDesafio = data.resultado;
      const updated = { ...desafioLocal, estado: 'completado' as EstadoDesafio, resultado: updatedResultado };
      setDesafioLocal(updated);
      onEstadoCambiado(desafioLocal.id, 'completado', updatedResultado);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  function handleReProponerSuccess(nuevoResultado: ResultadoDesafio) {
    const updated: DesafioConDatos = {
      ...desafioLocal,
      estado: 'resultado_pendiente',
      resultado: nuevoResultado,
    };
    setDesafioLocal(updated);
    setShowReproponer(false);
    onEstadoCambiado(desafioLocal.id, 'resultado_pendiente', nuevoResultado);
    router.refresh();
  }

  function handleProponerSuccess(nuevoResultado: ResultadoDesafio) {
    const updated: DesafioConDatos = {
      ...desafioLocal,
      estado: 'resultado_pendiente',
      resultado: nuevoResultado,
    };
    setDesafioLocal(updated);
    setShowProponer(false);
    onEstadoCambiado(desafioLocal.id, 'resultado_pendiente', nuevoResultado);
    router.refresh();
  }

  return (
    <>
      <div
        className={`bg-surface-container-low border border-outline-variant rounded-xl p-4 hover:border-outline transition-colors${desafioLocal.estado === 'rechazado' ? ' opacity-60' : ''}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wide bg-surface-container text-on-surface-variant">
              {desafioLocal.deporte}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wide bg-accent/15 text-accent">
              {desafioLocal.formato}
            </span>
            {esEnviado ? (
              <span className="text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wide bg-surface-container text-outline">
                Enviado
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wide bg-primary/15 text-primary">
                Recibido
              </span>
            )}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wide ${badge.bg} ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="text-[13px] font-semibold"
            style={{ color: desafioLocal.equipo_retador_id === equipoId ? desafioLocal.equipo_retador.color : undefined }}
          >
            <span className={desafioLocal.equipo_retador_id === equipoId ? '' : 'text-on-surface'}>
              {desafioLocal.equipo_retador.nombre}
            </span>
          </div>
          <div className="text-[11px] font-medium text-outline">vs</div>
          <div
            className="text-[13px] font-semibold"
            style={{ color: desafioLocal.equipo_retado_id === equipoId ? desafioLocal.equipo_retado.color : undefined }}
          >
            <span className={desafioLocal.equipo_retado_id === equipoId ? '' : 'text-on-surface'}>
              {desafioLocal.equipo_retado.nombre}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1 mb-3">
          <div className="text-[11px] text-on-surface-variant">📍 {desafioLocal.cancha.nombre}</div>
          <div className="text-[11px] text-on-surface-variant">🕐 {formatFecha(desafioLocal.fecha)}</div>
          {desafioLocal.mensaje && (
            <div className="text-[11px] italic mt-1 text-outline">"{desafioLocal.mensaje}"</div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="text-[10px] px-2 py-1 rounded-md mb-2 bg-error/15 text-error border border-error/25">
            {error}
          </div>
        )}

        {/* Actions: aceptar/rechazar */}
        {puedeAceptarRechazar && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => handleAccion('aceptado')}
              disabled={loading}
              className="flex-1 sm:flex-initial rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-status-libre/15 text-status-libre border border-status-libre/25 hover:bg-status-libre/25 min-h-[40px]"
            >
              {loading ? '...' : 'Aceptar'}
            </button>
            <button
              onClick={() => handleAccion('rechazado')}
              disabled={loading}
              className="flex-1 sm:flex-initial rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-error/15 text-error border border-error/25 hover:bg-error/25 min-h-[40px]"
            >
              {loading ? '...' : 'Rechazar'}
            </button>
          </div>
        )}

        {/* Actions: proponer resultado (estado aceptado, cualquier participante) */}
        {desafioLocal.estado === 'aceptado' && (esEnviado || esRecibido) && (
          <div className="mt-1">
            <button
              onClick={() => setShowProponer(true)}
              disabled={loading}
              className="w-full sm:w-auto rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-accent/15 text-accent border border-accent/25 hover:bg-accent/25 min-h-[40px]"
            >
              🏆 Proponer resultado
            </button>
          </div>
        )}

        {/* Actions: resultado_pendiente */}
        {desafioLocal.estado === 'resultado_pendiente' && resultado && (
          <div className="mt-1">
            {propusoYo ? (
              <>
                <div className="text-[11px] text-outline italic">
                  ⏳ Esperando que {rival.nombre} confirme el resultado...
                </div>
                <div className="text-[11px] text-on-surface-variant mt-1">
                  Propusiste:{' '}
                  <span style={{ color: ganador?.color }}>{ganador?.nombre}</span> ganó
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] text-on-surface-variant mb-2">
                  <span style={{ color: rival.color }}>{rival.nombre}</span> propone:{' '}
                  <strong style={{ color: ganador?.color }}>{ganador?.nombre}</strong> ganó
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleConfirmar}
                    disabled={loading}
                    className="flex-1 sm:flex-initial rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-status-libre/15 text-status-libre border border-status-libre/25 hover:bg-status-libre/25 min-h-[40px]"
                  >
                    {loading ? '...' : '✓ Confirmar'}
                  </button>
                  <button
                    onClick={handleDisputar}
                    disabled={loading}
                    className="flex-1 sm:flex-initial rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-error/15 text-error border border-error/25 hover:bg-error/25 min-h-[40px]"
                  >
                    {loading ? '...' : '✗ Disputar'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Estado: disputado — resolution UI */}
        {desafioLocal.estado === 'disputado' && resultado && (() => {
          // Days until auto-cancel (5 days from disputa_at)
          const disputa_at = resultado.disputa_at;
          let diasRestantes: number | null = null;
          if (disputa_at) {
            const deadline = new Date(disputa_at).getTime() + 5 * 24 * 60 * 60 * 1000;
            diasRestantes = Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000));
          }
          return (
            <div className="mt-1">
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11px] font-semibold text-error">⚠️ Resultado en disputa</span>
              </div>
              {/* Original result */}
              <div className="text-[11px] text-on-surface-variant mb-1">
                Resultado propuesto:{' '}
                <span style={{ color: ganador?.color }} className="font-semibold">{ganador?.nombre ?? '?'}</span>
                {' '}ganó
              </div>
              {/* Timeout countdown */}
              {diasRestantes !== null && (
                <div className={`text-[10px] mb-3 ${diasRestantes <= 1 ? 'text-error' : 'text-outline'}`}>
                  ⏱{' '}
                  {diasRestantes > 0
                    ? `Se anulará automáticamente en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} si no se resuelve`
                    : 'En proceso de anulación automática'}
                </div>
              )}
              {!disputa_at && (
                <div className="text-[10px] text-outline mb-3">
                  ⏱ Esperando resolución manual
                </div>
              )}
              {/* Resolution actions */}
              <div className="flex flex-col gap-1.5">
                {/* Only the non-proposer can accept the original result */}
                {!propusoYo && (
                  <button
                    onClick={handleAceptarOriginal}
                    disabled={loading}
                    className="w-full rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-status-libre/15 text-status-libre border border-status-libre/25 hover:bg-status-libre/25 min-h-[40px]"
                  >
                    {loading ? '...' : '✅ Aceptar resultado original'}
                  </button>
                )}
                {/* Both teams can re-propose */}
                <button
                  onClick={() => setShowReproponer(true)}
                  disabled={loading}
                  className="w-full rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-accent/15 text-accent border border-accent/25 hover:bg-accent/25 min-h-[40px]"
                >
                  🔄 Re-proponer resultado
                </button>
              </div>
            </div>
          );
        })()}

        {/* Estado: completado o jugado con resultado */}
        {(desafioLocal.estado === 'completado' || desafioLocal.estado === 'jugado') && ganador && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: ganador.color }}>
              🏆 {ganador.nombre} ganó
            </span>
            {resultado && (resultado.puntos_retador != null || resultado.puntos_retado != null) && (
              <span className="text-[11px] text-outline font-mono">
                {resultado.puntos_retador ?? '—'} - {resultado.puntos_retado ?? '—'}
              </span>
            )}
          </div>
        )}
      </div>

      {showProponer && (
        <ProponeResultadoModal
          desafio={desafioLocal}
          equipoId={equipoId}
          onClose={() => setShowProponer(false)}
          onSuccess={handleProponerSuccess}
        />
      )}

      {showReproponer && desafioLocal.resultado && (
        <ProponeResultadoModal
          desafio={desafioLocal}
          equipoId={equipoId}
          resultadoId={desafioLocal.resultado.id}
          onClose={() => setShowReproponer(false)}
          onSuccess={handleReProponerSuccess}
        />
      )}
    </>
  );
}
