'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AgregarCanchaModal } from './AgregarCanchaModal';
import { EditarCanchaModal } from './EditarCanchaModal';
import { MapaTerritorial } from './MapaTerritorial';

export interface CanchaConEstado {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  deporte: string[];
  estado: 'libre' | 'king' | 'rival';
  equipoId?: string;
  equipoNombre?: string;
  equipoColor?: string;
  victorias?: number;
  derrotas?: number;
  // Información del recinto (migración 023)
  es_publica?: boolean;
  precio_hora?: number | null;
  telefono_contacto?: string | null;
  nombre_recinto?: string | null;
}

interface Props {
  canchas: CanchaConEstado[];
  equipoId: string | null;
  stats: { misKing: number; partidos: number; total: number };
  deporteInicial?: string;
}

type Filtro = 'todas' | 'king' | 'libre' | 'rival';

// Design token hex values — used in inline styles where Tailwind classes can't reach
const ESTADO_COLORS = {
  king: '#ffe083',   // --accent
  libre: '#4ade80',  // --status-libre
  rival: '#f87171',  // --status-rival
};

const ESTADO_LABELS = {
  king: 'KING',
  libre: 'LIBRE',
  rival: 'RIVAL',
};

const DEPORTES = [
  { id: 'basketball', emoji: '🏀', label: 'Basketball' },
  { id: 'futbol',     emoji: '⚽', label: 'Fútbol' },
  { id: 'voleibol',   emoji: '🏐', label: 'Vóleibol' },
  { id: 'tenis',      emoji: '🎾', label: 'Tenis' },
  { id: 'padel',      emoji: '🏓', label: 'Pádel' },
];

