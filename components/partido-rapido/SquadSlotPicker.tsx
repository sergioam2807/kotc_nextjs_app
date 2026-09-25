'use client';

import { useEffect, useState } from 'react';
import { Input } from '@heroui/react';
import type { JugadorBusqueda } from './types';

export interface Slot {
  tipo: 'invitado' | 'jugador';
  nombre_invitado: string;
  jugador: JugadorBusqueda | null;
}

export const SLOT_VACIO: Slot = { tipo: 'invitado', nombre_invitado: '', jugador: null };

export type MiembroSquadBody = { jugador_id: string } | { nombre_invitado: string };

/** Convierte los slots armados en el body que espera la API (`squad`). */
export function slotsToSquad(slots: Slot[]): MiembroSquadBody[] {
  return slots
    .filter(s => (s.tipo === 'invitado' ? s.nombre_invitado.trim() : s.jugador))
    .map(s => (s.tipo === 'invitado' ? { nombre_invitado: s.nombre_invitado.trim() } : { jugador_id: s.jugador!.id }));
}

function iniciales(nombre: string): string {
  const words = nombre.trim().split(/\s+/);
  return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : nombre.slice(0, 2).toUpperCase();
}

function nombreJugador(j: { display_name: string | null; username: string | null } | null, fallback: string): string {
  return j?.display_name ?? j?.username ?? fallback;
}

interface Props {
  slots: Slot[];
  onChange: (index: number, slot: Slot) => void;
}

/**
 * Par de slots "compañero" reutilizado en dos lugares: el paso "equipo" del
 * wizard de Partido Rápido (armar el trío propio) y el mini-form de aceptar
 * un reto directo en `PartidosRapidosSection` (el retado también puede sumar
 * compañeros al aceptar). Cada slot es "✍️ invitado" (nombre libre, sin
 * cuenta, sin XP) o "🔍 jugador KOTC" (búsqueda vía /api/jugadores/buscar).
 */
export function SquadSlotPicker({ slots, onChange }: Props) {
  const [busqueda, setBusqueda] = useState<{ slot: number | null; q: string; resultados: JugadorBusqueda[] }>(
    { slot: null, q: '', resultados: [] },
  );

  useEffect(() => {
    if (busqueda.slot === null || busqueda.q.trim().length < 2) {
      setBusqueda(b => ({ ...b, resultados: [] }));
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jugadores/buscar?q=${encodeURIComponent(busqueda.q.trim())}`);
        const data = await res.json().catch(() => ({ jugadores: [] }));
        setBusqueda(b => (b.slot !== null ? { ...b, resultados: data.jugadores ?? [] } : b));
      } catch {
        // silencioso — el usuario puede reintentar tipeando de nuevo
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda.q, busqueda.slot]);

  return (
    <>
      {slots.map((slot, idx) => (
        <div key={idx} className="mb-2.5">
          <div className="flex gap-1.5 mb-1.5">
            <button
              type="button"
              onClick={() => onChange(idx, { ...SLOT_VACIO, tipo: 'invitado' })}
              className={`flex-1 text-[11px] font-semibold py-1.5 rounded-full border transition-colors ${
                slot.tipo === 'invitado' ? 'bg-accent text-on-accent border-accent' : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              ✍️ Invitado
            </button>
            <button
              type="button"
              onClick={() => { onChange(idx, { ...SLOT_VACIO, tipo: 'jugador' }); setBusqueda({ slot: idx, q: '', resultados: [] }); }}
              className={`flex-1 text-[11px] font-semibold py-1.5 rounded-full border transition-colors ${
                slot.tipo === 'jugador' ? 'bg-accent text-on-accent border-accent' : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              🔍 Jugador KOTC
            </button>
          </div>

          {slot.tipo === 'invitado' ? (
            <Input
              type="text"
              aria-label={`Nombre del compañero ${idx + 2}`}
              placeholder={`Nombre del compañero ${idx + 2} (opcional)`}
              value={slot.nombre_invitado}
              onChange={e => onChange(idx, { ...slot, nombre_invitado: e.target.value })}
              fullWidth
            />
          ) : slot.jugador ? (
            <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2">
              <span className="text-[12px] text-on-surface">{nombreJugador(slot.jugador, 'Jugador')}</span>
              <button type="button" onClick={() => onChange(idx, { ...slot, jugador: null })} className="text-outline hover:text-on-surface-variant text-[11px]">
                cambiar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Input
                type="text"
                aria-label={`Buscar compañero ${idx + 2}`}
                placeholder="Buscar por nombre…"
                value={busqueda.slot === idx ? busqueda.q : ''}
                onChange={e => setBusqueda({ slot: idx, q: e.target.value, resultados: [] })}
                fullWidth
              />
              {busqueda.slot === idx && busqueda.resultados.length > 0 && (
                <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden max-h-[140px] overflow-y-auto">
                  {busqueda.resultados.map(j => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => { onChange(idx, { ...slot, jugador: j }); setBusqueda({ slot: null, q: '', resultados: [] }); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-md bg-surface-container-high flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {iniciales(nombreJugador(j, '?'))}
                      </div>
                      {nombreJugador(j, 'Jugador')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
