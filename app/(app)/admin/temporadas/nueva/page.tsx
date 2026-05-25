'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DEPORTES = [
  { id: 'basketball', emoji: '🏀', label: 'Basketball' },
  { id: 'futbol',     emoji: '⚽', label: 'Fútbol' },
  { id: 'voleibol',   emoji: '🏐', label: 'Vóleibol' },
  { id: 'tenis',      emoji: '🎾', label: 'Tenis' },
  { id: 'padel',      emoji: '🏓', label: 'Pádel' },
];

export default function NuevaTemporadaPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [deportesFilter, setDeportesFilter] = useState<string[]>([]);  // empty = all sports
  const [activarAhora, setActivarAhora] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDeporte(id: string) {
    setDeportesFilter(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) { setError('El nombre es requerido.'); return; }
    if (!inicio || !fin) { setError('Las fechas de inicio y fin son requeridas.'); return; }
    if (new Date(fin) <= new Date(inicio)) {
      setError('La fecha de fin debe ser posterior al inicio.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/temporadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          inicio,
          fin,
          deporte_filter: deportesFilter.length > 0 ? deportesFilter : null,
          activa: activarAhora,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      router.push(`/admin/temporadas/${body.temporada.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-[16px] font-semibold text-on-surface mb-5">Nueva temporada</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Nombre */}
        <div>
          <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
            Nombre de la temporada
          </label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Temporada 2026 — Apertura"
            className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
            Descripción <span className="normal-case text-[10px]">(opcional)</span>
          </label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción breve de la temporada..."
            rows={2}
            className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors resize-none"
          />
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
              Fecha de inicio
            </label>
            <input
              type="date"
              value={inicio}
              onChange={e => setInicio(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface outline-none focus:border-accent/40 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
              Fecha de fin
            </label>
            <input
              type="date"
              value={fin}
              onChange={e => setFin(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface outline-none focus:border-accent/40 transition-colors"
              required
            />
          </div>
        </div>

        {/* Deportes */}
        <div>
          <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
            Deportes incluidos
          </label>
          <p className="text-[11px] text-on-surface-variant mb-2">
            Sin selección = aplica a todos los deportes.
          </p>
          <div className="flex flex-wrap gap-2">
            {DEPORTES.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDeporte(d.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] border transition-colors ${
                  deportesFilter.includes(d.id)
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

        {/* Activar */}
        <div className="flex items-center gap-3 bg-surface-container border border-outline-variant rounded-lg px-3 py-3">
          <button
            type="button"
            onClick={() => setActivarAhora(!activarAhora)}
            className={`relative w-10 h-5 rounded-full border transition-colors flex-shrink-0 ${
              activarAhora
                ? 'bg-accent border-accent'
                : 'bg-surface-container border-outline-variant'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                activarAhora ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <div>
            <div className="text-[12px] font-medium text-on-surface">Activar inmediatamente</div>
            <div className="text-[11px] text-on-surface-variant">
              {activarAhora
                ? 'La temporada quedará activa al crearla (desactivará la temporada actual si hay una).'
                : 'La temporada se creará como borrador — actívala manualmente cuando quieras.'}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-lg border border-outline-variant text-[13px] text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-accent text-on-accent text-[13px] font-semibold hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear temporada'}
          </button>
        </div>
      </form>
    </div>
  );
}