export function MapaClientWrapper({ canchas, equipoId, stats, deporteInicial }: Props) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [deporteFiltro, setDeporteFiltro] = useState<string>(deporteInicial ?? 'todas');
  const [busqueda, setBusqueda] = useState('');
  const [canchaSeleccionada, setCanchaSeleccionada] = useState<CanchaConEstado | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modoAgregar, setModoAgregar] = useState(false);
  const [coordsNuevaCancha, setCoordsNuevaCancha] = useState<{ lat: number; lng: number } | null>(null);
  const [canchasLocales, setCanchasLocales] = useState<CanchaConEstado[]>(canchas);
  const [panToCoords, setPanToCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [canchaEditando, setCanchaEditando] = useState<CanchaConEstado | null>(null);
  const [modoEditarUbicacion, setModoEditarUbicacion] = useState(false);
  const [coordsEditando, setCoordsEditando] = useState<{ lat: number; lng: number } | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const canchasFiltradas = useMemo(() => {
    return canchasLocales.filter((c) => {
      if (filtro !== 'todas' && c.estado !== filtro) return false;
      if (deporteFiltro !== 'todas' && !c.deporte.includes(deporteFiltro)) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        if (!c.nombre.toLowerCase().includes(q) && !c.direccion.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [canchasLocales, filtro, deporteFiltro, busqueda]);

  const conteos = useMemo(() => ({
    todas: canchasLocales.length,
    king: canchasLocales.filter((c) => c.estado === 'king').length,
    libre: canchasLocales.filter((c) => c.estado === 'libre').length,
    rival: canchasLocales.filter((c) => c.estado === 'rival').length,
  }), [canchasLocales]);

  const filtroItems: { id: Filtro; label: string; color: string; count: number }[] = [
    { id: 'todas', label: 'Todas', color: '#8f909d', count: conteos.todas },
    { id: 'king',  label: 'King',   color: '#ffe083', count: conteos.king },
    { id: 'libre', label: 'Libres', color: '#4ade80', count: conteos.libre },
    { id: 'rival', label: 'Rivales',color: '#f87171', count: conteos.rival },
  ];

  useEffect(() => {
    if (busqueda.trim() && canchasFiltradas.length === 1) {
      const c = canchasFiltradas[0];
      setPanToCoords({ lat: c.lat, lng: c.lng });
      setCanchaSeleccionada(c);
    }
  }, [canchasFiltradas, busqueda]);

  function handleSelectFromDropdown(cancha: CanchaConEstado) {
    setCanchaSeleccionada(cancha);
    setPanToCoords({ lat: cancha.lat, lng: cancha.lng });
    setBusqueda('');
    setMobileListOpen(false);
  }

  function handleMapClick(lat: number, lng: number) {
    if (modoEditarUbicacion) {
      setCoordsEditando({ lat, lng });
      setModoEditarUbicacion(false);
      setShowEditModal(true);
      return;
    }
    setCoordsNuevaCancha({ lat, lng });
    setModoAgregar(false);
    setShowModal(true);
  }

  function handleEditarCancha(cancha: CanchaConEstado) {
    setCanchaEditando(cancha);
    setCoordsEditando(null);
    setShowEditModal(true);
  }

  function handleNecesitaClickMapaEditar() {
    setShowEditModal(false);
    setModoEditarUbicacion(true);
  }

  function handleEditModalClose() {
    setShowEditModal(false);
    setModoEditarUbicacion(false);
    setCoordsEditando(null);
    setCanchaEditando(null);
  }

  function handleEditSuccess(cancha: CanchaConEstado) {
    setCanchasLocales((prev) => prev.map((c) => (c.id === cancha.id ? cancha : c)));
    setCanchaSeleccionada(cancha);
    setPanToCoords({ lat: cancha.lat, lng: cancha.lng });
    setShowEditModal(false);
    setModoEditarUbicacion(false);
    setCoordsEditando(null);
    setCanchaEditando(null);
  }

  function handleAgregarCanchaClick() {
    setShowModal(true);
    setModoAgregar(true);
    setMobileListOpen(false);
  }

  function handleModalClose() {
    setShowModal(false);
    setModoAgregar(false);
    setCoordsNuevaCancha(null);
  }

  function handleNecesitaClickMapa() {
    setShowModal(false);
    setModoAgregar(true);
  }

  function handleModalSuccess(cancha: CanchaConEstado) {
    setCanchasLocales((prev) => [cancha, ...prev]);
    setShowModal(false);
    setModoAgregar(false);
    setCoordsNuevaCancha(null);
    setCanchaSeleccionada(cancha);
  }

  return (
    <div className="flex h-full">

      {/* ── LEFT PANEL (desktop only) ── */}
      <div className="hidden md:flex md:flex-col w-[200px] bg-surface border-r border-outline-variant flex-shrink-0">
        <div className="p-3.5 border-b border-outline-variant">
          <div className="text-[10px] text-outline tracking-[0.1em] mb-2.5 font-medium uppercase">
            Filtrar por estado
          </div>
          {filtroItems.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex items-center gap-2 w-full bg-transparent border-none px-2 py-1.5 rounded-lg cursor-pointer mb-0.5 transition-colors ${
                filtro === f.id ? 'bg-accent/10' : 'hover:bg-surface-container-low'
              }`}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
              <span className={`text-[12px] flex-1 text-left ${filtro === f.id ? 'text-on-surface' : 'text-outline'}`}>
                {f.label}
              </span>
              <span className="text-[10px] text-outline bg-surface-container rounded-sm px-1.5">{f.count}</span>
            </button>
          ))}
        </div>

        <div className="p-3.5 border-b border-outline-variant">
          <div className="text-[10px] text-outline tracking-[0.1em] mb-2.5 font-medium uppercase">Deporte</div>
          <button
            onClick={() => setDeporteFiltro('todas')}
            className={`flex items-center gap-1.5 w-full bg-transparent border-none px-2 py-1.5 rounded-lg cursor-pointer mb-0.5 transition-colors ${
              deporteFiltro === 'todas' ? 'bg-accent/10' : 'hover:bg-surface-container-low'
            }`}
          >
            <span className="text-[14px]">🏟️</span>
            <span className={`text-[12px] ${deporteFiltro === 'todas' ? 'text-on-surface' : 'text-outline'}`}>Todos</span>
          </button>
          {DEPORTES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDeporteFiltro(d.id)}
              className={`flex items-center gap-1.5 w-full bg-transparent border-none px-2 py-1.5 rounded-lg cursor-pointer mb-0.5 transition-colors ${
                deporteFiltro === d.id ? 'bg-accent/10' : 'hover:bg-surface-container-low'
              }`}
            >
              <span className="text-[14px]">{d.emoji}</span>
              <span className={`text-[12px] ${deporteFiltro === d.id ? 'text-on-surface' : 'text-outline'}`}>{d.label}</span>
            </button>
          ))}
        </div>

        <div className="p-3.5 flex-1">
          <div className="text-[10px] text-outline tracking-[0.1em] mb-2 font-medium uppercase">Mis stats</div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-outline">Mis canchas</span>
            <span className="text-[12px] font-medium text-accent">{stats.misKing}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-outline">Partidos jugados</span>
            <span className="text-[12px] font-medium text-on-surface">{stats.partidos}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-outline">Total canchas</span>
            <span className="text-[12px] font-medium text-on-surface">{stats.total}</span>
          </div>
        </div>
      </div>

      {/* ── MAP AREA ── */}
      <div className="flex-1 relative bg-surface-container-low overflow-hidden">

        {/* Search bar overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-2 items-start pointer-events-none">
          <div className="relative flex-1 pointer-events-auto">
            <div className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-outline">🔍</span>
              <input
                className="bg-transparent border-none text-[12px] text-on-surface-variant outline-none flex-1 min-w-0 placeholder:text-outline"
                placeholder="Buscar cancha..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="text-outline hover:text-on-surface-variant text-[14px] leading-none">
                  ×
                </button>
              )}
            </div>

            {busqueda.trim() && canchasFiltradas.length > 1 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                {canchasFiltradas.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectFromDropdown(c)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-surface-container transition-colors border-b border-outline-variant last:border-0"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ESTADO_COLORS[c.estado] }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-on-surface font-medium truncate">{c.nombre}</div>
                      <div className="text-[10px] text-outline truncate">{c.direccion}</div>
                    </div>
                  </button>
                ))}
                {canchasFiltradas.length > 8 && (
                  <div className="px-3 py-2 text-[10px] text-outline text-center">
                    +{canchasFiltradas.length - 8} más — refiná la búsqueda
                  </div>
                )}
              </div>
            )}
          </div>

          {(modoAgregar || modoEditarUbicacion) && (
            <div className="bg-accent/15 border border-accent/40 rounded-lg px-3 py-2 pointer-events-auto">
              <span className="text-[11px] text-accent">
                {modoEditarUbicacion ? 'Haz clic en la nueva ubicación' : 'Haz clic en el mapa'}
              </span>
            </div>
          )}
        </div>

        {/* ── MOBILE FILTER CHIPS (below search) ── */}
        <div className="md:hidden absolute left-0 right-0 z-10 flex gap-1.5 overflow-x-auto px-3 pointer-events-none" style={{ top: '56px' }}>
          <div className="flex gap-1.5 pointer-events-auto pb-1">
            {filtroItems.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold border transition-colors ${
                  filtro === f.id
                    ? 'bg-surface-container border-outline-variant text-on-surface'
                    : 'bg-surface-container-low/75 border-outline-variant text-outline'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.color }} />
                {f.label}
              </button>
            ))}
            <div className="w-px self-stretch bg-outline-variant mx-0.5 shrink-0" />
            {DEPORTES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDeporteFiltro(deporteFiltro === d.id ? 'todas' : d.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold border transition-colors ${
                  deporteFiltro === d.id
                    ? 'bg-surface-container border-outline-variant text-on-surface'
                    : 'bg-surface-container-low/75 border-outline-variant text-outline'
                }`}
              >
                {d.emoji} {d.label}
              </button>
            ))}
          </div>
        </div>

        <MapaTerritorial
          canchas={canchasFiltradas}
          onSelectCancha={(c) => setCanchaSeleccionada(c)}
          modoAgregar={modoAgregar || modoEditarUbicacion}
          onMapClick={handleMapClick}
          panToCoords={panToCoords}
        />

        {/* Legend (desktop only) */}
        <div className="hidden md:block absolute bottom-3 left-3 bg-surface-container-low/80 border border-outline-variant rounded-lg px-3 py-2.5 z-10">
          {[
            { color: '#ffe083', label: 'Mis canchas (King)' },
            { color: '#4ade80', label: 'Libre para conquistar' },
            { color: '#f87171', label: 'Cancha rival' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 mb-1.5 last:mb-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
              <span className="text-[11px] text-outline">{l.label}</span>
            </div>
          ))}
        </div>

        {/* ── MOBILE: list toggle button ── */}
        {!canchaSeleccionada && !modoAgregar && !modoEditarUbicacion && (
          <button
            onClick={() => setMobileListOpen(true)}
            className="md:hidden absolute left-3 z-20 bg-surface-container-low border border-outline-variant rounded-full px-3.5 py-2.5 text-[11px] text-on-surface-variant flex items-center gap-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.4)] min-h-[40px]"
            style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
          >
            <span className="w-2 h-2 rounded-full bg-on-surface-variant" />
            {canchasFiltradas.length} canchas
          </button>
        )}

        {/* ── MOBILE: FAB add court ── */}
        {!canchaSeleccionada && !modoAgregar && !modoEditarUbicacion && (
          <button
            onClick={handleAgregarCanchaClick}
            aria-label="Agregar cancha"
            className="md:hidden absolute right-3 z-20 w-14 h-14 bg-accent text-on-accent rounded-full text-2xl font-bold flex items-center justify-center shadow-[0_4px_16px_rgba(255,224,131,0.35)]"
            style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
          >
            +
          </button>
        )}

        {/* ── Selected court panel — redesigned card ── */}
        {canchaSeleccionada && (() => {
          const teamInitials = canchaSeleccionada.equipoNombre
            ? canchaSeleccionada.equipoNombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
            : null;
          const teamColor = canchaSeleccionada.equipoColor ?? '#ffe083';

          return (
            <div
              className="absolute left-3 right-3 md:left-auto md:right-3 md:w-[290px] z-20 bg-surface-container-low/95 backdrop-blur-xl border border-outline-variant rounded-2xl overflow-hidden shadow-[0_8px_48px_rgba(0,0,0,0.65)] md:!bottom-3"
              style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* ── HEADER ── */}
              <div className="px-5 pt-4 pb-4 border-b border-outline-variant">

                {/* Top row: badges + close */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest"
                      style={{
                        background: `${ESTADO_COLORS[canchaSeleccionada.estado]}22`,
                        color: ESTADO_COLORS[canchaSeleccionada.estado],
                      }}
                    >
                      {ESTADO_LABELS[canchaSeleccionada.estado]}
                    </span>
                    {canchaSeleccionada.es_publica === false ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-black uppercase tracking-widest">
                        💰 De pago
                      </span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-status-libre/15 text-status-libre font-black uppercase tracking-widest">
                        🆓 Pública
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setCanchaSeleccionada(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-outline hover:text-on-surface-variant hover:bg-surface-container text-[18px] leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>

                {/* Court name + address */}
                <h3 className="text-[17px] font-black italic uppercase text-on-surface tracking-tight leading-tight mb-0.5">
                  {canchaSeleccionada.nombre}
                </h3>
                {canchaSeleccionada.nombre_recinto && (
                  <div className="text-[10px] text-on-surface-variant font-medium mb-1">
                    {canchaSeleccionada.nombre_recinto}
                  </div>
                )}
                <p className="text-[10px] text-outline leading-relaxed mb-4">
                  {canchaSeleccionada.direccion}
                </p>

                {/* King team row */}
                {canchaSeleccionada.equipoNombre ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar with crown */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-black border-2"
                          style={{
                            background: `${teamColor}1a`,
                            borderColor: `${teamColor}55`,
                            color: teamColor,
                          }}
                        >
                          {teamInitials}
                        </div>
                        <div
                          className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-md shadow-md z-10 text-[11px] leading-none"
                          style={{ background: teamColor, transform: 'rotate(12deg)' }}
                        >
                          👑
                        </div>
                      </div>
                      <div>
                        <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-accent mb-0.5">
                          Rey de la cancha
                        </span>
                        <span
                          className="block text-[15px] font-black italic uppercase leading-tight"
                          style={{ color: teamColor }}
                        >
                          {canchaSeleccionada.equipoNombre}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="block text-[8px] font-bold text-outline uppercase tracking-widest mb-0.5">Récord</span>
                      <span className="text-[15px] font-black italic text-on-surface">
                        {canchaSeleccionada.victorias ?? 0}V — {canchaSeleccionada.derrotas ?? 0}D
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center text-[20px]">
                      🏟️
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-outline">Sin rey</span>
                      <span className="block text-[12px] font-black italic text-on-surface-variant">Cancha libre</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── STATS GRID ── */}
              <div className="px-5 py-3.5 border-b border-outline-variant">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Victorias */}
                  <div className="bg-surface-container border border-outline-variant rounded-xl p-3">
                    <span className="block text-[8px] font-bold text-outline uppercase tracking-widest mb-1">
                      Victorias aquí
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[22px] font-black italic text-accent leading-none">
                        {canchaSeleccionada.victorias ?? 0}
                      </span>
                      <span className="text-[8px] font-bold text-outline">
                        — {canchaSeleccionada.derrotas ?? 0}D
                      </span>
                    </div>
                  </div>

                  {/* Deportes */}
                  <div className="bg-surface-container border border-outline-variant rounded-xl p-3">
                    <span className="block text-[8px] font-bold text-outline uppercase tracking-widest mb-2">
                      Deportes
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {canchaSeleccionada.deporte.length > 0 ? (
                        canchaSeleccionada.deporte.slice(0, 4).map((d) => {
                          const sport = DEPORTES.find(s => s.id === d);
                          return sport ? (
                            <span key={d} className="text-[16px] leading-none">{sport.emoji}</span>
                          ) : (
                            <span key={d} className="text-[8px] text-outline">{d}</span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-outline">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone */}
                {canchaSeleccionada.telefono_contacto && (
                  <a
                    href={`tel:${canchaSeleccionada.telefono_contacto.replace(/\s/g, '')}`}
                    className="flex items-center gap-1.5 mt-2.5 text-[10px] text-accent hover:underline"
                  >
                    📞 {canchaSeleccionada.telefono_contacto}
                  </a>
                )}
                {canchaSeleccionada.precio_hora && (
                  <div className="mt-1.5 text-[10px] text-on-surface-variant">
                    💰 ~${canchaSeleccionada.precio_hora.toLocaleString('es-CL')} /hr
                  </div>
                )}
              </div>

              {/* ── CTA BUTTONS ── */}
              <div className="px-5 py-4 flex flex-col gap-2">
                {canchaSeleccionada.estado === 'rival' && equipoId && canchaSeleccionada.equipoId ? (
                  <button
                    onClick={() => router.push(`/desafios?cancha=${canchaSeleccionada.id}&retado=${canchaSeleccionada.equipoId}`)}
                    className="w-full bg-status-rival text-white font-black italic uppercase py-4 rounded-xl text-[12px] tracking-widest flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(248,113,113,0.3)] hover:brightness-110 hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    <span>⚔️</span>
                    <span>Desafiar al Rey</span>
                  </button>
                ) : canchaSeleccionada.estado === 'libre' && equipoId ? (
                  <button
                    onClick={() => router.push(`/desafios?cancha=${canchaSeleccionada.id}`)}
                    className="w-full bg-accent text-on-accent font-black italic uppercase py-4 rounded-xl text-[12px] tracking-widest flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(255,224,131,0.3)] hover:brightness-110 hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    <span>⚡</span>
                    <span>Conquistar cancha</span>
                  </button>
                ) : canchaSeleccionada.estado === 'king' ? (
                  <div className="w-full py-3 rounded-xl text-[11px] text-accent font-black italic uppercase tracking-widest text-center bg-accent/10 border border-accent/30">
                    👑 Tu cancha — ¡Defiéndela!
                  </div>
                ) : null}

                <button
                  onClick={() => handleEditarCancha(canchaSeleccionada)}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2.5 text-[11px] text-outline hover:border-outline hover:text-on-surface-variant transition-colors font-medium"
                >
                  ✏️ Editar cancha
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── MOBILE: court list bottom sheet ── */}
        {mobileListOpen && (
          <>
            <div className="md:hidden fixed inset-0 z-[60] bg-black/50" onClick={() => setMobileListOpen(false)} />
            <div
              className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-surface border-t border-outline-variant rounded-t-xl flex flex-col"
              style={{ maxHeight: 'calc(75vh + env(safe-area-inset-bottom, 0px))' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant flex-shrink-0">
                <span className="text-[12px] font-medium text-on-surface">Canchas ({canchasFiltradas.length})</span>
                <button
                  onClick={() => setMobileListOpen(false)}
                  aria-label="Cerrar"
                  className="w-10 h-10 -mr-2 flex items-center justify-center text-outline hover:text-on-surface-variant text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 min-h-0">
                {canchasFiltradas.length === 0 ? (
                  <div className="text-[11px] text-outline text-center py-6">Sin resultados</div>
                ) : (
                  canchasFiltradas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setCanchaSeleccionada(c); setPanToCoords({ lat: c.lat, lng: c.lng }); setMobileListOpen(false); }}
                      className="flex items-start gap-2 w-full bg-transparent border border-transparent rounded-lg px-2 py-3 mb-0.5 transition-colors text-left hover:bg-surface-container-low min-h-[44px]"
                    >
                      <div className="w-2.5 h-2.5 rounded-full mt-[3px] flex-shrink-0" style={{ background: ESTADO_COLORS[c.estado] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-on-surface font-medium truncate">{c.nombre}</div>
                        <div className="text-[10px] text-outline mt-0.5 truncate">
                          {c.equipoNombre ? `${c.equipoNombre} · ${c.victorias ?? 0}-${c.derrotas ?? 0}` : c.direccion}
                        </div>
                      </div>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0"
                        style={{ background: `${ESTADO_COLORS[c.estado]}20`, color: ESTADO_COLORS[c.estado] }}
                      >
                        {ESTADO_LABELS[c.estado]}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div
                className="p-3 border-t border-outline-variant flex-shrink-0"
                style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
              >
                <button
                  onClick={handleAgregarCanchaClick}
                  className="w-full bg-transparent border border-dashed border-outline-variant rounded-lg p-3 text-[12px] text-outline flex items-center justify-center gap-1.5 hover:border-outline hover:text-on-surface-variant transition-colors min-h-[44px]"
                >
                  + Agregar cancha
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT PANEL (desktop only) ── */}
      <div className="hidden md:flex md:flex-col w-[210px] bg-surface border-l border-outline-variant p-3.5 overflow-y-auto flex-shrink-0">
        <div className="text-[10px] text-outline tracking-[0.1em] mb-2.5 font-medium uppercase flex-shrink-0">
          Canchas ({canchasFiltradas.length})
        </div>
        <div className="flex-1 overflow-y-auto">
          {canchasFiltradas.length === 0 ? (
            <div className="text-[11px] text-outline text-center py-6">Sin resultados</div>
          ) : (
            canchasFiltradas.map((c) => (
              <button
                key={c.id}
                onClick={() => setCanchaSeleccionada(c)}
                className={`flex items-start gap-2 w-full bg-transparent border rounded-lg px-2 py-2.5 cursor-pointer mb-0.5 transition-colors text-left ${
                  canchaSeleccionada?.id === c.id
                    ? 'bg-accent/10 border-accent/30'
                    : 'border-transparent hover:bg-surface-container-low'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full mt-[3px] flex-shrink-0" style={{ background: ESTADO_COLORS[c.estado] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-on-surface font-medium truncate">{c.nombre}</div>
                  <div className="text-[10px] text-outline mt-0.5 truncate">
                    {c.equipoNombre ? `${c.equipoNombre} · ${c.victorias ?? 0}-${c.derrotas ?? 0}` : c.direccion}
                  </div>
                </div>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0"
                  style={{ background: `${ESTADO_COLORS[c.estado]}20`, color: ESTADO_COLORS[c.estado] }}
                >
                  {ESTADO_LABELS[c.estado]}
                </span>
              </button>
            ))
          )}
        </div>
        <button
          onClick={handleAgregarCanchaClick}
          className="w-full bg-transparent border border-dashed border-outline-variant rounded-lg p-2.5 text-[12px] text-outline cursor-pointer flex items-center justify-center gap-1.5 mt-2.5 hover:border-outline hover:text-on-surface-variant transition-colors flex-shrink-0"
        >
          + Agregar cancha
        </button>
      </div>

      {/* Edit modal */}
      {canchaEditando && (showEditModal || modoEditarUbicacion) && (
        <div style={{ display: showEditModal ? undefined : 'none' }}>
          <EditarCanchaModal
            cancha={canchaEditando}
            coordsNuevas={coordsEditando}
            onClose={handleEditModalClose}
            onSuccess={handleEditSuccess}
            onNecesitaClickMapa={handleNecesitaClickMapaEditar}
          />
        </div>
      )}

      {/* Add modal */}
      {(showModal || modoAgregar) && (
        <div style={{ display: showModal ? undefined : 'none' }}>
          <AgregarCanchaModal
            coordsIniciales={coordsNuevaCancha ?? undefined}
            deportesIniciales={deporteInicial ? [deporteInicial] : undefined}
            onClose={handleModalClose}
            onSuccess={handleModalSuccess}
            onNecesitaClickMapa={handleNecesitaClickMapa}
          />
        </div>
      )}
    </div>
  );
}
