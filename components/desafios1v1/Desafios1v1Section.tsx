'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Desafio1v1ConDatos, ProfileSimple } from './types';
import { NuevoDesafio1v1Modal } from './NuevoDesafio1v1Modal';

interface CanchaSimple {
  id: string;
  nombre: string;
  direccion: string;
}

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀',
  futbol: '⚽',
  voleibol: '🏐',
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProfileIniciales(nombre: string): string {
  const words = nombre.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase();
}

interface Props {
  desafios: Desafio1v1ConDatos[];
  userId: string;
  jugadores: ProfileSimple[];
  canchas: CanchaSimple[];
}

export function Desafios1v1Section({ desafios: initial, userId, jugadores, canchas }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [desafios, setDesafios] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Track propose-result form per desafio
  const [proponiendo, setProponiendo] = useState<string | null>(null);
  const [propGanador, setPropGanador] = useState<string>('');
  const [propPtsR, setPropPtsR] = useState('');
  const [propPtsD, setPropPtsD] = useState('');
  const [propError, setPropError] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function accionDesafio(desafioId: string, accion: string) {
    setLoadingId(desafioId);
    const res = await fetch(`/api/desafios-1v1/${desafioId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion }),
    });
    if (res.ok) {
      const { estado } = await res.json();
      setDesafios(prev =>
        prev.map(d => (d.id === desafioId ? { ...d, estado } : d)),
      );
      refresh();
    }
    setLoadingId(null);
  }

  async function handleProponer(desafioId: string) {
    setPropError(null);
    if (!propGanador) { setPropError('Selecciona el ganador'); return; }
    setLoadingId(desafioId);

    const ptsR = propPtsR !== '' ? parseInt(propPtsR, 10) : null;
    const ptsD = propPtsD !== '' ? parseInt(propPtsD, 10) : null;

    const res = await fetch('/api/resultados-1v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desafio_id: desafioId, ganador_id: propGanador, puntos_retador: ptsR, puntos_retado: ptsD }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setPropError(data.error ?? 'Error al proponer resultado'); setLoadingId(null); return; }

    setDesafios(prev =>
      prev.map(d =>
        d.id === desafioId
          ? {
              ...d,
              estado: 'resultado_pendiente',
              resultado: { id: '', ganador_id: propGanador, puntos_retador: ptsR, puntos_retado: ptsD, propuesto_por: userId, confirmado_por_perdedor: false, disputado: false, confirmado_at: null },
            }
          : d,
      ),
    );
    setProponiendo(null);
    setPropGanador('');
    setPropPtsR('');
    setPropPtsD('');
    setLoadingId(null);
    refresh();
  }

  async function handleConfirmar(desafioId: string) {
    setLoadingId(desafioId);
    const res = await fetch('/api/resultados-1v1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desafio_id: desafioId, accion: 'confirmar' }),
    });
    if (res.ok) {
      setDesafios(prev =>
        prev.map(d =>
          d.id === desafioId
            ? { ...d, estado: 'completado', resultado: d.resultado ? { ...d.resultado, confirmado_por_perdedor: true } : null }
            : d,
        ),
      );
      refresh();
    }
    setLoadingId(null);
  }

  // ── Groups ──────────────────────────────────────────────────────────────────
  const recibidos   = desafios.filter(d => d.retado_id  === userId && d.estado === 'pendiente');
  const enviados    = desafios.filter(d => d.retador_id === userId && d.estado === 'pendiente');
  const activos     = desafios.filter(d => ['aceptado', 'resultado_pendiente'].includes(d.estado));
  const completados = desafios.filter(d => ['completado', 'rechazado'].includes(d.estado));

  function renderCard(d: Desafio1v1ConDatos) {
    const isRetador = d.retador_id === userId;
    const rival = isRetador ? d.retado : d.retador;
    const rivalNombre = rival?.display_name ?? rival?.username ?? 'Jugador';
    const emoji = DEPORTE_EMOJI[d.deporte] ?? '🏟️';
    const isBusy = loadingId === d.id;
    const isProponiendoThis = proponiendo === d.id;

    return (
      <div key={d.id} className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-[13px] font-bold flex-shrink-0">
            {ProfileIniciales(rivalNombre)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-on-surface truncate">{rivalNombre}</div>
            <div className="text-[11px] text-on-surface-variant">
              {emoji} {d.deporte} · 1v1
              {d.fecha ? ` · ${formatFecha(d.fecha)}` : ''}
            </div>
          </div>
          <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            d.estado === 'pendiente'           ? 'bg-yellow-500/15 text-yellow-600' :
            d.estado === 'aceptado'            ? 'bg-primary/15 text-primary' :
            d.estado === 'resultado_pendiente' ? 'bg-orange-500/15 text-orange-500' :
            d.estado === 'completado'          ? 'bg-status-libre/15 text-status-libre' :
                                                 'bg-error/15 text-error'
          }`}>
            {d.estado === 'pendiente'           ? 'Pendiente' :
             d.estado === 'aceptado'            ? 'Aceptado' :
             d.estado === 'resultado_pendiente' ? 'Resultado pend.' :
             d.estado === 'completado'          ? 'Completado' : 'Rechazado'}
          </div>
        </div>

        {/* Mensaje */}
        {d.mensaje && (
          <p className="text-[11px] text-on-surface-variant italic mb-3 border-l-2 border-outline-variant pl-2">
            "{d.mensaje}"
          </p>
        )}

        {/* Resultado completado */}
        {d.estado === 'completado' && d.resultado && (
          <div className="bg-surface-container rounded-lg px-3 py-2 text-[12px] mb-3 flex items-center gap-2">
            <span>{d.resultado.ganador_id === userId ? '🏆' : '😞'}</span>
            <span className="font-semibold">{d.resultado.ganador_id === userId ? 'Ganaste' : 'Perdiste'}</span>
            {(d.resultado.puntos_retador !== null || d.resultado.puntos_retado !== null) && (
              <span className="text-on-surface-variant ml-1">
                {d.resultado.puntos_retador ?? '?'} – {d.resultado.puntos_retado ?? '?'}
              </span>
            )}
          </div>
        )}

        {/* Recibido pendiente: accept / reject */}
        {d.retado_id === userId && d.estado === 'pendiente' && (
          <div className="flex gap-2">
            <button onClick={() => accionDesafio(d.id, 'aceptar')} disabled={isBusy}
              className="flex-1 bg-accent text-on-accent font-semibold text-[12px] py-2 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer min-h-[40px]">
              {isBusy ? '…' : 'Aceptar'}
            </button>
            <button onClick={() => accionDesafio(d.id, 'rechazar')} disabled={isBusy}
              className="px-3 bg-error/10 border border-error/25 text-error text-[12px] py-2 rounded-lg hover:bg-error/20 disabled:opacity-50 cursor-pointer min-h-[40px]">
              {isBusy ? '…' : 'Rechazar'}
            </button>
          </div>
        )}

        {/* Enviado pendiente: cancel */}
        {d.retador_id === userId && d.estado === 'pendiente' && (
          <button onClick={() => accionDesafio(d.id, 'cancelar')} disabled={isBusy}
            className="w-full text-[12px] text-on-surface-variant border border-outline-variant rounded-lg py-2 hover:border-outline disabled:opacity-50 cursor-pointer min-h-[40px]">
            {isBusy ? '…' : 'Cancelar desafío'}
          </button>
        )}

        {/* Aceptado: marcar como jugado */}
        {d.estado === 'aceptado' && (
          <button onClick={() => accionDesafio(d.id, 'marcar_jugado')} disabled={isBusy}
            className="w-full bg-primary/15 text-primary border border-primary/25 font-semibold text-[12px] py-2 rounded-lg hover:bg-primary/25 disabled:opacity-50 cursor-pointer min-h-[40px]">
            {isBusy ? '…' : '📋 Registrar resultado'}
          </button>
        )}

        {/* resultado_pendiente */}
        {d.estado === 'resultado_pendiente' && (
          <>
            {/* Propuesta del rival */}
            {d.resultado && d.resultado.propuesto_por !== userId && (
              <div className="bg-surface-container rounded-lg px-3 py-2 text-[12px] mb-2">
                <div className="font-medium text-on-surface mb-1">Rival propone:</div>
                <div>
                  Ganador: <span className="font-semibold">{d.resultado.ganador_id === userId ? 'Tú' : rivalNombre}</span>
                  {(d.resultado.puntos_retador !== null || d.resultado.puntos_retado !== null) && (
                    <span className="text-on-surface-variant ml-2">{d.resultado.puntos_retador ?? '?'} – {d.resultado.puntos_retado ?? '?'}</span>
                  )}
                </div>
              </div>
            )}

            {/* Mi propuesta enviada */}
            {d.resultado && d.resultado.propuesto_por === userId && !isProponiendoThis && (
              <div className="bg-surface-container rounded-lg px-3 py-2 text-[11px] text-on-surface-variant mb-2">
                ⏳ Esperando que {rivalNombre} confirme el resultado...
              </div>
            )}

            {/* Botones */}
            {!isProponiendoThis && (
              <div className="flex gap-2">
                {(!d.resultado || d.resultado.propuesto_por !== userId) && (
                  <button
                    onClick={() => { setProponiendo(d.id); setPropGanador(''); setPropPtsR(''); setPropPtsD(''); setPropError(null); }}
                    className="flex-1 bg-accent text-on-accent font-semibold text-[12px] py-2 rounded-lg hover:opacity-90 cursor-pointer min-h-[40px]">
                    Proponer resultado
                  </button>
                )}
                {d.resultado && d.resultado.propuesto_por !== userId && (
                  <button onClick={() => handleConfirmar(d.id)} disabled={isBusy}
                    className="flex-1 bg-status-libre/15 text-status-libre border border-status-libre/25 font-semibold text-[12px] py-2 rounded-lg hover:bg-status-libre/25 disabled:opacity-50 cursor-pointer min-h-[40px]">
                    {isBusy ? '…' : '✓ Confirmar'}
                  </button>
                )}
              </div>
            )}

            {/* Form proponer */}
            {isProponiendoThis && (
              <div className="space-y-2.5">
                <div className="text-[12px] font-semibold text-on-surface">¿Quién ganó?</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPropGanador(userId)}
                    className={`flex-1 text-[12px] py-2 rounded-lg border transition-colors cursor-pointer ${propGanador === userId ? 'border-accent bg-accent/15 text-accent font-semibold' : 'border-outline-variant text-on-surface-variant hover:border-outline'}`}>
                    Yo gané
                  </button>
                  <button type="button" onClick={() => setPropGanador(d.retador_id === userId ? d.retado_id : d.retador_id)}
                    className={`flex-1 text-[12px] py-2 rounded-lg border transition-colors cursor-pointer ${propGanador !== userId && propGanador !== '' ? 'border-error bg-error/10 text-error font-semibold' : 'border-outline-variant text-on-surface-variant hover:border-outline'}`}>
                    {rivalNombre} ganó
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <input type="number" min="0" placeholder="Mis pts" value={propPtsR} onChange={e => setPropPtsR(e.target.value)}
                    className="flex-1 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface focus:outline-none focus:border-outline" />
                  <span className="text-on-surface-variant text-[12px]">–</span>
                  <input type="number" min="0" placeholder="Rival pts" value={propPtsD} onChange={e => setPropPtsD(e.target.value)}
                    className="flex-1 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface focus:outline-none focus:border-outline" />
                </div>
                {propError && <p className="text-[11px] text-error">{propError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => handleProponer(d.id)} disabled={isBusy}
                    className="flex-1 bg-accent text-on-accent font-semibold text-[12px] py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer min-h-[40px]">
                    {isBusy ? '…' : 'Enviar resultado'}
                  </button>
                  <button onClick={() => setProponiendo(null)}
                    className="px-4 text-[12px] text-on-surface-variant border border-outline-variant rounded-lg hover:border-outline cursor-pointer">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const hayDesafios = desafios.length > 0;

  return (
    <>
      {/* Header con botón Nuevo 1v1 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[16px]">⚔️</span>
            <div>
              <div className="text-[15px] font-bold text-on-surface">Desafíos 1v1</div>
              <div className="text-[11px] text-outline">Duelos individuales · Basketball</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent text-on-accent rounded-lg px-3 py-2 text-[12px] font-bold hover:brightness-90 transition-all min-h-[40px] whitespace-nowrap flex-shrink-0"
        >
          <span className="sm:hidden">+ 1v1</span>
          <span className="hidden sm:inline">+ Nuevo 1v1</span>
        </button>
      </div>

      {/* Lista de desafíos */}
      {!hayDesafios ? (
        <div className="text-center py-10 text-on-surface-variant">
          <div className="text-[28px] mb-3">⚔️</div>
          <div className="text-[14px] font-semibold text-on-surface mb-1">Sin desafíos 1v1 aún</div>
          <p className="text-[12px] text-on-surface-variant max-w-xs mx-auto">
            Desafía a cualquier jugador a un duelo individual. No necesitas equipo.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-accent text-on-accent rounded-lg px-5 py-2.5 text-[13px] font-bold hover:brightness-90 transition-all"
          >
            Desafiar jugador →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {recibidos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-error text-white text-[9px] font-bold">{recibidos.length}</span>
                <span className="text-[11px] font-semibold text-on-surface uppercase tracking-[0.08em]">Recibidos</span>
              </div>
              <div className="space-y-2">{recibidos.map(renderCard)}</div>
            </div>
          )}
          {enviados.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-[0.08em] mb-2">Enviados</div>
              <div className="space-y-2">{enviados.map(renderCard)}</div>
            </div>
          )}
          {activos.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-[0.08em] mb-2">En curso</div>
              <div className="space-y-2">{activos.map(renderCard)}</div>
            </div>
          )}
          {completados.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-[0.08em] mb-2">Historial</div>
              <div className="space-y-2">{completados.map(renderCard)}</div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <NuevoDesafio1v1Modal
          jugadores={jugadores}
          canchas={canchas}
          onClose={() => setShowModal(false)}
          onSuccess={d => {
            setDesafios(prev => [d, ...prev]);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
