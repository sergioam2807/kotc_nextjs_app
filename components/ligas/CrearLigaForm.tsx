'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, ListBox, Select, TextArea } from '@heroui/react';

const DEPORTES = [
  { value: 'basketball', label: '🏀 Basketball' },
  { value: 'futbol',     label: '⚽ Fútbol' },
  { value: 'voleibol',   label: '🏐 Voleibol' },
  { value: 'tenis',      label: '🎾 Tenis' },
  { value: 'padel',      label: '🏓 Pádel' },
];

const MODALIDADES: Record<string, string[]> = {
  basketball: ['3v3', '5v5'],
  futbol:     ['5v5', '7v7', '11v11'],
  voleibol:   ['6v6'],
  tenis:      ['1v1', '2v2'],
  padel:      ['2v2'],
};

const FORMATOS = [
  {
    value: 'round_robin',
    label: 'Liga (todos vs todos)',
    desc:  'Todos los equipos se enfrentan entre sí. Tabla de posiciones con puntos.',
  },
  {
    value: 'eliminacion_directa',
    label: 'Eliminación directa',
    desc:  'Bracket tipo copa. El perdedor queda eliminado.',
  },
  {
    value: 'grupos_playoffs',
    label: 'Grupos + playoffs',
    desc:  'Fase de grupos (round-robin) → los mejores avanzan a llaves de eliminación.',
  },
];

const labelClass = 'text-[11px] text-outline uppercase tracking-[0.08em] font-semibold';

