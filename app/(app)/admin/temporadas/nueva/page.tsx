'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// MVP: Basketball únicamente. Añadir más deportes cuando se escale.
const DEPORTES = [
  { id: 'basketball', emoji: '🏀', label: 'Basketball' },
];

const TEMAS = [
  { id: 'street',      label: 'Street / Urbano',       emoji: '🟥', color: '#ef4444' },
  { id: 'competitivo', label: 'Competitivo',            emoji: '🟦', color: '#3b82f6' },
  { id: 'summer',      label: 'Summer Vibes',           emoji: '🟨', color: '#eab308' },
  { id: 'nightball',   label: 'Nightball',              emoji: '⬛', color: '#374151' },
  { id: 'playoffs',    label: 'Playoffs',               emoji: '🟪', color: '#a855f7' },
  { id: 'underground', label: 'Underground Courts',     emoji: '🟩', color: '#22c55e' },
];

const PRESET_COLORS = [
  { hex: '#ef4444', label: 'Rojo' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#a855f7', label: 'Violeta' },
  { hex: '#374151', label: 'Oscuro' },
  { hex: '#22c55e', label: 'Verde' },
  { hex: '#eab308', label: 'Oro' },
  { hex: '#f97316', label: 'Naranja' },
  { hex: '#ec4899', label: 'Rosa' },
];

const TEMPORADA_TEMPLATES = [
  {
    numero: 1,
    nombre: 'El Inicio',
    slogan: 'Todo comienza. Las primeras canchas esperan a sus reyes.',
    tema: 'street',
    color: '#ef4444',
    emoji: '🔥',
  },
  {
    numero: 2,
    nombre: 'Take the Court',
    slogan: 'Las canchas ya tienen dueños… ¿podrás arrebatárselas?',
    tema: 'competitivo',
    color: '#3b82f6',
    emoji: '⚔️',
  },
  {
    numero: 3,
    nombre: 'Sin Corona Regalada',
    slogan: 'Cada dominio debe ganarse partido a partido.',
    tema: 'playoffs',
    color: '#a855f7',
    emoji: '👑',
  },
  {
    numero: 4,
    nombre: 'Territorio Hostil',
    slogan: 'Ganar de visita nunca fue tan importante.',
    tema: 'street',
    color: '#ef4444',
    emoji: '🗺️',
  },
  {
    numero: 5,
    nombre: 'Dynasty',
    slogan: 'Las verdaderas dinastías comienzan a formarse.',
    tema: 'competitivo',
    color: '#3b82f6',
    emoji: '🏛️',
  },
  {
    numero: 6,
    nombre: 'No Mercy',
    slogan: 'Solo sobreviven los equipos que defienden su cancha.',
    tema: 'nightball',
    color: '#374151',
    emoji: '🌑',
  },
  {
    numero: 7,
    nombre: 'Street Kings',
    slogan: 'La calle decide quién domina realmente el juego.',
    tema: 'underground',
    color: '#22c55e',
    emoji: '🏙️',
  },
  {
    numero: 8,
    nombre: 'The Last Possession',
    slogan: 'Cada punto puede cambiar el destino de una cancha.',
    tema: 'playoffs',
    color: '#a855f7',
    emoji: '⏱️',
  },
  {
    numero: 9,
    nombre: 'Rise of Rivals',
    slogan: 'Las rivalidades crecen y las canchas entran en guerra.',
    tema: 'street',
    color: '#ef4444',
    emoji: '🆚',
  },
  {
    numero: 10,
    nombre: 'Legacy',
    slogan: 'No se juega solo por ganar… se juega por dejar huella.',
    tema: 'competitivo',
    color: '#eab308',
    emoji: '🏆',
  },
];

export default function NuevaTemporadaPage() {
  const router = useRouter();

  // Identity fields
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [slogan, setSlogan] = useState('');
  const [tema, setTema] = useState<string>('');
  const [color, setColor] = useState('#ef4444');
  const [emoji, setEmoji] = useState('');
  const [numero, setNumero] = useState<number | ''>('');

  // Schedule fields
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');

  // Other settings
  const [deportesFilter, setDeportesFilter] = useState<string[]>([]);
  const [activarAhora, setActivarAhora] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(t: typeof TEMPORADA_TEMPLATES[0]) {
    setNombre(t.nombre);
    setSlogan(t.slogan);
    setTema(t.tema);
    setColor(t.color);
    setEmoji(t.emoji);
    setNumero(t.numero);
  }

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
          slogan: slogan.trim() || null,
          tema: tema || null,
          color: color || null,
          emoji: emoji.trim() || null,
          numero: numero !== '' ? Number(numero) : null,
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

  const temaInfo = TEMAS.find(t => t.id === tema);

  return (
    <div className="max-w-xl">
      <h2 className="text-[16px] font-semibold text-on-surface mb-5">Nueva temporada</h2>

      {/* Template picker */}
      <div className="mb-6">
        <div className="text-[10px] text-outline uppercase tracking-[0.08em] font-medium mb-2">
          Plantillas de temporada <span className="normal-case text-[10px] text-on-surface-variant">(elige una para auto-rellenar)</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TEMPORADA_TEMPLATES.map(t => (
            <button
              key={t.numero}
              type="button"
              onClick={() => applyTemplate(t)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-outline-variant hover:border-outline transition-colors text-left group"
              style={{
                background: nombre === t.nombre ? `${t.color}12` : undefined,
                borderColor: nombre === t.nombre ? `${t.color}60` : undefined,
              }}
            >
              <span className="text-[16px] flex-shrink-0">{t.emoji}</span>
              <div className="min-w-0">
                <div
                  className="text-[11px] font-semibold truncate"
                  style={{ color: nombre === t.nombre ? t.color : undefined }}
                >
                  <span className="text-[9px] opacity-60">T{String(t.numero).padStart(2, '0')} · </span>
                  {t.nombre}
                </div>
                <div className="text-[9px] text-outline line-clamp-1">{t.slogan.slice(0, 40)}…</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Identity section */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col gap-4">
          <div className="text-[10px] text-outline uppercase tracking-[0.08em] font-medium">Identidad visual</div>

          {/* Número + Emoji row */}
          <div className="flex gap-3">
            <div className="w-24">
              <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Núm.</label>
              <input
                type="number"
                value={numero}
                onChange={e => setNumero(e.target.value === '' ? '' : Number(e.target.value))}
                min={1}
                max={999}
                placeholder="01"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div className="w-28">
              <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Emoji</label>
              <input
                type="text"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                placeholder="🏆"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            {/* Color preview */}
            <div className="flex-1">
              <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Color oficial</label>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.label}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      background: c.hex,
                      borderColor: color === c.hex ? '#fff' : 'transparent',
                      boxShadow: color === c.hex ? `0 0 0 2px ${c.hex}` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">
              Nombre *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: El Inicio"
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
              required
            />
          </div>

          {/* Slogan */}
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">
              Slogan <span className="normal-case text-[10px]">(tagline de la temporada)</span>
            </label>
            <input
              type="text"
              value={slogan}
              onChange={e => setSlogan(e.target.value)}
              placeholder="Todo comienza. Las primeras canchas esperan a sus reyes."
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
            />
          </div>

          {/* Tema */}
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Tema visual</label>
            <div className="flex flex-wrap gap-1.5">
              {TEMAS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTema(t.id); setColor(t.color); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors"
                  style={{
                    background: tema === t.id ? `${t.color}20` : undefined,
                    borderColor: tema === t.id ? `${t.color}60` : undefined,
                    color: tema === t.id ? t.color : undefined,
                  }}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">
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

          {/* Preview badge */}
          {nombre && (
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-outline">Preview:</div>
              <div
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                style={{
                  background: `${color}15`,
                  border: `1px solid ${color}40`,
                }}
              >
                {emoji && <span className="text-[12px]">{emoji}</span>}
                <span className="text-[10px] font-semibold" style={{ color }}>
                  {numero !== '' ? `T${String(numero).padStart(2, '0')} · ` : ''}{nombre}
                </span>
                {temaInfo && (
                  <span className="text-[9px] opacity-60">{temaInfo.emoji}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.08em]">
              Fecha de inicio *
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
              Fecha de fin *
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
                ? 'border-accent'
                : 'bg-surface-container border-outline-variant'
            }`}
            style={activarAhora ? { background: color } : undefined}
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
            className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: color, color: '#fff' }}
          >
            {loading ? 'Creando...' : 'Crear temporada'}
          </button>
        </div>
      </form>
    </div>
  );
}
