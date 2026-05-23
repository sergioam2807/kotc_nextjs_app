'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
      <div>
        <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
          Nombre de la liga *
        </label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Liga Barrial de Verano 2026"
          required
          maxLength={80}
          className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[14px] text-on-surface placeholder:text-outline outline-none focus:border-accent/60 transition-colors"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
          Descripción
        </label>
        <textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Reglamento, premios, información adicional…"
          rows={2}
          maxLength={400}
          className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/60 transition-colors resize-none"
        />
      </div>

      {/* Deporte + Modalidad */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
            Deporte *
          </label>
          <select
            value={deporte}
            onChange={e => handleDeporteChange(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
          >
            {DEPORTES.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
            Modalidad *
          </label>
          <select
            value={modalidad}
            onChange={e => setModalidad(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
          >
            {modalidadesDisp.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Formato */}
      <div>
        <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-2 block">
          Formato de competencia *
        </label>
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
            <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
              Número de grupos
            </label>
            <input
              type="number" min={2} max={8}
              value={numGrupos}
              onChange={e => setNumGrupos(Number(e.target.value))}
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
              Clasifican por grupo
            </label>
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
          <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
            Máx. equipos
          </label>
          <input
            type="number" min={2} max={64}
            value={maxEquipos}
            onChange={e => setMaxEquipos(Number(e.target.value))}
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
          />
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
            Inscripción
          </label>
          <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
            <div
              onClick={() => setInscPublica(v => !v)}
              className={`w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${inscPublica ? 'bg-accent' : 'bg-surface-container-high border border-outline-variant'}`}
              style={{ height: '22px', width: '40px', position: 'relative', cursor: 'pointer' }}
            >
              <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all ${inscPublica ? 'left-[20px]' : 'left-[2px]'}`} />
            </div>
            <span className="text-[12px] text-on-surface-variant">Pública</span>
          </label>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
            Fecha inicio
          </label>
          <input
            type="date" value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
          />
        </div>
        <div>
          <label className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1.5 block">
            Fecha fin
          </label>
          <input
            type="date" value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface outline-none focus:border-accent/60 transition-colors"
          />
        </div>
      </div>

      {/* Puntos (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setMostrarPuntos(v => !v)}
          className="text-[12px] text-accent hover:underline"
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
                <label className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-1 block">
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

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !nombre.trim()}
        className="w-full bg-accent text-on-accent border-none rounded-xl py-3 text-[14px] font-semibold cursor-pointer hover:brightness-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creando liga…' : 'Crear liga'}
      </button>
    </form>
  );
}
