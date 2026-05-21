'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

type Deporte = 'basketball' | 'futbol' | 'voleibol' | 'tenis' | 'padel';

const MODALIDADES: Record<Deporte, string[]> = {
  basketball: ['3v3', '5v5'],
  futbol: ['5v5', '7v7', '11v11'],
  voleibol: ['6v6'],
  tenis: ['1v1'],
  padel: ['2v2'],
};

const DEPORTES_LABELS: Record<Deporte, string> = {
  basketball: 'Basketball',
  futbol: 'Fútbol',
  voleibol: 'Voleibol',
  tenis: 'Tenis',
  padel: 'Pádel',
};

const COLOR_OPTIONS = [
  { value: '#F5C344', label: 'Gold' },
  { value: '#7F77DD', label: 'Violeta' },
  { value: '#378ADD', label: 'Azul' },
  { value: '#1D9E75', label: 'Verde' },
  { value: '#D85A30', label: 'Naranja' },
  { value: '#E24B4A', label: 'Rojo' },
];

export function CrearEquipoForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [deporte, setDeporte] = useState<Deporte>('basketball');
  const [modalidad, setModalidad] = useState('3v3');
  const [ciudad, setCiudad] = useState('');
  const [color, setColor] = useState('#F5C344');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDeporteChange = (d: Deporte) => {
    setDeporte(d);
    setModalidad(MODALIDADES[d][0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !ciudad.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), deporte, modalidad, ciudad: ciudad.trim(), color }),
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
    <form onSubmit={handleSubmit} className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[14px] p-5 flex flex-col gap-4">
      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] text-[#555] uppercase tracking-[0.08em] font-medium">
          Nombre del equipo
        </label>
        <input
          type="text"
          placeholder="Ej: Los Cóndores"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          maxLength={40}
          required
          className="bg-[#0a0a0c] border border-[#2a2a2a] rounded-[8px] px-3 py-2.5 text-[13px] text-[#ddd] placeholder-[#333] outline-none focus:border-[#F5C34460] transition-colors"
        />
      </div>

      {/* Deporte + Modalidad */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[#555] uppercase tracking-[0.08em] font-medium">
            Deporte
          </label>
          <select
            value={deporte}
            onChange={e => handleDeporteChange(e.target.value as Deporte)}
            className="bg-[#0a0a0c] border border-[#2a2a2a] rounded-[8px] px-3 py-2.5 text-[13px] text-[#ddd] outline-none focus:border-[#F5C34460] transition-colors cursor-pointer appearance-none"
          >
            {(Object.keys(DEPORTES_LABELS) as Deporte[]).map(d => (
              <option key={d} value={d}>{DEPORTES_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[#555] uppercase tracking-[0.08em] font-medium">
            Modalidad
          </label>
          <select
            value={modalidad}
            onChange={e => setModalidad(e.target.value)}
            className="bg-[#0a0a0c] border border-[#2a2a2a] rounded-[8px] px-3 py-2.5 text-[13px] text-[#ddd] outline-none focus:border-[#F5C34460] transition-colors cursor-pointer appearance-none"
          >
            {MODALIDADES[deporte].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ciudad */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] text-[#555] uppercase tracking-[0.08em] font-medium">
          Ciudad
        </label>
        <input
          type="text"
          placeholder="Ej: Santiago"
          value={ciudad}
          onChange={e => setCiudad(e.target.value)}
          maxLength={60}
          required
          className="bg-[#0a0a0c] border border-[#2a2a2a] rounded-[8px] px-3 py-2.5 text-[13px] text-[#ddd] placeholder-[#333] outline-none focus:border-[#F5C34460] transition-colors"
        />
      </div>

      {/* Color */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] text-[#555] uppercase tracking-[0.08em] font-medium">
          Color del equipo
        </label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => setColor(c.value)}
              className="w-8 h-8 rounded-[8px] border-2 transition-all cursor-pointer"
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
        <p className="text-[12px] text-[#E24B4A] bg-[#2a1515] border border-[#E24B4A30] rounded-[6px] px-3 py-2">
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
