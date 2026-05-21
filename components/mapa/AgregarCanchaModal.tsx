'use client';

import { useState, useEffect } from 'react';
import type { CanchaConEstado } from './MapaClientWrapper';

interface Props {
  coordsIniciales?: { lat: number; lng: number };
  onClose: () => void;
  onSuccess: (cancha: CanchaConEstado) => void;
  onNecesitaClickMapa?: () => void;
}

const DEPORTES_OPCIONES = [
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'futbol', label: 'Fútbol', emoji: '⚽' },
  { id: 'voleibol', label: 'Vóleibol', emoji: '🏐' },
  { id: 'tenis', label: 'Tenis', emoji: '🎾' },
  { id: 'padel', label: 'Pádel', emoji: '🏸' },
];

export function AgregarCanchaModal({ coordsIniciales, onClose, onSuccess, onNecesitaClickMapa }: Props) {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [deportes, setDeportes] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(coordsIniciales ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xpMsg, setXpMsg] = useState(false);
  const [ubicacionLoading, setUbicacionLoading] = useState(false);

  // Update coords if parent provides them later (after map click)
  useEffect(() => {
    if (coordsIniciales) {
      setCoords(coordsIniciales);
    }
  }, [coordsIniciales]);

  function toggleDeporte(id: string) {
    setDeportes((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  async function handleUbicacionActual() {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en tu navegador.');
      return;
    }
    setUbicacionLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUbicacionLoading(false);
      },
      () => {
        setError('No se pudo obtener tu ubicación.');
        setUbicacionLoading(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !direccion.trim()) {
      setError('Nombre y dirección son requeridos.');
      return;
    }
    if (!coords) {
      setError('Selecciona una ubicación en el mapa o usa tu ubicación actual.');
      return;
    }
    if (deportes.length === 0) {
      setError('Selecciona al menos un deporte.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/canchas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          direccion: direccion.trim(),
          lat: coords.lat,
          lng: coords.lng,
          deporte: deportes,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      const { cancha } = await res.json();

      const canchaConEstado: CanchaConEstado = {
        id: cancha.id,
        nombre: cancha.nombre,
        direccion: cancha.direccion,
        lat: cancha.lat,
        lng: cancha.lng,
        deporte: cancha.deporte ?? deportes,
        estado: 'libre',
      };

      setXpMsg(true);
      setTimeout(() => {
        onSuccess(canchaConEstado);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(8,8,9,0.8)' }}>
      <div
        className="relative w-full max-w-md bg-[#0f0f12] border border-[#1a1a1f] rounded-[16px] p-6 shadow-[0_8px_48px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-[#1e1e24] text-[#555] hover:text-[#ddd] hover:bg-[#2a2a2a] transition-colors text-[16px] leading-none"
        >
          ×
        </button>

        <div className="text-[15px] font-semibold text-[#ddd] mb-1">Agregar cancha</div>
        <div className="text-[11px] text-[#555] mb-5">Registra un nuevo espacio de juego en el mapa.</div>

        {xpMsg ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="text-[32px]">🎉</div>
            <div className="text-[15px] font-medium text-[#F5C344]">+80 XP ganados 🎉</div>
            <div className="text-[11px] text-[#555]">Cancha agregada exitosamente</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-[11px] text-[#555] mb-1.5 font-medium uppercase tracking-[0.08em]">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Cancha Parque Bustamante"
                className="w-full bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] px-3 py-2 text-[12px] text-[#ccc] placeholder:text-[#333] outline-none focus:border-[#F5C34440] transition-colors"
                required
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-[11px] text-[#555] mb-1.5 font-medium uppercase tracking-[0.08em]">
                Dirección
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Av. Providencia 1234, Santiago"
                className="w-full bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] px-3 py-2 text-[12px] text-[#ccc] placeholder:text-[#333] outline-none focus:border-[#F5C34440] transition-colors"
                required
              />
            </div>

            {/* Deportes */}
            <div>
              <label className="block text-[11px] text-[#555] mb-2 font-medium uppercase tracking-[0.08em]">
                Deportes
              </label>
              <div className="flex flex-wrap gap-2">
                {DEPORTES_OPCIONES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDeporte(d.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-[11px] border transition-colors ${
                      deportes.includes(d.id)
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

            {/* Coordenadas */}
            <div>
              <label className="block text-[11px] text-[#555] mb-1.5 font-medium uppercase tracking-[0.08em]">
                Ubicación
              </label>
              {coords ? (
                <div className="bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-[#888] font-mono">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCoords(null)}
                    className="text-[#444] hover:text-[#888] text-[12px] ml-2"
                  >
                    cambiar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {onNecesitaClickMapa && (
                    <button
                      type="button"
                      onClick={onNecesitaClickMapa}
                      className="w-full bg-[#0a0a0c] border border-dashed border-[#2a2a2a] rounded-[8px] px-3 py-2.5 text-[11px] text-[#555] hover:border-[#444] hover:text-[#777] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>📍</span>
                      <span>Hacer clic en el mapa para seleccionar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleUbicacionActual}
                    disabled={ubicacionLoading}
                    className="w-full bg-[#0a0a0c] border border-[#1a1a1f] rounded-[8px] px-3 py-2 text-[11px] text-[#555] hover:border-[#2a2a2a] hover:text-[#777] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {ubicacionLoading ? (
                      <span>Obteniendo ubicación...</span>
                    ) : (
                      <>
                        <span>🎯</span>
                        <span>Usar mi ubicación actual</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#E24B4A20] border border-[#E24B4A40] rounded-[8px] px-3 py-2 text-[11px] text-[#E24B4A]">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F5C344] text-[#080809] rounded-[8px] py-2.5 text-[13px] font-semibold cursor-pointer hover:bg-[#f0bb30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Guardando...' : 'Agregar cancha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
