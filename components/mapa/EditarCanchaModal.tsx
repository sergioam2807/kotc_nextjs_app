'use client';

import { useState, useEffect } from 'react';
import type { CanchaConEstado } from './MapaClientWrapper';

interface Props {
  cancha: CanchaConEstado;
  coordsNuevas?: { lat: number; lng: number } | null;
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

export function EditarCanchaModal({ cancha, coordsNuevas, onClose, onSuccess, onNecesitaClickMapa }: Props) {
  const [nombre, setNombre] = useState(cancha.nombre);
  const [direccion, setDireccion] = useState(cancha.direccion);
  const [deportes, setDeportes] = useState<string[]>(cancha.deporte);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: cancha.lat, lng: cancha.lng });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ubicacionLoading, setUbicacionLoading] = useState(false);

  // Info de recinto — pre-poblada desde cancha existente
  const [esPublica, setEsPublica] = useState(cancha.es_publica !== false);
  const [precioHora, setPrecioHora] = useState(cancha.precio_hora ? String(cancha.precio_hora) : '');
  const [telefonoContacto, setTelefonoContacto] = useState(cancha.telefono_contacto ?? '');
  const [nombreRecinto, setNombreRecinto] = useState(cancha.nombre_recinto ?? '');

  useEffect(() => {
    if (coordsNuevas) setCoords(coordsNuevas);
  }, [coordsNuevas]);

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
    if (deportes.length === 0) {
      setError('Selecciona al menos un deporte.');
      return;
    }

    const precioNum = precioHora.trim() ? parseInt(precioHora.replace(/\D/g, ''), 10) : null;

    setLoading(true);
    try {
      const res = await fetch(`/api/canchas/${cancha.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:             nombre.trim(),
          direccion:          direccion.trim(),
          lat:                coords.lat,
          lng:                coords.lng,
          deporte:            deportes,
          es_publica:         esPublica,
          precio_hora:        esPublica ? null : precioNum,
          telefono_contacto:  telefonoContacto.trim() || null,
          nombre_recinto:     nombreRecinto.trim()    || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      const { cancha: updated } = await res.json();

      onSuccess({
        ...cancha,
        nombre:             updated.nombre,
        direccion:          updated.direccion,
        lat:                updated.lat,
        lng:                updated.lng,
        deporte:            updated.deporte ?? deportes,
        es_publica:         updated.es_publica          ?? esPublica,
        precio_hora:        updated.precio_hora         ?? null,
        telefono_contacto:  updated.telefono_contacto   ?? null,
        nombre_recinto:     updated.nombre_recinto      ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-surface/80 backdrop-blur-sm overflow-y-auto p-0 sm:p-4">
      <div
        className="relative w-full max-w-md bg-surface-container-low border border-outline-variant sm:rounded-xl rounded-t-xl p-6 shadow-[0_8px_48px_rgba(0,0,0,0.6)] max-h-[100dvh] sm:max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-outline hover:text-on-surface transition-colors text-[20px] leading-none z-10"
        >
          ×
        </button>

        <div className="text-[15px] font-semibold text-on-surface mb-1">Editar cancha</div>
        <div className="text-[11px] text-outline mb-5">
          Modifica los datos de <span className="text-on-surface-variant">{cancha.nombre}</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nombre */}
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
              required
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
              required
            />
          </div>

          {/* Deportes */}
          <div>
            <label className="block text-[11px] text-outline mb-2 font-medium uppercase tracking-[0.08em]">Deportes</label>
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

          {/* Ubicación */}
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">Ubicación</label>
            <div className="bg-surface border border-outline-variant rounded-lg px-3 py-2 flex items-center justify-between mb-2">
              <span className="text-[11px] text-on-surface-variant font-mono">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            </div>
            <div className="flex gap-2">
              {onNecesitaClickMapa && (
                <button
                  type="button"
                  onClick={onNecesitaClickMapa}
                  className="flex-1 bg-surface border border-dashed border-outline-variant rounded-lg px-3 py-2 text-[11px] text-outline hover:border-outline hover:text-on-surface-variant transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>📍</span><span>Clic en el mapa</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleUbicacionActual}
                disabled={ubicacionLoading}
                className="flex-1 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[11px] text-outline hover:border-outline hover:text-on-surface-variant transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {ubicacionLoading ? <span>Obteniendo...</span> : <><span>🎯</span><span>Mi ubicación</span></>}
              </button>
            </div>
          </div>

          {/* ── Información del recinto ── */}
          <div className="border-t border-outline-variant pt-4">
            <div className="text-[10px] text-outline uppercase tracking-[0.08em] font-medium mb-3">Información del recinto</div>

            {/* Nombre del recinto */}
            <div className="mb-3">
              <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
                Nombre del recinto <span className="normal-case text-[10px]">(opcional)</span>
              </label>
              <input
                type="text"
                value={nombreRecinto}
                onChange={(e) => setNombreRecinto(e.target.value)}
                placeholder="Ej: Complejo Deportivo Norte"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
              />
            </div>

            {/* Acceso */}
            <div className="mb-3">
              <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">Acceso</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEsPublica(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] border transition-colors ${
                    esPublica
                      ? 'bg-status-libre/15 border-status-libre/40 text-status-libre'
                      : 'bg-surface border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
                  }`}
                >
                  🆓 Pública / Gratuita
                </button>
                <button
                  type="button"
                  onClick={() => setEsPublica(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] border transition-colors ${
                    !esPublica
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-surface border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
                  }`}
                >
                  💰 De pago
                </button>
              </div>
            </div>

            {/* Precio */}
            {!esPublica && (
              <div className="mb-3">
                <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
                  Precio promedio por hora (CLP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-outline">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={precioHora}
                    onChange={(e) => setPrecioHora(e.target.value)}
                    placeholder="8.000"
                    className="w-full bg-surface border border-outline-variant rounded-lg pl-6 pr-10 py-2 text-[12px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-outline">/hr</span>
                </div>
              </div>
            )}

            {/* Teléfono */}
            <div>
              <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
                Teléfono de contacto <span className="normal-case text-[10px]">(opcional)</span>
              </label>
              <input
                type="tel"
                value={telefonoContacto}
                onChange={(e) => setTelefonoContacto(e.target.value)}
                placeholder="+56 9 1234 5678"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-on-accent rounded-lg py-2.5 text-[13px] font-semibold cursor-pointer hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
