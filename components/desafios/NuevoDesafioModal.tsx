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

  const inputClass = 'w-full bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] px-3 py-2 text-[12px] text-[#ccc] placeholder:text-[#333] outline-none focus:border-[#F5C34440] transition-colors';
  const labelClass = 'block text-[11px] text-[#555] mb-1.5 font-medium uppercase tracking-[0.08em]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(8,8,9,0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0f0f12] border border-[#1a1a1f] rounded-[16px] p-6 shadow-[0_8px_48px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-[#1e1e24] text-[#555] hover:text-[#ddd] hover:bg-[#2a2a2a] transition-colors text-[16px] leading-none"
          style={{ position: 'relative', float: 'right', marginTop: '-8px', marginRight: '-8px' }}
        >
          ×
        </button>

        <div className="text-[15px] font-semibold text-[#ddd] mb-1">Nuevo desafío</div>
        <div className="text-[11px] text-[#555] mb-5">Reta a otro equipo en una cancha.</div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Equipo rival</label>
            {equipoSeleccionado ? (
              <div className="flex items-center justify-between bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: equipoSeleccionado.color }}
                  />
                  <span className="text-[12px] text-[#ccc]">{equipoSeleccionado.nombre}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEquipoRetadoId(''); setBusquedaEquipo(''); }}
                  className="text-[#444] hover:text-[#888] text-[12px]"
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
                  <div className="bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] overflow-y-auto max-h-[140px]">
                    {equiposFiltrados.map((eq) => (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => { setEquipoRetadoId(eq.id); setBusquedaEquipo(''); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#888] hover:text-[#ccc] hover:bg-[#1a1a1f] transition-colors text-left"
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

          <div>
            <label className={labelClass}>Cancha</label>
            {canchaSeleccionada ? (
              <div className="flex items-center justify-between bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-[12px] text-[#ccc]">{canchaSeleccionada.nombre}</span>
                  <span className="text-[10px] text-[#555]">{canchaSeleccionada.direccion}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setCanchaId(''); setBusquedaCancha(''); }}
                  className="text-[#444] hover:text-[#888] text-[12px] ml-2 flex-shrink-0"
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
                  <div className="bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] overflow-y-auto max-h-[140px]">
                    {canchasFiltradas.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCanchaId(c.id); setBusquedaCancha(''); }}
                        className="w-full flex flex-col px-3 py-2 text-left hover:bg-[#1a1a1f] transition-colors"
                      >
                        <span className="text-[12px] text-[#888] hover:text-[#ccc]">{c.nombre}</span>
                        <span className="text-[10px] text-[#444]">{c.direccion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Deporte</label>
            <div className="flex flex-wrap gap-2">
              {DEPORTES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDeporte(d.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-[11px] border transition-colors ${
                    deporte === d.id
                      ? 'bg-[#F5C34420] border-[#F5C34460] text-[#F5C344]'
                      : 'bg-[#0a0a0c] border-[#1a1a1f] text-[#555] hover:border-[#2a2a2a] hover:text-[#777]'
                  }`}
                >
                  <span>{d.emoji}</span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Formato</label>
            <div className="flex flex-wrap gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormato(f)}
                  className={`px-3 py-1.5 rounded-[7px] text-[11px] border transition-colors ${
                    formato === f
                      ? 'bg-[#F5C34420] border-[#F5C34460] text-[#F5C344]'
                      : 'bg-[#0a0a0c] border-[#1a1a1f] text-[#555] hover:border-[#2a2a2a] hover:text-[#777]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Fecha y hora</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] px-3 py-2 text-[12px] text-[#ccc] outline-none focus:border-[#F5C34440] transition-colors [color-scheme:dark]"
            />
          </div>

          <div>
            <label className={labelClass}>Mensaje <span className="normal-case text-[#333]">(opcional)</span></label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={3}
              placeholder="Mensaje opcional..."
              className="w-full bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] px-3 py-2 text-[12px] text-[#ccc] placeholder:text-[#333] outline-none focus:border-[#F5C34440] transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="bg-[#E24B4A20] border border-[#E24B4A40] rounded-[8px] px-3 py-2 text-[11px] text-[#E24B4A]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F5C344] text-[#080809] rounded-[8px] py-2.5 text-[13px] font-semibold hover:bg-[#f0bb30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? 'Enviando...' : 'Enviar desafío'}
          </button>
        </form>
      </div>
    </div>
  );
}
