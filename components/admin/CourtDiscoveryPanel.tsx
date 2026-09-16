'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  found: number;
  created: number;
  duplicated: number;
  errors: number;
}

/** Puntos de partida frecuentes, para no tipear coordenadas a mano. */
const ZONAS = [
  { label: 'Viña del Mar', lat: -33.0245, lng: -71.5518 },
  { label: 'Valparaíso',   lat: -33.0472, lng: -71.6127 },
  { label: 'Concón',       lat: -32.9228, lng: -71.5200 },
  { label: 'Santiago',     lat: -33.4569, lng: -70.6483 },
];

export function CourtDiscoveryPanel() {
  const router = useRouter();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radio, setRadio] = useState('2000');
  const [zona, setZona] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  function usarZona(z: (typeof ZONAS)[number]) {
    setLat(String(z.lat));
    setLng(String(z.lng));
    setZona(z.label);
  }

  async function buscar() {
    setLoading(true);
    setError(null);
    setStats(null);

    const res = await fetch('/api/admin/canchas/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: Number(lat),
        longitude: Number(lng),
        radius: Number(radio),
        zona: zona.trim() || null,
      }),
    }).catch(() => null);

    if (!res) {
      setError('No se pudo contactar al servidor');
      setLoading(false);
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? `Error ${res.status}`);
      setLoading(false);
      return;
    }

    setStats({ found: data.found, created: data.created, duplicated: data.duplicated, errors: data.errors });
    setLoading(false);
    // Trae la lista de pendientes recién creadas sin recargar la página.
    router.refresh();
  }

  const coordsListas = lat.trim() !== '' && lng.trim() !== '' && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-6">
      <h3 className="text-[13px] font-semibold text-on-surface mb-1">Buscar canchas en una zona</h3>
      <p className="text-[11px] text-on-surface-variant mb-4">
        Consulta Google Places y da de alta como <strong className="text-on-surface">pendientes</strong> las
        canchas que todavía no estén en KOC. No publica nada: cada una pasa por revisión.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {ZONAS.map((z) => (
          <button
            key={z.label}
            onClick={() => usarZona(z)}
            className="px-2.5 py-1 rounded-full border border-outline-variant text-[11px] text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors"
          >
            {z.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-outline uppercase tracking-wider font-medium">Latitud</span>
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            inputMode="decimal"
            placeholder="-33.0245"
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline focus:outline-none focus:border-outline"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-outline uppercase tracking-wider font-medium">Longitud</span>
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            inputMode="decimal"
            placeholder="-71.5518"
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline focus:outline-none focus:border-outline"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-outline uppercase tracking-wider font-medium">Radio (m)</span>
          <input
            value={radio}
            onChange={(e) => setRadio(e.target.value)}
            inputMode="numeric"
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline focus:outline-none focus:border-outline"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-outline uppercase tracking-wider font-medium">Zona (opcional)</span>
          <input
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            placeholder="Viña del Mar"
            maxLength={100}
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline focus:outline-none focus:border-outline"
          />
        </label>
      </div>

      <button
        onClick={buscar}
        disabled={loading || !coordsListas}
        className="kotc-btn-press px-4 py-2 rounded-lg bg-accent text-on-accent text-[12px] font-semibold hover:brightness-90 disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
      >
        {loading ? 'Buscando en Google Places…' : 'Buscar canchas'}
      </button>

      {error && (
        <div className="mt-3 text-[11px] px-3 py-2 rounded-lg bg-error/15 text-error border border-error/25">
          {error}
        </div>
      )}

      {stats && (
        <div className="kotc-confirm-in mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Encontradas', value: stats.found },
            { label: 'Nuevas',      value: stats.created, destacado: stats.created > 0 },
            { label: 'Duplicadas',  value: stats.duplicated },
            { label: 'Errores',     value: stats.errors, error: stats.errors > 0 },
          ].map((s) => (
            <div key={s.label} className="bg-surface-container rounded-lg px-3 py-2.5">
              <div
                className={`text-[20px] font-black leading-none ${
                  s.error ? 'text-error' : s.destacado ? 'text-accent' : 'text-on-surface'
                }`}
              >
                {s.value}
              </div>
              <div className="text-[10px] text-outline uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
