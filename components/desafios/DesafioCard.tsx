'use client';

import { useState } from 'react';
import type { DesafioConDatos } from './types';

interface Props {
  desafio: DesafioConDatos;
  equipoId: string;
  onEstadoCambiado: (id: string, estado: DesafioConDatos['estado']) => void;
}

const estadoBadgeStyle: Record<DesafioConDatos['estado'], { bg: string; color: string; label: string }> = {
  pendiente: { bg: '#F5C34420', color: '#F5C344', label: 'Pendiente' },
  aceptado: { bg: '#5a9e5a20', color: '#5a9e5a', label: 'Aceptado' },
  rechazado: { bg: '#E24B4A20', color: '#E24B4A', label: 'Rechazado' },
  jugado: { bg: '#33333320', color: '#666', label: 'Jugado' },
};

function formatFecha(fechaStr: string): string {
  const d = new Date(fechaStr);
  const fecha = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const capitalizedFecha = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  return `${capitalizedFecha} · ${hora}`;
}

export function DesafioCard({ desafio, equipoId, onEstadoCambiado }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const badge = estadoBadgeStyle[desafio.estado];
  const esEnviado = desafio.equipo_retador_id === equipoId;
  const esRecibido = desafio.equipo_retado_id === equipoId;
  const puedeAccionar = desafio.estado === 'pendiente' && esRecibido;

  async function handleAccion(estado: 'aceptado' | 'rechazado') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/desafios/${desafio.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      onEstadoCambiado(desafio.id, estado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`bg-[#0f0f12] border border-[#1a1a1f] rounded-[12px] p-4 hover:border-[#2a2a2a] transition-colors${desafio.estado === 'rechazado' ? ' opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] px-2 py-0.5 rounded-[4px] font-medium"
            style={{ background: '#1e1e24', color: '#888' }}
          >
            {desafio.deporte}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-[4px] font-medium"
            style={{ background: '#F5C34420', color: '#F5C344' }}
          >
            {desafio.formato}
          </span>
          {esEnviado ? (
            <span className="text-[10px] px-2 py-0.5 rounded-[4px] font-medium" style={{ background: '#1a1a1f', color: '#555' }}>
              Enviado
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-[4px] font-medium" style={{ background: '#1e1e2a', color: '#8888cc' }}>
              Recibido
            </span>
          )}
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-[4px] font-medium"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div
          className="text-[13px] font-semibold"
          style={{ color: desafio.equipo_retador_id === equipoId ? desafio.equipo_retador.color : '#ddd' }}
        >
          {desafio.equipo_retador.nombre}
        </div>
        <div className="text-[11px] font-medium" style={{ color: '#444' }}>vs</div>
        <div
          className="text-[13px] font-semibold"
          style={{ color: desafio.equipo_retado_id === equipoId ? desafio.equipo_retado.color : '#ddd' }}
        >
          {desafio.equipo_retado.nombre}
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-3">
        <div className="text-[11px]" style={{ color: '#555' }}>
          📍 {desafio.cancha.nombre}
        </div>
        <div className="text-[11px]" style={{ color: '#555' }}>
          🕐 {formatFecha(desafio.fecha)}
        </div>
        {desafio.mensaje && (
          <div className="text-[11px] italic mt-1" style={{ color: '#444' }}>
            "{desafio.mensaje}"
          </div>
        )}
      </div>

      {error && (
        <div
          className="text-[10px] px-2 py-1 rounded-[6px] mb-2"
          style={{ background: '#E24B4A20', color: '#E24B4A' }}
        >
          {error}
        </div>
      )}

      {puedeAccionar && (
        <div className="flex gap-1.5 mt-1">
          <button
            onClick={() => handleAccion('aceptado')}
            disabled={loading}
            className="rounded-[8px] px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#5a9e5a20', color: '#5a9e5a', border: '1px solid #5a9e5a40' }}
          >
            {loading ? '...' : 'Aceptar'}
          </button>
          <button
            onClick={() => handleAccion('rechazado')}
            disabled={loading}
            className="rounded-[8px] px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#E24B4A20', color: '#E24B4A', border: '1px solid #E24B4A40' }}
          >
            {loading ? '...' : 'Rechazar'}
          </button>
        </div>
      )}
    </div>
  );
}
