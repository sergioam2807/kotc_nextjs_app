'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { XPBar } from '@/components/ui/XPBar';
import { Badge } from '@/components/ui/Badge';
import { nombreNivel } from '@/lib/levels';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EquipoRow {
  id: string;
  nombre: string;
  deporte: string;
  modalidad: string | null;
  ciudad: string | null;
  region: string | null;
  color: string | null;
  nivel: number | null;
  xp: number | null;
  equipo_miembros: { count: number }[] | null;
  buscando_rival: boolean | null;       // NEW
  rival_modalidad: string | null;       // NEW
}

interface Props {
  equipos: EquipoRow[];
  userEquipoId: string | null;
  userId: string | null;
  initialSoloRivales?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀',
  futbol:     '⚽',
  voleibol:   '🏐',
  tenis:      '🎾',
  padel:      '🏓',
};

const DEPORTE_LABELS: Record<string, string> = {
  basketball: 'Basketball',
  futbol:     'Fútbol',
  voleibol:   'Voleibol',
  tenis:      'Tenis',
  padel:      'Pádel',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function EquiposClientWrapper({ equipos, userEquipoId, userId, initialSoloRivales = false }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [deporteFiltro, setDeporteFiltro] = useState('');
  const [regionFiltro, setRegionFiltro] = useState('');
  const [modalidadFiltro, setModalidadFiltro] = useState('');
  const [soloRivales, setSoloRivales] = useState(initialSoloRivales);

  // Derived filter options from actual data
  const deportesDisponibles = useMemo(() => {
    const set = new Set<string>();
    equipos.forEach(e => { if (e.deporte) set.add(e.deporte); });
    return Array.from(set).sort();
  }, [equipos]);

  const regionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    equipos.forEach(e => { if (e.region) set.add(e.region); });
    return Array.from(set).sort();
  }, [equipos]);

  const modalidadesDisponibles = useMemo(() => {
    const set = new Set<string>();
    equipos.forEach(e => { if (e.modalidad) set.add(e.modalidad); });
    return Array.from(set).sort();
  }, [equipos]);

  // Filtered list
  const equiposFiltrados = useMemo(() => {
    return equipos.filter(e => {
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        if (!e.nombre.toLowerCase().includes(q) && !(e.ciudad ?? '').toLowerCase().includes(q)) return false;
      }
      if (deporteFiltro && e.deporte !== deporteFiltro) return false;
      if (regionFiltro && e.region !== regionFiltro) return false;
      if (modalidadFiltro && e.modalidad !== modalidadFiltro) return false;
      if (soloRivales && !e.buscando_rival) return false;
      return true;
    });
  }, [equipos, busqueda, deporteFiltro, regionFiltro, modalidadFiltro, soloRivales]);

  const activeFilterCount = [busqueda.trim(), deporteFiltro, regionFiltro, modalidadFiltro, soloRivales ? 'rival' : ''].filter(Boolean).length;

  function clearFilters() {
    setBusqueda('');
    setDeporteFiltro('');
    setRegionFiltro('');
    setModalidadFiltro('');
    setSoloRivales(false);
  }

  return (
    <div className="p-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-on-surface">Equipos</h1>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {equiposFiltrados.length === equipos.length
              ? `${equipos.length} equipo${equipos.length !== 1 ? 's' : ''} registrado${equipos.length !== 1 ? 's' : ''}`
              : `${equiposFiltrados.length} de ${equipos.length} equipo${equipos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {!userEquipoId && userId && (
          <Link
            href="/equipo/crear"
            className="bg-accent text-on-accent text-[12px] font-semibold px-3.5 py-2 rounded-lg hover:brightness-95 transition-all"
          >
            + Crear equipo
          </Link>
        )}
      </div>

      {/* ¿Buscas equipo? banner */}
      {userId && !userEquipoId && (
        <div className="bg-accent/8 border border-accent/20 rounded-xl p-4 mb-5 flex items-start gap-3">
          <div className="text-[22px] flex-shrink-0">🏀</div>
          <div>
            <div className="text-[13px] font-semibold text-on-surface mb-0.5">
              ¿Buscas equipo?
            </div>
            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              Haz clic en un equipo para ver su perfil y solicitar unirte. También puedes marcar tu
              perfil como{' '}
              <Link href="/perfil" className="text-accent hover:underline">
                disponible para reclutamiento
              </Link>{' '}
              para que los capitanes te encuentren.
            </p>
          </div>
        </div>
      )}

      {/* ─── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-surface-container border border-outline-variant rounded-lg px-3 py-2">
          <span className="text-[14px] text-outline flex-shrink-0">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre o ciudad…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="flex-1 bg-transparent text-[12px] text-on-surface placeholder:text-outline outline-none"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="text-outline hover:text-on-surface-variant text-[14px] flex-shrink-0"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Deporte chips */}
        {deportesDisponibles.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setDeporteFiltro('')}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                deporteFiltro === ''
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant'
              }`}
            >
              Todos
            </button>
            {deportesDisponibles.map(d => (
              <button
                key={d}
                onClick={() => setDeporteFiltro(deporteFiltro === d ? '' : d)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                  deporteFiltro === d
                    ? 'bg-accent/15 border-accent/40 text-accent'
                    : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant'
                }`}
              >
                {DEPORTE_EMOJI[d] ?? ''} {DEPORTE_LABELS[d] ?? d}
              </button>
            ))}
          </div>
        )}

        {/* Región select */}
        {regionesDisponibles.length > 1 && (
          <div className="flex items-center gap-2">
            <select
              value={regionFiltro}
              onChange={e => setRegionFiltro(e.target.value)}
              className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface flex-1 outline-none"
            >
              <option value="">Todas las regiones</option>
              {regionesDisponibles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        {/* Modalidad chips */}
        {modalidadesDisponibles.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setModalidadFiltro('')}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                !modalidadFiltro
                  ? 'bg-surface-container border-outline-variant text-on-surface'
                  : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant'
              }`}
            >
              Todas
            </button>
            {modalidadesDisponibles.map(m => (
              <button
                key={m}
                onClick={() => setModalidadFiltro(modalidadFiltro === m ? '' : m)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                  modalidadFiltro === m
                    ? 'bg-accent/15 border-accent/40 text-accent'
                    : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Buscando rival toggle chip */}
        <button
          onClick={() => setSoloRivales(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
            soloRivales
              ? 'bg-accent/15 border-accent/40 text-accent'
              : 'bg-transparent border-outline-variant text-outline hover:text-on-surface-variant'
          }`}
        >
          🔥 Buscando rival
        </button>

        {/* Active filter count + clear */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant">
              {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''} activo{activeFilterCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearFilters}
              className="text-[11px] text-accent hover:underline"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* ─── Empty states ─────────────────────────────────────────────────── */}
      {equipos.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <div className="text-[32px] mb-3">🏟️</div>
          <p className="text-[15px] text-on-surface font-medium mb-1">No hay equipos aún</p>
          <p className="text-[12px] text-on-surface-variant">
            Sé el primero en crear un equipo.
          </p>
          {userId && (
            <Link
              href="/equipo/crear"
              className="inline-block mt-4 text-[13px] text-accent hover:underline"
            >
              Crear equipo →
            </Link>
          )}
        </div>
      ) : equiposFiltrados.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center">
          <div className="text-[28px] mb-2">🔍</div>
          <p className="text-[14px] text-on-surface font-medium mb-1">Sin resultados</p>
          <p className="text-[12px] text-on-surface-variant mb-3">
            No hay equipos que coincidan con los filtros.
          </p>
          <button
            onClick={clearFilters}
            className="text-[12px] text-accent hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        /* ─── Team cards ──────────────────────────────────────────────── */
        <div className="flex flex-col gap-2">
          {equiposFiltrados.map(equipo => {
            const color = equipo.color ?? '#F5C344';
            const nivel = equipo.nivel ?? 1;
            const xp = equipo.xp ?? 0;
            const nivelNombre = nombreNivel(nivel);
            const deporteEmoji = DEPORTE_EMOJI[equipo.deporte] ?? '🏟️';
            const deporteLabel = DEPORTE_LABELS[equipo.deporte] ?? equipo.deporte;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const memberCount = (equipo.equipo_miembros as any)?.[0]?.count ?? 0;
            const words = equipo.nombre.trim().split(/\s+/);
            const iniciales = words.length >= 2
              ? (words[0][0] + words[1][0]).toUpperCase()
              : equipo.nombre.slice(0, 2).toUpperCase();
            const esElMio = equipo.id === userEquipoId;

            return (
              <Link
                key={equipo.id}
                href={`/equipos/${equipo.id}`}
                className="block bg-surface-container-low border border-outline-variant rounded-xl p-4 hover:border-outline transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar equipo */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-bold flex-shrink-0 border"
                    style={{ background: `${color}15`, color, borderColor: `${color}40` }}
                  >
                    {iniciales}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[15px] font-semibold truncate"
                        style={{ color }}
                      >
                        {equipo.nombre}
                      </span>
                      {esElMio && <Badge variant="accent">Mi equipo</Badge>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-[11px] text-on-surface-variant">
                        {deporteEmoji} {deporteLabel}
                      </span>
                      {equipo.modalidad && (
                        <span className="text-[11px] text-outline">· {equipo.modalidad}</span>
                      )}
                      {equipo.ciudad && (
                        <span className="text-[11px] text-outline">· 📍 {equipo.ciudad}</span>
                      )}
                      {equipo.region && (
                        <span className="text-[11px] text-outline">· {equipo.region}</span>
                      )}
                    </div>
                    {equipo.buscando_rival && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent mt-0.5">
                        🔥 Buscando rival{equipo.rival_modalidad ? ` · ${equipo.rival_modalidad}` : ''}
                      </span>
                    )}
                    <div className="text-[10px] text-outline mt-0.5 uppercase tracking-wide">
                      {nivelNombre}
                    </div>
                  </div>

                  {/* Right: nivel + miembros */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-[11px] text-accent font-medium">Lv.{nivel}</div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">
                      {memberCount} jugador{memberCount !== 1 ? 'es' : ''}
                    </div>
                  </div>
                </div>

                {/* XP bar */}
                <div className="mt-3 pt-2.5 border-t border-outline-variant">
                  <XPBar xp={xp} nivel={nivel} compact />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
