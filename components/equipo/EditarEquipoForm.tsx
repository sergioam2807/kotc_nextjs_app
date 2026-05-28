'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RegionComunaSelect } from '@/components/ui/RegionComunaSelect';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { value: '#ffe083', label: 'Amarillo' },
  { value: '#F5C344', label: 'Dorado' },
  { value: '#a78bfa', label: 'Violeta' },
  { value: '#818cf8', label: 'Índigo' },
  { value: '#b6c4ff', label: 'Azul claro' },
  { value: '#378ADD', label: 'Azul' },
  { value: '#4ade80', label: 'Verde' },
  { value: '#1D9E75', label: 'Verde oscuro' },
  { value: '#fb923c', label: 'Naranja' },
  { value: '#f87171', label: 'Rojo' },
  { value: '#D85A30', label: 'Rojo ladrillo' },
  { value: '#e879f9', label: 'Rosa' },
];

const DEPORTE_LABELS: Record<string, string> = {
  basketball: '🏀 Basketball',
  futbol:     '⚽ Fútbol',
  voleibol:   '🏐 Voleibol',
  tenis:      '🎾 Tenis',
  padel:      '🏓 Pádel',
};

const inputClass =
  'bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface placeholder:text-outline/50 outline-none focus:border-accent/40 transition-colors w-full';

const labelClass = 'text-[11px] text-outline uppercase tracking-[0.08em] font-semibold';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  equipoId: string;
  initialData: {
    nombre: string;
    deporte: string;
    modalidad: string | null;
    color: string;
    ciudad: string | null;
    region: string | null;
    comuna: string | null;
    descripcion: string | null;
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EditarEquipoForm({ initialData }: Props) {
  const router = useRouter();

  const [nombre,      setNombre]      = useState(initialData.nombre);
  const [color,       setColor]       = useState(initialData.color ?? '#F5C344');
  const [ciudad,      setCiudad]      = useState(initialData.ciudad ?? '');
  const [region,      setRegion]      = useState(initialData.region ?? '');
  const [comuna,      setComuna]      = useState(initialData.comuna ?? '');
  const [descripcion, setDescripcion] = useState(initialData.descripcion ?? '');
  const [colorHex,    setColorHex]    = useState('');  // custom hex input

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const deporteLabel = DEPORTE_LABELS[initialData.deporte] ?? initialData.deporte;
  const charLeft = 500 - descripcion.length;

  // Use custom hex if valid, otherwise use preset
  const activeColor = colorHex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorHex)
    ? colorHex
    : color;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/equipo/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:      nombre.trim(),
          color:       activeColor,
          ciudad:      ciudad.trim() || null,
          region:      region || null,
          comuna:      comuna || null,
          descripcion: descripcion.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      setSuccess(true);
      router.refresh();
      // Short delay so the success message is visible, then navigate back
      setTimeout(() => router.push('/equipo'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Nombre del equipo *</label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          maxLength={50}
          required
          placeholder="Ej: Los Cóndores"
          className={inputClass}
        />
        <div className="text-[10px] text-outline text-right">{nombre.length}/50</div>
      </div>

      {/* Deporte + Modalidad (read-only) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Deporte</label>
          <div className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface-variant cursor-default select-none">
            {deporteLabel}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Modalidad</label>
          <div className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface-variant cursor-default select-none">
            {initialData.modalidad ?? '—'}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-outline -mt-3">
        Deporte y modalidad no se pueden cambiar una vez creado el equipo.
      </p>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Descripción <span className="normal-case font-normal">(opcional)</span></label>
        <textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Cuéntanos sobre tu equipo — estilo de juego, objetivos, historia…"
          className={`${inputClass} resize-none`}
        />
        <div className={`text-[10px] text-right ${charLeft < 50 ? 'text-error' : 'text-outline'}`}>
          {charLeft} caracteres restantes
        </div>
      </div>

      {/* Ciudad */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Ciudad <span className="normal-case font-normal">(opcional)</span></label>
        <input
          type="text"
          value={ciudad}
          onChange={e => setCiudad(e.target.value)}
          maxLength={60}
          placeholder="Ej: Santiago"
          className={inputClass}
        />
      </div>

      {/* Región / Comuna */}
      <div>
        <label className={`${labelClass} block mb-2`}>Ubicación</label>
        <RegionComunaSelect
          region={region}
          comuna={comuna}
          onRegionChange={val => { setRegion(val); setComuna(''); }}
          onComunaChange={setComuna}
        />
        <p className="text-[10px] text-outline mt-1.5">
          Necesario para aparecer en sugerencias de rivales cercanos.
        </p>
      </div>

      {/* Color */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Color del equipo</label>

        {/* Preview */}
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-lg border-2 flex-shrink-0"
            style={{ backgroundColor: activeColor, borderColor: `${activeColor}80` }}
          />
          <span className="text-[12px] text-on-surface-variant font-mono">{activeColor}</span>
        </div>

        {/* Preset swatches */}
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => { setColor(c.value); setColorHex(''); }}
              className="w-8 h-8 rounded-lg border-2 transition-all cursor-pointer flex-shrink-0"
              style={{
                backgroundColor: c.value,
                borderColor: activeColor === c.value ? '#fff' : 'transparent',
                boxShadow: activeColor === c.value ? `0 0 0 1.5px ${c.value}` : 'none',
              }}
              aria-label={c.label}
              aria-pressed={activeColor === c.value}
            />
          ))}
        </div>

        {/* Custom hex input */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-outline">Personalizar:</span>
          <input
            type="text"
            value={colorHex}
            onChange={e => setColorHex(e.target.value)}
            placeholder="#FF5733"
            maxLength={7}
            className="bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-[12px] font-mono text-on-surface outline-none focus:border-accent/40 w-28"
          />
        </div>
      </div>

      {/* Error / success */}
      {error && (
        <div className="text-[12px] bg-error/10 border border-error/30 text-error rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}
      {success && (
        <div className="text-[12px] bg-status-libre/10 border border-status-libre/30 text-status-libre rounded-lg px-3 py-2.5">
          ✓ Cambios guardados correctamente
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="flex-1 rounded-lg px-4 py-3 text-[13px] font-semibold border border-outline-variant text-on-surface-variant hover:border-outline transition-colors min-h-[44px] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !nombre.trim()}
          className="flex-1 rounded-lg px-4 py-3 text-[13px] font-bold bg-accent text-on-accent hover:brightness-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
        >
          {loading ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