export function CrearLigaForm() {
  const router = useRouter();

  const [nombre,          setNombre]          = useState('');
  const [descripcion,     setDescripcion]     = useState('');
  const [deporte,         setDeporte]         = useState('basketball');
  const [modalidad,       setModalidad]       = useState('5v5');
  const [formato,         setFormato]         = useState('round_robin');
  const [maxEquipos,      setMaxEquipos]      = useState(8);
  const [inscPublica,     setInscPublica]     = useState(false);
  const [fechaInicio,     setFechaInicio]     = useState('');
  const [fechaFin,        setFechaFin]        = useState('');
  const [ptsVictoria,     setPtsVictoria]     = useState(3);
  const [ptsEmpate,       setPtsEmpate]       = useState(1);
  const [ptsDerrota,      setPtsDerrota]      = useState(0);
  const [numGrupos,       setNumGrupos]       = useState(2);
  const [equiposClasific, setEquiposClasific] = useState(2);
  const [mostrarPuntos,   setMostrarPuntos]   = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const modalidadesDisp = MODALIDADES[deporte] ?? ['5v5'];
  const descripcionCharLeft = 400 - descripcion.length;

  const handleDeporteChange = (d: string) => {
    setDeporte(d);
    const mods = MODALIDADES[d] ?? ['5v5'];
    setModalidad(mods[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/ligas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre:              nombre.trim(),
        descripcion:         descripcion.trim() || undefined,
        deporte,
        modalidad,
        formato,
        max_equipos:         maxEquipos,
        inscripcion_publica: inscPublica,
        fecha_inicio:        fechaInicio || undefined,
        fecha_fin:           fechaFin    || undefined,
        puntos_victoria:     ptsVictoria,
        puntos_empate:       ptsEmpate,
        puntos_derrota:      ptsDerrota,
        num_grupos:          formato === 'grupos_playoffs' ? numGrupos       : undefined,
        equipos_clasifican:  formato === 'grupos_playoffs' ? equiposClasific : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Error al crear la liga');
      setLoading(false);
      return;
    }

    router.push(`/ligas/${data.liga.id}/admin`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Nombre de la liga *</label>
        <Input
          type="text"
          aria-label="Nombre de la liga"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Liga Barrial de Verano 2026"
          required
          maxLength={80}
          fullWidth
        />
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Descripción <span className="normal-case font-normal">(opcional)</span></label>
        <TextArea
          aria-label="Descripción"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Reglamento, premios, información adicional…"
          rows={2}
          maxLength={400}
          className="resize-none"
          fullWidth
        />
        <div className={`text-[10px] text-right ${descripcionCharLeft < 50 ? 'text-error' : 'text-outline'}`}>
          {descripcionCharLeft} caracteres restantes
        </div>
      </div>

      {/* Deporte + Modalidad */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className={labelClass}>Deporte *</Label>
          <Select
            aria-label="Deporte"
            value={deporte}
            onChange={(key) => handleDeporteChange((key as string) ?? 'basketball')}
            className="w-full"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {DEPORTES.map(d => (
                  <ListBox.Item key={d.value} id={d.value} textValue={d.label}>
                    {d.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className={labelClass}>Modalidad *</Label>
          <Select
            aria-label="Modalidad"
            value={modalidad}
            onChange={(key) => setModalidad((key as string) ?? modalidadesDisp[0])}
            className="w-full"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {modalidadesDisp.map(m => (
                  <ListBox.Item key={m} id={m} textValue={m}>
                    {m}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      {/* Formato */}
      <div>
        <label className={`${labelClass} mb-2 block`}>Formato de competencia *</label>
        <div className="flex flex-col gap-2">
          {FORMATOS.map(f => (
            <label
              key={f.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                formato === f.value
                  ? 'border-accent/60 bg-accent/5'
                  : 'border-outline-variant bg-surface-container hover:border-outline'
              }`}
            >
              <input
                type="radio"
                name="formato"
                value={f.value}
                checked={formato === f.value}
                onChange={() => setFormato(f.value)}
                className="mt-0.5 accent-current flex-shrink-0"
              />
              <div>
                <div className={`text-[13px] font-medium ${formato === f.value ? 'text-accent' : 'text-on-surface'}`}>
                  {f.label}
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">{f.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Grupos config (only for grupos_playoffs) */}
      {formato === 'grupos_playoffs' && (
        <div className="grid grid-cols-2 gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
          <div>
            <label className={`${labelClass} mb-1.5 block`}>Número de grupos</label>
            <input
              type="number" min={2} max={8}
              value={numGrupos}
              onChange={e => setNumGrupos(Number(e.target.value))}
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
            />
          </div>
          <div>
            <label className={`${labelClass} mb-1.5 block`}>Clasifican por grupo</label>
            <input
              type="number" min={1} max={4}
              value={equiposClasific}
              onChange={e => setEquiposClasific(Number(e.target.value))}
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Max equipos + inscripción pública */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`${labelClass} mb-1.5 block`}>Máx. equipos</label>
          <input
            type="number" min={2} max={64}
            value={maxEquipos}
            onChange={e => setMaxEquipos(Number(e.target.value))}
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
          />
        </div>
        <div>
          <label className={`${labelClass} mb-1.5 block`}>Inscripción</label>
          <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
            <button
              type="button"
              onClick={() => setInscPublica(v => !v)}
              aria-pressed={inscPublica}
              aria-label={inscPublica ? 'Inscripción pública activada' : 'Inscripción pública desactivada'}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                inscPublica ? 'bg-accent' : 'bg-outline-variant'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-surface rounded-full shadow transition-transform ${
                inscPublica ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
            <span className="text-[12px] text-on-surface-variant">Pública</span>
          </label>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`${labelClass} mb-1.5 block`}>Fecha inicio</label>
          <input
            type="date" value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
          />
        </div>
        <div>
          <label className={`${labelClass} mb-1.5 block`}>Fecha fin</label>
          <input
            type="date" value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
          />
        </div>
      </div>

      {/* Puntos (collapsible) — disclosure toggle, not a CTA, so it stays neutral not lime */}
      <div>
        <button
          type="button"
          onClick={() => setMostrarPuntos(v => !v)}
          className="text-[12px] text-on-surface-variant hover:text-on-surface transition-colors"
        >
          {mostrarPuntos ? '▲ Ocultar' : '▼ Configurar'} sistema de puntos
        </button>
        {mostrarPuntos && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { label: 'Victoria', value: ptsVictoria, set: setPtsVictoria },
              { label: 'Empate',   value: ptsEmpate,   set: setPtsEmpate },
              { label: 'Derrota',  value: ptsDerrota,  set: setPtsDerrota },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="text-[10px] text-outline uppercase tracking-[0.08em] font-semibold mb-1 block">
                  {label}
                </label>
                <input
                  type="number" min={0} max={10}
                  value={value}
                  onChange={e => set(Number(e.target.value))}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface text-center outline-none focus:border-accent/60 transition-colors"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error/10 border border-error/25 rounded-lg px-3 py-2.5 text-[13px] text-error">
          {error}
        </div>
      )}

      {/* Submit — the one lime CTA of this screen */}
      <Button
        type="submit"
        isDisabled={loading || !nombre.trim()}
        size="md"
        className="w-full justify-center"
      >
        {loading ? 'Creando liga…' : 'Crear liga'}
      </Button>
    </form>
  );
}
