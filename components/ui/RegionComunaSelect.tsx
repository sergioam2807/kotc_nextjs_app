'use client';

import { Label, ListBox, Select } from '@heroui/react';
import { REGIONES_CHILE } from '@/lib/chile-geo';

interface Props {
  region: string;
  comuna: string;
  onRegionChange: (r: string) => void;
  onComunaChange: (c: string) => void;
  required?: boolean;
  className?: string;
}

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

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Región */}
        <div>
          <Label className={labelClass}>Región</Label>
          <Select
            aria-label="Región"
            value={region || null}
            onChange={(key) => { onRegionChange((key as string) ?? ''); onComunaChange(''); }}
            isRequired={required}
            placeholder="Selecciona región"
            className="w-full"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {REGIONES_CHILE.map((r) => (
                  <ListBox.Item key={r.codigo} id={r.nombreCorto} textValue={`${r.codigo} · ${r.nombreCorto}`}>
                    {r.codigo} · {r.nombreCorto}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Comuna */}
        <div>
          <Label className={labelClass}>Comuna</Label>
          <Select
            aria-label="Comuna"
            value={comuna || null}
            onChange={(key) => onComunaChange((key as string) ?? '')}
            isDisabled={!region}
            isRequired={required}
            placeholder="Selecciona comuna"
            className="w-full"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {comunas.map((c) => (
                  <ListBox.Item key={c} id={c} textValue={c}>
                    {c}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>
    </div>
  );
}
