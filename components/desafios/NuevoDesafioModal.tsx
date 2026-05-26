'use client';

import { useState, useMemo } from 'react';
import type { DesafioConDatos, EquipoSimple, CanchaSimple } from './types';
import type { ProfileSimple } from '@/components/desafios1v1/types';
import type { Desafio1v1ConDatos } from '@/components/desafios1v1/types';

interface Props {
  equipoId: string;
  equipos: EquipoSimple[];
  canchas: CanchaSimple[];
  jugadores1v1?: ProfileSimple[];
  canchaPreseleccionada?: string;
  equipoRetadoPreseleccionado?: string;
  onClose: () => void;
  onSuccess: (desafio: DesafioConDatos) => void;
  onSuccess1v1?: (desafio: Desafio1v1ConDatos) => void;
}

// ── Formatos disponibles ────────────────────────────────────────────────────
type ModoFormato = '1v1_individual' | 'equipo';

const FORMATOS_EQUIPO = [
  { value: '2v2',            label: '2v2' },
  { value: '3v3',            label: '3v3' },
  { value: '4v4',            label: '4v4' },
  { value: '5v5',            label: '5v5' },
  { value: 'equipo_completo', label: 'Equipo completo' },
];

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

export function NuevoDesafioModal({
  equipoId,
  equipos,
  canchas,
  jugadores1v1 = [],
  canchaPreseleccionada,
  equipoRetadoPreseleccionado,
  onClose,
  onSuccess,
  onSuccess1v1,
}: Props) {
  // ── Estado del modo ─────────────────────────────────────────────────────────
  const [modo, setModo] = useState<ModoFormato>('equipo');

  // ── Equipo mode ─────────────────────────────────────────────────────────────
  const [equipoRetadoId, setEquipoRetadoId] = useState(equipoRetadoPreseleccionado ?? '');
  const [formato, setFormato] = useState('');
  const [busquedaEquipo, setBusquedaEquipo] = useState('');

  // ── 1v1 mode ────────────────────────────────────────────────────────────────
  const [jugador1v1Id, setJugador1v1Id] = useState('');
  const [busquedaJugador, setBusquedaJugador] = useState('');

  // ── Shared ──────────────────────────────────────────────────────────────────
  const [canchaId, setCanchaId] = useState(canchaPreseleccionada ?? '');
  const [fecha, setFecha] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busquedaCancha, setBusquedaCancha] = useState('');

  const equipoSeleccionado   = equipos.find(e => e.id === equipoRetadoId);
  const canchaSeleccionada   = canchas.find(c => c.id === canchaId);
  const jugadorSeleccionado  = jugadores1v1.find(j => j.id === jugador1v1Id);

  const equiposFiltrados = useMemo(() => {
    if (!busquedaEquipo.trim()) return equipos.slice(0, 5);
    const q = busquedaEquipo.toLowerCase();
    return equipos.filter(e => e.nombre.toLowerCase().includes(q)).slice(0, 5);
  }, [equipos, busquedaEquipo]);

  const jugadoresFiltrados = useMemo(() => {
    if (!busquedaJugador.trim()) return jugadores1v1.slice(0, 6);
    const q = busquedaJugador.toLowerCase();
    return jugadores1v1
      .filter(j => (j.display_name ?? j.username ?? '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [jugadores1v1, busquedaJugador]);

  const canchasFiltradas = useMemo(() => {
    if (!busquedaCancha.trim()) return canchas.slice(0, 5);
    const q = busquedaCancha.toLowerCase();
    return canchas
      .filter(c => c.nombre.toLowerCase().includes(q) || c.direccion.toLowerCase().includes(q))
      .slice(0, 5);
  }, [canchas, busquedaCancha]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (modo === '1v1_individual') {
      // Individual 1v1 flow
      if (!jugador1v1Id) { setError('Selecciona un jugador rival.'); return; }

      setLoading(true);
      try {
        const res = await fetch('/api/desafios-1v1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            retado_id: jugador1v1Id,
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
        const retador = jugadores1v1.find(j => j.id === jugador1v1Id) ?? null;
        onSuccess1v1?.({
          ...desafio,
          retador: null,
          retado: retador,
          resultado: null,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado.');
        setLoading(false);
      }
      return;
    }

    // Team challenge flow
    if (!equipoRetadoId) { setError('Selecciona un equipo rival.'); return; }
    if (!canchaId)       { setError('Selecciona una cancha.'); return; }
    if (!formato)        { setError('Selecciona un formato.'); return; }
    if (!fecha)          { setError('Selecciona fecha y hora.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/desafios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipo_retado_id: equipoRetadoId,
          cancha_id: canchaId,
          deporte: 'basketball',
          formato,
          fecha,
          mensaje: mensaje.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      const { desafio } = await res.json();
      onSuccess(desafio);
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

        <div className="text-[15px] font-bold text-on-surface mb-1 pr-10">Nuevo desafío</div>
        <div className="text-[11px] text-outline mb-5">🏀 Basketball · Reta a otro jugador o equipo</div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* ── Selector de modo ─────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>Modalidad</label>
            <div className="flex flex-wrap gap-2">
              {/* 1v1 individual */}
              <button
                type="button"
                onClick={() => { setModo('1v1_individual'); setFormato(''); }}
                className={`px-3 py-2 rounded-lg text-[11px] border transition-colors flex-1 min-w-[80px] ${
                  modo === '1v1_individual'
                    ? 'bg-accent/15 border-accent/40 text-accent font-semibold'
                    : 'bg-surface-container-lowest border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
                }`}
              >
                ⚔️ 1v1 individual
              </button>
              {/* Formatos de equipo */}
              {FORMATOS_EQUIPO.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => { setModo('equipo'); setFormato(f.value); }}
                  className={`px-3 py-2 rounded-lg text-[11px] border transition-colors ${
                    modo === 'equipo' && formato === f.value
                      ? 'bg-accent/15 border-accent/40 text-accent font-semibold'
                      : 'bg-surface-container-lowest border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {modo === '1v1_individual' && (
              <p className="text-[10px] text-outline mt-1.5">
                Duelo individual — no necesitas equipo para este desafío.
              </p>
            )}
          </div>

          {/* ── Rival: jugador (1v1) o equipo ──────────────────────────── */}
          {modo === '1v1_individual' ? (
            <div>
              <label className={labelClass}>Jugador rival <span className="text-error">*</span></label>
              {jugadorSeleccionado ? (
                <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    {jugadorSeleccionado.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={jugadorSeleccionado.avatar_url} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {iniciales(jugadorSeleccionado.display_name ?? jugadorSeleccionado.username ?? '?')}
                      </div>
                    )}
                    <span className="text-[12px] text-on-surface">
                      {jugadorSeleccionado.display_name ?? jugadorSeleccionado.username}
                    </span>
                  </div>
                  <button type="button" onClick={() => { setJugador1v1Id(''); setBusquedaJugador(''); }}
                    className="text-outline hover:text-on-surface-variant text-[12px] ml-2 transition-colors">
                    cambiar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <input type="text" value={busquedaJugador} onChange={e => setBusquedaJugador(e.target.value)}
                    placeholder="Buscar jugador por nombre..." autoFocus className={inputClass} />
                  {jugadoresFiltrados.length > 0 && (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-y-auto max-h-[160px]">
                      {jugadoresFiltrados.map(j => {
                        const nombre = j.display_name ?? j.username ?? 'Jugador';
                        return (
                          <button key={j.id} type="button" onClick={() => { setJugador1v1Id(j.id); setBusquedaJugador(''); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-left">
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
                              {j.nivel && <div className="text-[10px] text-outline">Nv. {j.nivel}</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className={labelClass}>Equipo rival <span className="text-error">*</span></label>
              {equipoSeleccionado ? (
                <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: equipoSeleccionado.color }} />
                    <span className="text-[12px] text-on-surface">{equipoSeleccionado.nombre}</span>
                  </div>
                  <button type="button" onClick={() => { setEquipoRetadoId(''); setBusquedaEquipo(''); }}
                    className="text-outline hover:text-on-surface-variant text-[12px] transition-colors">
                    cambiar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <input type="text" value={busquedaEquipo} onChange={e => setBusquedaEquipo(e.target.value)}
                    placeholder="Buscar equipo..." className={inputClass} />
                  {equiposFiltrados.length > 0 && (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-y-auto max-h-[140px]">
                      {equiposFiltrados.map(eq => (
                        <button key={eq.id} type="button" onClick={() => { setEquipoRetadoId(eq.id); setBusquedaEquipo(''); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-left">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: eq.color }} />
                          {eq.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Cancha ─────────────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>
              Cancha{modo === '1v1_individual' ? <span className="normal-case text-outline/50 ml-1">(opcional)</span> : <span className="text-error ml-1">*</span>}
            </label>
            {canchaSeleccionada ? (
              <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] text-on-surface truncate">{canchaSeleccionada.nombre}</span>
                  <span className="text-[10px] text-outline truncate">{canchaSeleccionada.direccion}</span>
                </div>
                <button type="button" onClick={() => { setCanchaId(''); setBusquedaCancha(''); }}
                  className="text-outline hover:text-on-surface-variant text-[12px] ml-2 flex-shrink-0 transition-colors">
                  cambiar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <input type="text" value={busquedaCancha} onChange={e => setBusquedaCancha(e.target.value)}
                  placeholder="Buscar cancha..." className={inputClass} />
                {canchasFiltradas.length > 0 && (busquedaCancha.trim() || modo !== '1v1_individual') && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-y-auto max-h-[140px]">
                    {canchasFiltradas.map(c => (
                      <button key={c.id} type="button" onClick={() => { setCanchaId(c.id); setBusquedaCancha(''); }}
                        className="w-full flex flex-col px-3 py-2 text-left hover:bg-surface-container transition-colors">
                        <span className="text-[12px] text-on-surface-variant hover:text-on-surface">{c.nombre}</span>
                        <span className="text-[10px] text-outline">{c.direccion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Fecha ─────────────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>
              Fecha y hora{modo === '1v1_individual' && <span className="normal-case text-outline/50 ml-1">(opcional)</span>}
              {modo === 'equipo' && <span className="text-error ml-1">*</span>}
            </label>
            <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface outline-none focus:border-accent/40 transition-colors [color-scheme:light_dark]" />
            {fecha && modo === '1v1_individual' && (
              <button type="button" onClick={() => setFecha('')}
                className="text-[10px] text-outline hover:text-on-surface-variant mt-1 transition-colors">
                ✕ Quitar fecha
              </button>
            )}
          </div>

          {/* ── Mensaje ───────────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>Mensaje <span className="normal-case text-outline/50">(opcional)</span></label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={2} maxLength={300}
              placeholder="Mensaje opcional para tu rival..."
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline/50 outline-none focus:border-accent/40 transition-colors resize-none" />
          </div>

          {/* ── Error ─────────────────────────────────────────────────── */}
          {error && (
            <div className="bg-error/15 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-accent text-on-accent rounded-lg py-2.5 text-[13px] font-bold hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1 min-h-[44px]">
            {loading
              ? 'Enviando...'
              : modo === '1v1_individual'
                ? '⚔️ Enviar desafío 1v1'
                : '🏀 Enviar desafío'}
          </button>
        </form>
      </div>
    </div>
  );
}
