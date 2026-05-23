'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  POSICIONES_POR_DEPORTE,
  ESPECIALIDADES_POR_DEPORTE,
  DEPORTES_MAP,
} from '@/lib/player-constants';

interface PerfilData {
  bio?: string | null;
  posicion_principal?: string | null;
  posiciones_adicionales?: string[] | null;
  especialidades?: string[] | null;
  altura_cm?: number | null;
  peso_kg?: number | null;
  mano_habil?: string | null;
  anos_experiencia?: number | null;
  disponible_reclutamiento?: boolean | null;
  deportes_activos?: string[] | null;
}

interface Props {
  initialData: PerfilData;
}

const MAX_ESPECIALIDADES = 8;

export function EditarPerfilForm({ initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const deportesActivos: string[] = initialData.deportes_activos ?? [];

  const [bio, setBio] = useState(initialData.bio ?? '');
  const [posicionPrincipal, setPosicionPrincipal] = useState(initialData.posicion_principal ?? '');
  const [posicionesAdicionales, setPosicionesAdicionales] = useState<string[]>(
    initialData.posiciones_adicionales ?? [],
  );
  const [especialidades, setEspecialidades] = useState<string[]>(
    initialData.especialidades ?? [],
  );
  const [alturaCm, setAlturaCm] = useState<string>(
    initialData.altura_cm ? String(initialData.altura_cm) : '',
  );
  const [pesoKg, setPesoKg] = useState<string>(
    initialData.peso_kg ? String(initialData.peso_kg) : '',
  );
  const [manoHabil, setManoHabil] = useState(initialData.mano_habil ?? 'derecha');
  const [anosExperiencia, setAnosExperiencia] = useState<number>(
    initialData.anos_experiencia ?? 0,
  );
  const [disponible, setDisponible] = useState(
    initialData.disponible_reclutamiento ?? false,
  );

  // Collect all positions across active sports (deduplicated)
  const todasPosiciones = Array.from(
    new Set(deportesActivos.flatMap(dep => POSICIONES_POR_DEPORTE[dep] ?? [])),
  );

  // Collect all specialties across active sports (deduplicated)
  const todasEspecialidades = Array.from(
    new Set(deportesActivos.flatMap(dep => ESPECIALIDADES_POR_DEPORTE[dep] ?? [])),
  );

  function togglePosicionAdicional(pos: string) {
    if (pos === posicionPrincipal) return; // skip — already principal
    setPosicionesAdicionales(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos],
    );
  }

  function toggleEspecialidad(esp: string) {
    setEspecialidades(prev => {
      if (prev.includes(esp)) return prev.filter(e => e !== esp);
      if (prev.length >= MAX_ESPECIALIDADES) return prev; // limit reached
      return [...prev, esp];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setSaveError(null);

    const payload: Record<string, unknown> = {
      bio: bio.trim() || null,
      posicion_principal: posicionPrincipal || null,
      posiciones_adicionales: posicionesAdicionales,
      especialidades,
      altura_cm: alturaCm ? Number(alturaCm) : null,
      peso_kg: pesoKg ? Number(pesoKg) : null,
      mano_habil: manoHabil,
      anos_experiencia: anosExperiencia,
      disponible_reclutamiento: disponible,
    };

    const res = await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error ?? 'Error al guardar');
      return;
    }

    setSaved(true);
    startTransition(() => {
      router.refresh();
    });
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Bio */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <label className="block text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-2.5">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Cuéntale al resto quién eres como jugador..."
          className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface placeholder:text-outline resize-none focus:outline-none focus:border-outline transition-colors"
        />
        <div className="text-[11px] text-on-surface-variant mt-1 text-right">
          {bio.length}/280
        </div>
      </div>

      {/* Posición y especialidades */}
      {deportesActivos.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
          <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-3">
            Posición y especialidades
          </div>

          {/* Positions per sport */}
          {deportesActivos.map(dep => {
            const posiciones = POSICIONES_POR_DEPORTE[dep];
            if (!posiciones?.length) return null;
            const d = DEPORTES_MAP[dep];
            return (
              <div key={dep} className="mb-3">
                <div className="text-[11px] text-on-surface-variant mb-2">
                  {d?.emoji} {d?.label ?? dep}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {posiciones.map(pos => {
                    const isPrincipal = posicionPrincipal === pos;
                    const isAdicional = posicionesAdicionales.includes(pos);
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          if (isPrincipal) {
                            setPosicionPrincipal('');
                          } else {
                            setPosicionPrincipal(pos);
                            setPosicionesAdicionales(prev => prev.filter(p => p !== pos));
                          }
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          isPrincipal
                            ? 'bg-accent/20 border-accent/60 text-accent font-semibold'
                            : isAdicional
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'bg-surface-container border-outline-variant text-on-surface-variant hover:border-outline'
                        }`}
                      >
                        {pos}
                        {isPrincipal && ' ★'}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Additional positions from other sports */}
          {todasPosiciones.length > 0 && (
            <div className="mt-1 mb-3">
              <div className="text-[11px] text-on-surface-variant mb-1.5">
                Posiciones adicionales (toca para marcar)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {todasPosiciones
                  .filter(pos => pos !== posicionPrincipal)
                  .map(pos => {
                    const isAdicional = posicionesAdicionales.includes(pos);
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => togglePosicionAdicional(pos)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          isAdicional
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'bg-surface-container border-outline-variant text-on-surface-variant hover:border-outline'
                        }`}
                      >
                        {pos}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Especialidades */}
          {todasEspecialidades.length > 0 && (
            <div className="mt-3 pt-3 border-t border-outline-variant">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] text-on-surface-variant">
                  Especialidades ({especialidades.length}/{MAX_ESPECIALIDADES})
                </div>
                {especialidades.length >= MAX_ESPECIALIDADES && (
                  <span className="text-[10px] text-accent">Máximo alcanzado</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {todasEspecialidades.map(esp => {
                  const selected = especialidades.includes(esp);
                  const disabled = !selected && especialidades.length >= MAX_ESPECIALIDADES;
                  return (
                    <button
                      key={esp}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleEspecialidad(esp)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        selected
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'bg-surface-container border-outline-variant text-on-surface-variant hover:border-outline'
                      }`}
                    >
                      {esp}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {deportesActivos.length === 0 && (
            <p className="text-[12px] text-on-surface-variant text-center py-2">
              Agrega deportes activos en tu perfil para ver las posiciones disponibles.
            </p>
          )}
        </div>
      )}

      {deportesActivos.length === 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
          <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-2">
            Posición y especialidades
          </div>
          <p className="text-[12px] text-on-surface-variant">
            Completa tu onboarding para definir tus deportes activos y luego podrás elegir posiciones y especialidades.
          </p>
        </div>
      )}

      {/* Datos físicos */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase mb-3">
          Datos físicos
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] text-on-surface-variant mb-1">Altura (cm)</label>
            <input
              type="number"
              min={100}
              max={230}
              value={alturaCm}
              onChange={e => setAlturaCm(e.target.value)}
              placeholder="ej. 180"
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:border-outline transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] text-on-surface-variant mb-1">Peso (kg)</label>
            <input
              type="number"
              min={30}
              max={180}
              value={pesoKg}
              onChange={e => setPesoKg(e.target.value)}
              placeholder="ej. 75"
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:border-outline transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-on-surface-variant mb-2">Mano hábil</label>
          <div className="flex gap-2">
            {(['derecha', 'izquierda', 'ambas'] as const).map(mano => (
              <button
                key={mano}
                type="button"
                onClick={() => setManoHabil(mano)}
                className={`flex-1 text-[12px] py-2 rounded-lg border transition-colors cursor-pointer capitalize ${
                  manoHabil === mano
                    ? 'bg-accent/15 border-accent/50 text-accent font-semibold'
                    : 'bg-surface-container border-outline-variant text-on-surface-variant hover:border-outline'
                }`}
              >
                {mano.charAt(0).toUpperCase() + mano.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Experiencia */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-on-surface-variant tracking-[0.08em] font-medium uppercase">
            Años de experiencia
          </div>
          <span className="text-[18px] font-semibold text-on-surface">{anosExperiencia}</span>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={anosExperiencia}
          onChange={e => setAnosExperiencia(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
          <span>0</span>
          <span>15</span>
          <span>30+</span>
        </div>
      </div>

      {/* Disponible para reclutamiento */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={disponible}
              onChange={e => setDisponible(e.target.checked)}
              className="sr-only"
            />
            <div
              onClick={() => setDisponible(v => !v)}
              className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${
                disponible ? 'bg-status-libre' : 'bg-surface-container border border-outline-variant'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  disponible ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
          </div>
          <div>
            <div className="text-[13px] font-medium text-on-surface">
              Disponible para reclutamiento
            </div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">
              Aparecerás en la lista de jugadores disponibles para ser reclutado por equipos
            </div>
          </div>
        </label>
      </div>

      {/* Submit */}
      {saveError && (
        <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-3 text-[12px] text-error">
          {saveError}
        </div>
      )}

      {saved && (
        <div className="bg-status-libre/10 border border-status-libre/30 rounded-lg px-4 py-3 text-[12px] text-status-libre">
          ¡Perfil actualizado correctamente!
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-accent text-on-accent font-semibold text-[14px] py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer min-h-[48px]"
      >
        {isPending ? 'Guardando...' : 'Guardar perfil'}
      </button>
    </form>
  );
}
