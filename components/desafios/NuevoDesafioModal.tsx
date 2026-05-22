'use client';

import { useState, useMemo } from 'react';
import type { DesafioConDatos, EquipoSimple, CanchaSimple } from './types';

interface Props {
  equipoId: string;
  equipos: EquipoSimple[];
  canchas: CanchaSimple[];
  canchaPreseleccionada?: string;
  equipoRetadoPreseleccionado?: string;
  onClose: () => void;
  onSuccess: (desafio: DesafioConDatos) => void;
}

const DEPORTES = [
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'futbol', label: 'Fútbol', emoji: '⚽' },
  { id: 'voleibol', label: 'Vóleibol', emoji: '🏐' },
  { id: 'tenis', label: 'Tenis', emoji: '🎾' },
  { id: 'padel', label: 'Pádel', emoji: '🏸' },
];

const FORMATOS = ['1v1', '2v2', '3v3', '5v5', '7v7', '11v11'];

const inputClass =
  'w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline/50 outline-none focus:border-accent/40 transition-colors';

const labelClass =
  'block text-[11px] text-outline mb-1.5 font-semibold uppercase tracking-[0.08em]';

export function NuevoDesafioModal({
  equipoId,
  equipos,
  canchas,
  canchaPreseleccionada,
  equipoRetadoPreseleccionado,
  onClose,
  onSuccess,
}: Props) {
  const [equipoRetadoId, setEquipoRetadoId] = useState(equipoRetadoPreseleccionado ?? '');
  const [canchaId, setCanchaId] = useState(canchaPreseleccionada ?? '');
  const [deporte, setDeporte] = useState('');
  const [formato, setFormato] = useState('');
  const [fecha, setFecha] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busquedaEquipo, setBusquedaEquipo] = useState('');
  const [busquedaCancha, setBusquedaCancha] = useState('');

  const equipoSeleccionado = equipos.find((e) => e.id === equipoRetadoId);
  const canchaSeleccionada = canchas.find((c) => c.id === canchaId);

  const equiposFiltrados = useMemo(() => {
    if (!busquedaEquipo.trim()) return equipos.slice(0, 5);
    const q = busquedaEquipo.toLowerCase();
    return equipos.filter((e) => e.nombre.toLowerCase().includes(q)).slice(0, 5);
  }, [equipos, busquedaEquipo]);

  const canchasFiltradas = useMemo(() => {
    if (!busquedaCancha.trim()) return canchas.slice(0, 5);
    const q = busquedaCancha.toLowerCase();
    return canchas.filter((c) => c.nombre.toLowerCase().includes(q) || c.direccion.toLowerCase().includes(q)).slice(0, 5);
  }, [canchas, busquedaCancha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!equipoRetadoId) { setError('Selecciona un equipo rival.'); return; }
    if (!canchaId) { setError('Selecciona una cancha.'); return; }
    if (!deporte) { setError('Selecciona un deporte.'); return; }
    if (!formato) { setError('Selecciona un formato.'); return; }
    if (!fecha) { setError('Selecciona fecha y hora.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/desafios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipo_retado_id: equipoRetadoId,
          cancha_id: canchaId,
          deporte,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container border border-outline-variant rounded-xl p-6 shadow-[0_8px_48px_rgba(0,0,0,0.6)] overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="float-right -mt-2 -mr-2 w-7 h-7 flex items-center justify-center rounded-full bg-surface-container-high text-outline hover:text-on-surface hover:bg-surface-container-highest transition-colors text-[16px] leading-none"
        >
          ×
        </button>

        <div className="text-[15px] font-bold text-on-surface mb-1">Nuevo desafío</div>
        <div className="text-[11px] text-outline mb-5">Reta a otro equipo en una cancha.</div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Equipo rival */}
          <div>
            <label className={labelClass}>Equipo rival</label>
            {equipoSeleccionado ? (
              <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: equipoSeleccionado.color }} />
                  <span className="text-[12px] text-on-surface">{equipoSeleccionado.nombre}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEquipoRetadoId(''); setBusquedaEquipo(''); }}
                  className="text-outline hover:text-on-surface-variant text-[12px] transition-colors"
                >
                  cambiar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={busquedaEquipo}
                  onChange={(e) => setBusquedaEquipo(e.target.value)}
                  placeholder="Buscar equipo..."
                  className={inputClass}
                />
                {equiposFiltrados.length > 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-y-auto max-h-[140px]">
                    {equiposFiltrados.map((eq) => (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => { setEquipoRetadoId(eq.id); setBusquedaEquipo(''); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-left"
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: eq.color }} />
                        {eq.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cancha */}
          <div>
            <label className={labelClass}>Cancha</label>
            {canchaSeleccionada ? (
              <div className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-[12px] text-on-surface">{canchaSeleccionada.nombre}</span>
                  <span className="text-[10px] text-outline">{canchaSeleccionada.direccion}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setCanchaId(''); setBusquedaCancha(''); }}
                  className="text-outline hover:text-on-surface-variant text-[12px] ml-2 flex-shrink-0 transition-colors"
                >
                  cambiar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={busquedaCancha}
                  onChange={(e) => setBusquedaCancha(e.target.value)}
                  placeholder="Buscar cancha..."
                  className={inputClass}
                />
                {canchasFiltradas.length > 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-y-auto max-h-[140px]">
                    {canchasFiltradas.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCanchaId(c.id); setBusquedaCancha(''); }}
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

          {/* Deporte */}
          <div>
            <label className={labelClass}>Deporte</label>
            <div className="flex flex-wrap gap-2">
              {DEPORTES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDeporte(d.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors ${
                    deporte === d.id
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-surface-container-lowest border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
                  }`}
                >
                  <span>{d.emoji}</span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Formato */}
          <div>
            <label className={labelClass}>Formato</label>
            <div className="flex flex-wrap gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormato(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] border transition-colors ${
                    formato === f
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-surface-container-lowest border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className={labelClass}>Fecha y hora</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface outline-none focus:border-accent/40 transition-colors [color-scheme:light_dark]"
            />
          </div>

          {/* Mensaje */}
          <div>
            <label className={labelClass}>
              Mensaje <span className="normal-case text-outline/50">(opcional)</span>
            </label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={3}
              placeholder="Mensaje opcional..."
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline/50 outline-none focus:border-accent/40 transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error/15 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-on-accent rounded-lg py-2.5 text-[13px] font-bold hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? 'Enviando...' : 'Enviar desafío'}
          </button>
        </form>
      </div>
    </div>
  );
}
