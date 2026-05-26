'use client';

import { useState, useMemo } from 'react';
import type { Desafio1v1ConDatos, ProfileSimple } from './types';

interface CanchaSimple {
  id: string;
  nombre: string;
  direccion: string;
}

interface Props {
  jugadores: ProfileSimple[];
  canchas: CanchaSimple[];
  retadoPreseleccionado?: string | null;
  onClose: () => void;
  onSuccess: (desafio: Desafio1v1ConDatos) => void;
}

const inputClass =
  'w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline/50 outline-none focus:border-accent/40 transition-colors';

const labelClass =
  'block text-[11px] text-outline mb-1.5 font-semibold uppercase tracking-[0.08em]';

function iniciales(nombre: string): string {
  const words = nombre.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase();
}

export function NuevoDesafio1v1Modal({
  jugadores,
  canchas,
  retadoPreseleccionado,
  onClose,
  onSuccess,
}: Props) {
  const preseleccionado = jugadores.find(j => j.id === retadoPreseleccionado);

  const [retadoId,  setRetadoId]  = useState(retadoPreseleccionado ?? '');
  const [canchaId,  setCanchaId]  = useState('');
  const [fecha,     setFecha]     = useState('');
  const [mensaje,   setMensaje]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [busqJugador, setBusqJugador] = useState('');
  const [busqCancha,  setBusqCancha]  = useState('');

  const jugadorSeleccionado = jugadores.find(j => j.id === retadoId) ?? preseleccionado;
  const canchaSeleccionada  = canchas.find(c => c.id === canchaId);

  const jugadoresFiltrados = useMemo(() => {
    if (!busqJugador.trim()) return jugadores.slice(0, 6);
    const q = busqJugador.toLowerCase();
    return jugadores
      .filter(j =>
        (j.display_name ?? j.username ?? '').toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [jugadores, busqJugador]);

  const canchasFiltradas = useMemo(() => {
    if (!busqCancha.trim()) return canchas.slice(0, 5);
    const q = busqCancha.toLowerCase();
    return canchas
      .filter(c => c.nombre.toLowerCase().includes(q) || c.direccion.toLowerCase().includes(q))
      .slice(0, 5);
  }, [canchas, busqCancha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!retadoId) { setError('Selecciona un rival.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/desafios-1v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retado_id: retadoId,
          deporte: 'basketball',
          formato: '1v1',
          cancha_id: canchaId || null,
          fecha: fecha || null,
          mensaje: mensaje.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      const { desafio } = await res.json();

      // Enrich with profile data for optimistic update
      const retador = jugadores.find(j => j.id === retadoId) ?? null;
      onSuccess({
        ...desafio,
        retador: null,   // will refresh from server
        retado: retador,
        resultado: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-surface/80 backdrop-blur-sm overflow-y-auto p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-surface-container border border-outline-variant sm:rounded-xl rounded-t-xl p-6 shadow-[0_8px_48px_rgba(0,0,0,0.6)] overflow-y-auto max-h-[100dvh] sm:max-h-[92dvh]"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-outline hover:text-on-surface transition-colors text-[20px] leading-none z-10"
        >
          ×
        </button>

        <div className="text-[15px] font-bold text-on-surface mb-1 pr-10">⚔️ Nuevo desafío 1v1</div>
        <div className="text-[11px] text-outline mb-5">🏀 Basketball · Duelo individual</div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* ── Jugador rival ──────────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>Jugador rival <span className="text-error">*</span></label>
            {jugadorSeleccionado ? (
              <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2">
                <div className="flex items-center gap-2.5">
                  {jugadorSeleccionado.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={jugadorSeleccionado.avatar_url}
                      alt=""
                      className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {iniciales(jugadorSeleccionado.display_name ?? jugadorSeleccionado.username ?? '?')}
                    </div>
                  )}
                  <span className="text-[12px] text-on-surface">
                    {jugadorSeleccionado.display_name ?? jugadorSeleccionado.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setRetadoId(''); setBusqJugador(''); }}
                  className="text-outline hover:text-on-surface-variant text-[12px] transition-colors ml-2"
                >
                  cambiar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={busqJugador}
                  onChange={e => setBusqJugador(e.target.value)}
                  placeholder="Buscar jugador por nombre..."
                  autoFocus
                  className={inputClass}
                />
                {jugadoresFiltrados.length > 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-y-auto max-h-[160px]">
                    {jugadoresFiltrados.map(j => {
                      const nombre = j.display_name ?? j.username ?? 'Jugador';
                      return (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => { setRetadoId(j.id); setBusqJugador(''); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-left"
                        >
                          {j.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={j.avatar_url} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-accent/15 text-accent flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                              {iniciales(nombre)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{nombre}</div>
                            {j.nivel && (
                              <div className="text-[10px] text-outline">Nv. {j.nivel}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {busqJugador.trim() && jugadoresFiltrados.length === 0 && (
                  <div className="text-[11px] text-outline text-center py-3">
                    Sin resultados para "{busqJugador}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Cancha (opcional) ──────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>
              Cancha <span className="normal-case text-outline/50">(opcional)</span>
            </label>
            {canchaSeleccionada ? (
              <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] text-on-surface truncate">{canchaSeleccionada.nombre}</span>
                  <span className="text-[10px] text-outline truncate">{canchaSeleccionada.direccion}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setCanchaId(''); setBusqCancha(''); }}
                  className="text-outline hover:text-on-surface-variant text-[12px] ml-2 flex-shrink-0 transition-colors"
                >
                  cambiar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={busqCancha}
                  onChange={e => setBusqCancha(e.target.value)}
                  placeholder="Buscar cancha (opcional)..."
                  className={inputClass}
                />
                {busqCancha.trim() && canchasFiltradas.length > 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-y-auto max-h-[140px]">
                    {canchasFiltradas.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCanchaId(c.id); setBusqCancha(''); }}
                        className="w-full flex flex-col px-3 py-2 text-left hover:bg-surface-container transition-colors"
                      >
                        <span className="text-[12px] text-on-surface-variant hover:text-on-surface">{c.nombre}</span>
                        <span className="text-[10px] text-outline">{c.direccion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Fecha y hora (opcional) ────────────────────────────────────── */}
          <div>
            <label className={labelClass}>
              Fecha y hora <span className="normal-case text-outline/50">(opcional)</span>
            </label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface outline-none focus:border-accent/40 transition-colors [color-scheme:light_dark]"
            />
            {fecha && (
              <button
                type="button"
                onClick={() => setFecha('')}
                className="text-[10px] text-outline hover:text-on-surface-variant mt-1 transition-colors"
              >
                ✕ Quitar fecha
              </button>
            )}
          </div>

          {/* ── Mensaje (opcional) ─────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>
              Mensaje <span className="normal-case text-outline/50">(opcional)</span>
            </label>
            <textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Dale contexto a tu rival, ej: &quot;Cancha del barrio, mañana a las 7 pm&quot;"
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline/50 outline-none focus:border-accent/40 transition-colors resize-none"
            />
          </div>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {error && (
            <div className="bg-error/15 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !retadoId}
            className="w-full bg-accent text-on-accent rounded-lg py-2.5 text-[13px] font-bold hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1 min-h-[44px]"
          >
            {loading ? 'Enviando...' : '⚔️ Enviar desafío 1v1'}
          </button>
        </form>
      </div>
    </div>
  );
}
