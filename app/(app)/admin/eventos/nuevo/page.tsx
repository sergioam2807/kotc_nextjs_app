'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TIPOS = [
  { id: 'torneo_express',  label: 'Torneo exprés',     emoji: '🏆', color: '#eab308', desc: 'Competencia corta durante un fin de semana o semana' },
  { id: 'bonus_xp',        label: 'Bonus XP',          emoji: '⚡', color: '#a855f7', desc: 'Multiplica el XP ganado en todos los partidos' },
  { id: 'cancha_especial', label: 'Cancha especial',   emoji: '📍', color: '#3b82f6', desc: 'Una cancha destacada con beneficios al ganar' },
  { id: 'nightball',       label: 'Nightball',          emoji: '🌙', color: '#374151', desc: 'Edición nocturna — partidos en canchas iluminadas' },
  { id: 'king_challenge',  label: 'King Challenge',    emoji: '👑', color: '#ef4444', desc: 'El King actual debe defender contra retadores especiales' },
  { id: 'reto_semanal',    label: 'Reto semanal',      emoji: '🎯', color: '#22c55e', desc: 'Objetivo de la semana para ganar bonus o badge' },
  { id: 'otro',            label: 'Otro evento',       emoji: '🎉', color: '#f97316', desc: 'Evento personalizado' },
];

const PRESET_COLORS = [
  { hex: '#eab308', label: 'Oro' },
  { hex: '#ef4444', label: 'Rojo' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#a855f7', label: 'Violeta' },
  { hex: '#22c55e', label: 'Verde' },
  { hex: '#374151', label: 'Oscuro' },
  { hex: '#f97316', label: 'Naranja' },
  { hex: '#ec4899', label: 'Rosa' },
];

export default function NuevoEventoPage() {
  const router = useRouter();

  const [nombre,   setNombre]   = useState('');
  const [tipo,     setTipo]     = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [premio,   setPremio]   = useState('');
  const [reglas,   setReglas]   = useState('');
  const [emoji,    setEmoji]    = useState('');
  const [color,    setColor]    = useState('#eab308');
  const [bonusMult, setBonusMult] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin,    setFechaFin]    = useState('');
  const [activar, setActivar] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const tipoInfo = TIPOS.find(t => t.id === tipo);

  function selectTipo(id: string) {
    const t = TIPOS.find(x => x.id === id);
    if (!t) return;
    setTipo(id);
    setColor(t.color);
    if (!emoji) setEmoji(t.emoji);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) { setError('El nombre es requerido.'); return; }
    if (!tipo)          { setError('Selecciona un tipo de evento.'); return; }
    if (!fechaInicio || !fechaFin) { setError('Las fechas son requeridas.'); return; }
    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      setError('La fecha de fin debe ser posterior al inicio.'); return;
    }

    const mult = bonusMult !== '' ? parseFloat(bonusMult) : null;
    if (mult !== null && (isNaN(mult) || mult < 1 || mult > 10)) {
      setError('El multiplicador XP debe estar entre 1 y 10.'); return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          tipo,
          fecha_inicio: new Date(fechaInicio).toISOString(),
          fecha_fin:    new Date(fechaFin).toISOString(),
          activo:  activar,
          color:   color || null,
          emoji:   emoji.trim() || null,
          premio:  premio.trim() || null,
          reglas:  reglas.trim() || null,
          bonus_xp_mult: mult,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      router.push(`/admin/eventos/${body.evento.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-[16px] font-semibold text-on-surface mb-5">Nuevo evento</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Tipo de evento */}
        <div>
          <label className="block text-[11px] text-outline mb-2 font-medium uppercase tracking-[0.08em]">
            Tipo de evento *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTipo(t.id)}
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors"
                style={{
                  background: tipo === t.id ? `${t.color}18` : undefined,
                  borderColor: tipo === t.id ? `${t.color}60` : undefined,
                }}
              >
                <span className="text-[20px] flex-shrink-0 mt-0.5">{t.emoji}</span>
                <div>
                  <div className="text-[11px] font-bold" style={{ color: tipo === t.id ? t.color : undefined }}>
                    {t.label}
                  </div>
                  <div className="text-[9px] text-outline leading-tight">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Nombre + Emoji */}
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Nombre *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Weekend Warriors"
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              placeholder={tipoInfo?.emoji ?? '🎉'}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Color del evento</label>
          <div className="flex gap-2 flex-wrap items-center">
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
            {/* Preview */}
            {nombre && (
              <div
                className="ml-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1"
                style={{ background: `${color}18`, border: `1px solid ${color}40` }}
              >
                <span>{emoji || tipoInfo?.emoji || '🎉'}</span>
                <span className="text-[10px] font-semibold" style={{ color }}>{nombre}</span>
              </div>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Descripción</label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Describe brevemente el evento..."
            rows={2}
            className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors resize-none"
          />
        </div>

        {/* Premio */}
        <div>
          <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">
            Premio / Beneficio <span className="normal-case text-[10px]">(qué ganan los participantes)</span>
          </label>
          <input
            type="text"
            value={premio}
            onChange={e => setPremio(e.target.value)}
            placeholder="Ej: +500 XP bonus · Badge exclusivo · Cancha conquistada"
            className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
          />
        </div>

        {/* Bonus XP mult — solo para bonus_xp */}
        {tipo === 'bonus_xp' && (
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">
              Multiplicador XP <span className="normal-case text-[10px]">(ej: 2 = doble XP)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bonusMult}
                onChange={e => setBonusMult(e.target.value)}
                min={1}
                max={10}
                step={0.5}
                placeholder="2.0"
                className="w-28 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors"
              />
              <span className="text-[11px] text-on-surface-variant">× XP por partido durante el evento</span>
            </div>
          </div>
        )}

        {/* Reglas */}
        <div>
          <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">
            Reglas <span className="normal-case text-[10px]">(opcional)</span>
          </label>
          <textarea
            value={reglas}
            onChange={e => setReglas(e.target.value)}
            placeholder="Condiciones para participar o ganar el premio..."
            rows={2}
            className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline outline-none focus:border-accent/40 transition-colors resize-none"
          />
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Inicio *</label>
            <input
              type="datetime-local"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface outline-none focus:border-accent/40 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-outline mb-1.5 font-medium uppercase tracking-[0.06em]">Fin *</label>
            <input
              type="datetime-local"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface outline-none focus:border-accent/40 transition-colors"
              required
            />
          </div>
        </div>

        {/* Activar toggle */}
        <div className="flex items-center gap-3 bg-surface-container border border-outline-variant rounded-lg px-3 py-3">
          <button
            type="button"
            onClick={() => setActivar(!activar)}
            className="relative w-10 h-5 rounded-full border transition-colors flex-shrink-0"
            style={activar ? { background: color, borderColor: color } : { borderColor: 'var(--color-outline-variant)' }}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                activar ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <div>
            <div className="text-[12px] font-medium text-on-surface">Publicar inmediatamente</div>
            <div className="text-[11px] text-on-surface-variant">
              {activar
                ? 'El evento aparecerá en el dashboard de todos los usuarios.'
                : 'Se guardará como borrador — actívalo manualmente cuando quieras.'}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">{error}</div>
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
            className="flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: color, color: '#fff' }}
          >
            {loading ? 'Creando...' : 'Crear evento'}
          </button>
        </div>
      </form>
    </div>
  );
}
