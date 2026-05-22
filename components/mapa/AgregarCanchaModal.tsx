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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm"
    >
      <div
        className="relative w-full max-w-md bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-[0_8px_48px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-surface-container text-outline hover:text-on-surface hover:bg-surface-container transition-colors text-[16px] leading-none"
        >
          ×
        </button>

        <div className="text-[15px] font-semibold text-on-surface mb-1">Agregar cancha</div>
        <div className="text-[11px] text-outline mb-5">Registra un nuevo espacio de juego en el mapa.</div>

        {xpMsg ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="text-[32px]">🎉</div>
            <div className="text-[15px] font-medium text-accent">+80 XP ganados 🎉</div>
            <div className="text-[11px] text-outline">Cancha agregada exitosamente</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Cancha Parque Bustamante"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
                required
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
                Dirección
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Av. Providencia 1234, Santiago"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
                required
              />
            </div>

            {/* Deportes */}
            <div>
              <label className="block text-[11px] text-outline mb-2 font-medium uppercase tracking-[0.08em]">
                Deportes
              </label>
              <div className="flex flex-wrap gap-2">
                {DEPORTES_OPCIONES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDeporte(d.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] border transition-colors ${
                      deportes.includes(d.id)
                        ? 'bg-accent/15 border-accent/40 text-accent'
                        : 'bg-surface border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
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
              <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
                Ubicación
              </label>
              {coords ? (
                <div className="bg-surface border border-outline-variant rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCoords(null)}
                    className="text-outline hover:text-on-surface-variant text-[12px] ml-2"
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
                      className="w-full bg-surface border border-dashed border-outline-variant rounded-lg px-3 py-2.5 text-[11px] text-outline hover:border-outline hover:text-on-surface-variant transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>📍</span>
                      <span>Hacer clic en el mapa para seleccionar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleUbicacionActual}
                    disabled={ubicacionLoading}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[11px] text-outline hover:border-outline hover:text-on-surface-variant transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
              <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-on-accent rounded-lg py-2.5 text-[13px] font-semibold cursor-pointer hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Guardando...' : 'Agregar cancha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
