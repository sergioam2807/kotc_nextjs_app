'use client';

import { REGIONES_CHILE } from '@/lib/chile-geo';

interface Props {
  region: string;
  comuna: string;
  onRegionChange: (r: string) => void;
  onComunaChange: (c: string) => void;
  required?: boolean;
  className?: string;
}

const selectClass =
  'bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface w-full appearance-none cursor-pointer outline-none focus:border-outline transition-colors';

const labelClass = 'text-[11px] text-outline mb-1 block uppercase tracking-wider';

export function RegionComunaSelect({
  region,
  comuna,
  onRegionChange,
  onComunaChange,
  required = false,
  className,
}: Props) {
  const regionObj = REGIONES_CHILE.find((r) => r.nombreCorto === region) ?? null;
  const comunas = regionObj?.comunas ?? [];

  function handleRegionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onRegionChange(e.target.value);
    onComunaChange('');
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Región */}
        <div>
          <label className={labelClass}>Región</label>
          <select
            value={region}
            onChange={handleRegionChange}
            required={required}
            className={selectClass}
          >
            <option value="">Selecciona región</option>
            {REGIONES_CHILE.map((r) => (
              <option key={r.codigo} value={r.nombreCorto}>
                {r.codigo} · {r.nombreCorto}
              </option>
            ))}
          </select>
        </div>

        {/* Comuna */}
        <div>
          <label className={labelClass}>Comuna</label>
          <select
            value={comuna}
            onChange={(e) => onComunaChange(e.target.value)}
            disabled={!region}
            required={required}
            className={`${selectClass} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <option value="">Selecciona comuna</option>
            {comunas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
