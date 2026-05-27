'use client';

import { useState } from 'react';

interface Props {
  equipoId: string;
  initialBuscando: boolean;
  initialModalidad: string | null;
}

const MODALIDADES = [
  { id: '3v3',             label: '3v3' },
  { id: '5v5',             label: '5v5' },
  { id: '1v1',             label: '1v1' },
  { id: '2v2',             label: '2v2' },
  { id: '4v4',             label: '4v4' },
  { id: 'equipo_completo', label: 'Completo' },
];

export function BuscandoRivalToggle({ equipoId: _equipoId, initialBuscando, initialModalidad }: Props) {
  const [buscando, setBuscando]   = useState(initialBuscando);
  const [modalidad, setModalidad] = useState<string | null>(initialModalidad);
  const [loading, setLoading]     = useState(false);

  async function handleToggle() {
    setLoading(true);
    const nuevoEstado = !buscando;
    setBuscando(nuevoEstado);
    if (!nuevoEstado) setModalidad(null);

    await fetch('/api/equipo/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buscando_rival: nuevoEstado }),
    });
    setLoading(false);
  }

  async function handleModalidad(mod: string) {
    const nuevo = modalidad === mod ? null : mod; // toggle off if same
    setModalidad(nuevo);
    await fetch('/api/equipo/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rival_modalidad: nuevo }),
    });
  }

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">{buscando ? '🔥' : '🔍'}</span>
          <span className="text-[13px] font-semibold text-on-surface">
            {buscando ? 'Buscando rival' : 'Buscar rival'}
          </span>
        </div>
        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          disabled={loading}
          aria-label={buscando ? 'Dejar de buscar rival' : 'Buscar rival'}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            buscando ? 'bg-accent' : 'bg-outline-variant'
          } disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-surface rounded-full shadow transition-transform ${
            buscando ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      <p className="text-[11px] text-outline mb-3">
        {buscando
          ? 'Tu equipo aparece para rivales cercanos en el mapa y buscador.'
          : 'Activa para que equipos de tu zona puedan encontrarte.'}
      </p>

      {/* Modalidad selector — only when active */}
      {buscando && (
        <div>
          <div className="text-[10px] text-outline uppercase tracking-[0.08em] font-medium mb-2">
            Formato de juego <span className="normal-case">(opcional)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MODALIDADES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModalidad(m.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
                  modalidad === m.id
                    ? 'bg-accent/15 border-accent/40 text-accent'
                    : 'bg-surface border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
