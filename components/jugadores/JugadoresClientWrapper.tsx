'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { POSICIONES_POR_DEPORTE, ESPECIALIDADES_POR_DEPORTE, DEPORTES_MAP } from '@/lib/player-constants';
import { REGIONES_CHILE, COMUNAS_POR_REGION } from '@/lib/chile-geo';
import { XPBar } from '@/components/ui/XPBar';
import { Badge } from '@/components/ui/Badge';
import { nombreNivel } from '@/lib/levels';
import { InvitarJugadorButton } from './InvitarJugadorButton';
import type { JugadorRow } from '@/app/(app)/jugadores/page';

interface Props {
  jugadores: JugadorRow[];
  viewerEquipo: { id: string; nombre: string } | null;
  invitacionesMapa: Record<string, string>;
}

const posicionesDisponibles = POSICIONES_POR_DEPORTE['basketball'] ?? [];
const especialidadesDisponibles = ESPECIALIDADES_POR_DEPORTE['basketball'] ?? [];

export function JugadoresClientWrapper({ jugadores, viewerEquipo, invitacionesMapa }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [posicionFiltro, setPosicionFiltro] = useState('');
  const [especialidadesFiltro, setEspecialidadesFiltro] = useState<string[]>([]);
  const [regionFiltro, setRegionFiltro] = useState('');
  const [comunaFiltro, setComunaFiltro] = useState('');

  const handleRegionChange = (region: string) => {
    setRegionFiltro(region);
    setComunaFiltro('');
  };

  const toggleEspecialidad = (esp: string) => {
    setEspecialidadesFiltro(prev =>
      prev.includes(esp) ? prev.filter(e => e !== esp) : [...prev, esp],
    );
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setPosicionFiltro('');
    setEspecialidadesFiltro([]);
    setRegionFiltro('');
    setComunaFiltro('');
  };

  const comunasDeRegion = regionFiltro ? (COMUNAS_POR_REGION[regionFiltro] ?? []) : [];

  const filtrosActivos =
    busqueda.trim() !== '' ||
    posicionFiltro !== '' ||
    especialidadesFiltro.length > 0 ||
    regionFiltro !== '' ||
    comunaFiltro !== '';

  const cantidadFiltros =
    (busqueda.trim() !== '' ? 1 : 0) +
    (posicionFiltro !== '' ? 1 : 0) +
    especialidadesFiltro.length +
    (regionFiltro !== '' ? 1 : 0) +
    (comunaFiltro !== '' ? 1 : 0);

  const jugadoresFiltrados = useMemo(() => {
    return jugadores.filter(j => {
      // Text search: nombre, ciudad
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const nombre = (j.display_name ?? j.username ?? '').toLowerCase();
        if (!nombre.includes(q) && !(j.ciudad ?? '').toLowerCase().includes(q)) return false;
      }
      // Posición
      if (posicionFiltro && j.posicion_principal !== posicionFiltro) return false;
      // Especialidades (all selected must be present)
      if (especialidadesFiltro.length > 0) {
        const esp = j.especialidades ?? [];
        if (!especialidadesFiltro.every(e => esp.includes(e))) return false;
      }
      // Región
      if (regionFiltro && j.region !== regionFiltro) return false;
      // Comuna
      if (comunaFiltro && j.comuna !== comunaFiltro) return false;
      return true;
    });
  }, [jugadores, busqueda, posicionFiltro, especialidadesFiltro, regionFiltro, comunaFiltro]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <h1 className="text-[18px] font-semibold text-on-surface">Jugadores disponibles</h1>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {jugadoresFiltrados.length}{filtrosActivos ? ` de ${jugadores.length}` : ''}{' '}
            jugador{jugadoresFiltrados.length !== 1 ? 'es' : ''} buscando equipo
          </p>
        </div>
        <Link
          href="/equipos"
          className="text-[11px] text-accent hover:underline font-medium"
        >
          Ver equipos →
        </Link>
      </div>

      {/* ── Filter bar (sticky) ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-surface border-b border-outline-variant px-5 pb-4 flex flex-col gap-2.5">
        {/* Row 1: Search */}
        <input
          type="search"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o ciudad…"
          className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline focus:outline-none focus:border-outline transition-colors"
        />

        {/* Row 2: Región + Comuna */}
        <div className="flex gap-2">
          <select
            value={regionFiltro}
            onChange={e => handleRegionChange(e.target.value)}
            className="flex-1 min-w-0 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface focus:outline-none focus:border-outline transition-colors cursor-pointer"
          >
            <option value="">Todas las regiones</option>
            {REGIONES_CHILE.map(r => (
              <option key={r.codigo} value={r.nombreCorto}>
                {r.nombreCorto}
              </option>
            ))}
          </select>
          <select
            value={comunaFiltro}
            onChange={e => setComunaFiltro(e.target.value)}
            disabled={!regionFiltro}
            className="flex-1 min-w-0 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface focus:outline-none focus:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">Todas las comunas</option>
            {comunasDeRegion.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Row 3: Posición chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setPosicionFiltro('')}
            className={`flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-full border transition-colors cursor-pointer ${
              posicionFiltro === ''
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-surface border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
            }`}
          >
            Todas
          </button>
          {posicionesDisponibles.map(pos => (
            <button
              key={pos}
              onClick={() => setPosicionFiltro(posicionFiltro === pos ? '' : pos)}
              className={`flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                posicionFiltro === pos
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-surface border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Row 4: Especialidades multi-chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span className="flex-shrink-0 text-[10px] uppercase tracking-wide text-outline font-medium self-center pr-1">
            Esp.
          </span>
          {especialidadesDisponibles.map(esp => (
            <button
              key={esp}
              onClick={() => toggleEspecialidad(esp)}
              className={`flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                especialidadesFiltro.includes(esp)
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-surface border-outline-variant text-outline hover:border-outline hover:text-on-surface-variant'
              }`}
            >
              {esp}
            </button>
          ))}
        </div>

        {/* Active filters summary */}
        {filtrosActivos && (
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] text-on-surface-variant">
              {cantidadFiltros} filtro{cantidadFiltros !== 1 ? 's' : ''} activo{cantidadFiltros !== 1 ? 's' : ''}
            </span>
            <button
              onClick={limpiarFiltros}
              className="text-[11px] text-accent hover:underline cursor-pointer font-medium"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* ── Result list ─────────────────────────────────────────────────── */}
      <div className="p-5">
        {jugadores.length === 0 ? (
          /* Genuinely empty — no filters involved */
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
            <div className="text-[32px] mb-3">🏀</div>
            <p className="text-[15px] text-on-surface font-medium mb-1">Sin jugadores disponibles</p>
            <p className="text-[12px] text-on-surface-variant">
              Aún no hay jugadores marcados como disponibles para reclutamiento.
            </p>
          </div>
        ) : jugadoresFiltrados.length === 0 && filtrosActivos ? (
          /* No results due to filters */
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
            <div className="text-[32px] mb-3">🔍</div>
            <p className="text-[15px] text-on-surface font-medium mb-1">
              No hay jugadores con estos filtros
            </p>
            <p className="text-[12px] text-on-surface-variant mb-4">
              Prueba ajustando los filtros para ver más resultados.
            </p>
            <button
              onClick={limpiarFiltros}
              className="text-[12px] text-accent hover:underline cursor-pointer font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jugadoresFiltrados.map(jugador => {
              const nombre = jugador.display_name ?? jugador.username ?? '';
              const deportes: string[] = jugador.deportes_activos ?? [];
              const especialidadesSlice: string[] = (jugador.especialidades ?? []).slice(0, 3);
              const nivel = jugador.nivel ?? 1;
              const xp = jugador.xp ?? 0;

              const palabras = nombre.trim().split(/\s+/);
              const iniciales =
                palabras.length >= 2
                  ? (palabras[0][0] + palabras[1][0]).toUpperCase()
                  : nombre.slice(0, 2).toUpperCase();

              return (
                <div
                  key={jugador.id}
                  className="bg-surface-container-low border border-outline-variant rounded-xl p-4"
                >
                  {/* Card clicable (ir al perfil) */}
                  <Link
                    href={`/jugadores/${jugador.id}`}
                    className="block hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {jugador.avatar_url ? (
                          <img
                            src={jugador.avatar_url}
                            alt={nombre}
                            className="w-12 h-12 rounded-lg object-cover border border-outline-variant"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
                            <span className="text-[16px] font-semibold text-accent">{iniciales}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[15px] font-semibold text-on-surface truncate">
                            {nombre}
                          </span>
                          <Badge variant="libre">Disponible</Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] text-accent font-medium">
                            Lv.{nivel} — {nombreNivel(nivel)}
                          </span>
                          {jugador.ciudad && (
                            <span className="text-[11px] text-on-surface-variant">
                              📍 {jugador.ciudad}
                            </span>
                          )}
                          {jugador.region && !jugador.ciudad && (
                            <span className="text-[11px] text-on-surface-variant">
                              📍 {jugador.region}
                            </span>
                          )}
                        </div>
                        {jugador.posicion_principal && (
                          <div className="text-[11px] text-on-surface-variant mb-1">
                            📌 {jugador.posicion_principal}
                          </div>
                        )}
                        {jugador.bio && (
                          <p className="text-[12px] text-on-surface-variant line-clamp-2 mb-2">
                            {jugador.bio}
                          </p>
                        )}
                        <div className="flex gap-1.5 flex-wrap">
                          {deportes.slice(0, 3).map(dep => {
                            const d = DEPORTES_MAP[dep];
                            if (!d) return null;
                            return (
                              <Badge key={dep} variant="neutral">
                                {d.emoji} {d.label}
                              </Badge>
                            );
                          })}
                          {especialidadesSlice.map(esp => (
                            <Badge key={esp} variant="primary">
                              {esp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-outline-variant">
                      <XPBar xp={xp} nivel={nivel} compact />
                    </div>
                  </Link>

                  {/* Botón Invitar — solo visible para admins/capitanes */}
                  {viewerEquipo && (
                    <div className="mt-3">
                      <InvitarJugadorButton
                        equipoId={viewerEquipo.id}
                        equipoNombre={viewerEquipo.nombre}
                        jugadorId={jugador.id}
                        jugadorNombre={nombre}
                        tokenExistente={invitacionesMapa[jugador.id] ?? null}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
