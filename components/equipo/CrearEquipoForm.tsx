'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

// MVP: Basketball únicamente
const MODALIDADES = ['3v3', '5v5'];

const COLOR_OPTIONS = [
  { value: '#ffe083', label: 'Amarillo' },
  { value: '#a78bfa', label: 'Violeta' },
  { value: '#b6c4ff', label: 'Azul' },
  { value: '#4ade80', label: 'Verde' },
  { value: '#fb923c', label: 'Naranja' },
  { value: '#f87171', label: 'Rojo' },
];

const inputClass =
  'bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface placeholder:text-outline/50 outline-none focus:border-accent/40 transition-colors';

const labelClass =
  'text-[11px] text-outline uppercase tracking-[0.08em] font-semibold';

export function CrearEquipoForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [modalidad, setModalidad] = useState('3v3');
  const [ciudad, setCiudad] = useState('');
  const [color, setColor] = useState('#ffe083');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !ciudad.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), deporte: 'basketball', modalidad, ciudad: ciudad.trim(), color }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Error al crear el equipo');
        return;
      }
      router.push('/equipo');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col gap-4">
      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Nombre del equipo</label>
        <input
          type="text"
          placeholder="Ej: Los Cóndores"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          maxLength={40}
          required
          className={inputClass}
        />
      </div>

      {/* Deporte (fijo: basketball) + Modalidad */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Deporte</label>
          <div className={`${inputClass} flex items-center gap-2 cursor-default select-none opacity-80`}>
            <span>🏀</span>
            <span>Basketball</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Modalidad</label>
          <select
            value={modalidad}
            onChange={e => setModalidad(e.target.value)}
            className={`${inputClass} cursor-pointer appearance-none`}
          >
            {MODALIDADES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ciudad */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Ciudad</label>
        <input
          type="text"
          placeholder="Ej: Santiago"
          value={ciudad}
          onChange={e => setCiudad(e.target.value)}
          maxLength={60}
          required
          className={inputClass}
        />
      </div>

      {/* Color */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Color del equipo</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => setColor(c.value)}
              className="w-8 h-8 rounded-lg border-2 transition-all cursor-pointer"
              style={{
                backgroundColor: c.value,
                borderColor: color === c.value ? '#fff' : 'transparent',
                boxShadow: color === c.value ? `0 0 0 1px ${c.value}` : 'none',
              }}
              aria-label={c.label}
              aria-pressed={color === c.value}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[12px] text-error bg-error-container border border-error/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading || !nombre.trim() || !ciudad.trim()}
        size="md"
        className="w-full justify-center mt-1"
      >
        {loading ? 'Creando equipo...' : 'Crear equipo'}
      </Button>
    </form>
  );
}
