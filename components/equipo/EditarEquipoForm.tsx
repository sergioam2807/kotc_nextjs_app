'use client';

import { useRef, useState } from 'react';
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

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

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
    logo_url: string | null;
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EditarEquipoForm({ equipoId, initialData }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [nombre,      setNombre]      = useState(initialData.nombre);
  const [color,       setColor]       = useState(initialData.color ?? '#F5C344');
  const [ciudad,      setCiudad]      = useState(initialData.ciudad ?? '');
  const [region,      setRegion]      = useState(initialData.region ?? '');
  const [comuna,      setComuna]      = useState(initialData.comuna ?? '');
  const [descripcion, setDescripcion] = useState(initialData.descripcion ?? '');
  const [colorHex,    setColorHex]    = useState('');  // custom hex input

  // Logo upload state
  const [logoPreview,   setLogoPreview]   = useState<string | null>(initialData.logo_url);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError,     setLogoError]     = useState<string | null>(null);
  const [logoSuccess,   setLogoSuccess]   = useState(false);

  // Profile save state
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const deporteLabel = DEPORTE_LABELS[initialData.deporte] ?? initialData.deporte;
  const charLeft = 500 - descripcion.length;

  // Use custom hex if valid, otherwise use preset
  const activeColor = colorHex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorHex)
    ? colorHex
    : color;

  // ── Logo upload ─────────────────────────────────────────────────────────────

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError(null);
    setLogoSuccess(false);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setLogoError('Solo JPG, PNG, WebP o GIF.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(`Imagen demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo 2 MB.`);
      return;
    }

    // Show local preview immediately
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/equipo/logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setLogoSuccess(true);
      setLogoPreview(data.logo_url);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Error al subir imagen');
      setLogoPreview(initialData.logo_url); // revert to original
    } finally {
      setLogoUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Profile save ────────────────────────────────────────────────────────────

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
      setTimeout(() => router.push('/equipo'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* ── LOGO ── */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Logo del equipo <span className="normal-case font-normal">(opcional)</span></label>

        <div className="flex items-center gap-4">
          {/* Preview circle */}
          <div
            className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden border-2 flex items-center justify-center relative"
            style={{
              background:  logoPreview ? 'transparent' : `${activeColor}18`,
              borderColor: `${activeColor}55`,
            }}
          >
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Logo del equipo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[18px] font-bold" style={{ color: activeColor }}>
                {nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'}
              </span>
            )}
            {logoUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Upload controls */}
          <div className="flex-1 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleLogoChange}
              disabled={logoUploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoUploading}
              className="text-[12px] font-medium border border-outline-variant rounded-lg px-3.5 py-2 text-on-surface-variant hover:border-outline hover:text-on-surface transition-colors disabled:opacity-50 min-h-[40px]"
            >
              {logoUploading ? 'Subiendo…' : logoPreview ? '🔄 Cambiar logo' : '📷 Subir logo'}
            </button>
            <div className="text-[10px] text-outline mt-1.5">JPG · PNG · WebP · GIF — máx. 2 MB</div>
          </div>
        </div>

        {/* Logo feedback */}
        {logoError && (
          <div className="text-[11px] bg-error/10 border border-error/30 text-error rounded-lg px-3 py-2">
            {logoError}
          </div>
        )}
        {logoSuccess && (
          <div className="text-[11px] bg-status-libre/10 border border-status-libre/30 text-status-libre rounded-lg px-3 py-2">
            ✓ Logo guardado
          </div>
        )}
      </div>

      {/* ── NOMBRE ── */}
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

      {/* ── DEPORTE + MODALIDAD (read-only) ── */}
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

      {/* ── DESCRIPCIÓN ── */}
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

      {/* ── CIUDAD ── */}
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

      {/* ── REGIÓN / COMUNA ── */}
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

      {/* ── COLOR ── */}
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

      {/* ── ERROR / SUCCESS ── */}
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

      {/* ── ACTIONS ── */}
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
