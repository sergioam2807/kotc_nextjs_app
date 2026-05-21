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
}

interface Props {
  canchas: CanchaConEstado[];
  equipoId: string | null;
  stats: { misKing: number; partidos: number; total: number };
}

type Filtro = 'todas' | 'king' | 'libre' | 'rival';

const ESTADO_COLORS = {
  king: '#F5C344',
  libre: '#5a9e5a',
  rival: '#E24B4A',
};

const ESTADO_LABELS = {
  king: 'KING',
  libre: 'LIBRE',
  rival: 'RIVAL',
};

const DEPORTES = [
  { id: 'basketball', emoji: '🏀', label: 'Basketball' },
  { id: 'futbol', emoji: '⚽', label: 'Fútbol' },
  { id: 'voleibol', emoji: '🏐', label: 'Vóleibol' },
];

export function MapaClientWrapper({ canchas, equipoId, stats }: Props) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [deporteFiltro, setDeporteFiltro] = useState<string>('todas');
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
    { id: 'todas', label: 'Todas', color: '#888', count: conteos.todas },
    { id: 'king', label: 'King', color: '#F5C344', count: conteos.king },
    { id: 'libre', label: 'Libres', color: '#5a9e5a', count: conteos.libre },
    { id: 'rival', label: 'Rivales', color: '#E24B4A', count: conteos.rival },
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
      <div className="hidden md:flex md:flex-col w-[200px] bg-[#0a0a0c] border-r border-[#1a1a1f] flex-shrink-0">
        <div className="p-3.5 border-b border-[#1a1a1f]">
          <div className="text-[10px] text-[#444] tracking-[0.1em] mb-2.5 font-medium uppercase">
            Filtrar por estado
          </div>
          {filtroItems.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex items-center gap-2 w-full bg-transparent border-none px-2 py-1.5 rounded-[7px] cursor-pointer mb-0.5 transition-colors ${
                filtro === f.id ? 'bg-[#18180f]' : 'hover:bg-[#111114]'
              }`}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
              <span className={`text-[12px] flex-1 text-left ${filtro === f.id ? 'text-[#ddd]' : 'text-[#666]'}`}>
                {f.label}
              </span>
              <span className="text-[10px] text-[#444] bg-[#1e1e24] rounded-[4px] px-1.5">{f.count}</span>
            </button>
          ))}
        </div>

        <div className="p-3.5 border-b border-[#1a1a1f]">
          <div className="text-[10px] text-[#444] tracking-[0.1em] mb-2.5 font-medium uppercase">Deporte</div>
          <button
            onClick={() => setDeporteFiltro('todas')}
            className={`flex items-center gap-1.5 w-full bg-transparent border-none px-2 py-1.5 rounded-[7px] cursor-pointer mb-0.5 transition-colors ${
              deporteFiltro === 'todas' ? 'bg-[#18180f]' : 'hover:bg-[#111114]'
            }`}
          >
            <span className="text-[14px]">🏟️</span>
            <span className={`text-[12px] ${deporteFiltro === 'todas' ? 'text-[#ddd]' : 'text-[#555]'}`}>Todos</span>
          </button>
          {DEPORTES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDeporteFiltro(d.id)}
              className={`flex items-center gap-1.5 w-full bg-transparent border-none px-2 py-1.5 rounded-[7px] cursor-pointer mb-0.5 transition-colors ${
                deporteFiltro === d.id ? 'bg-[#18180f]' : 'hover:bg-[#111114]'
              }`}
            >
              <span className="text-[14px]">{d.emoji}</span>
              <span className={`text-[12px] ${deporteFiltro === d.id ? 'text-[#ddd]' : 'text-[#555]'}`}>{d.label}</span>
            </button>
          ))}
        </div>

        <div className="p-3.5 flex-1">
          <div className="text-[10px] text-[#444] tracking-[0.1em] mb-2 font-medium uppercase">Mis stats</div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-[#444]">Mis canchas</span>
            <span className="text-[12px] font-medium text-[#F5C344]">{stats.misKing}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-[#444]">Partidos jugados</span>
            <span className="text-[12px] font-medium text-[#ddd]">{stats.partidos}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-[#444]">Total canchas</span>
            <span className="text-[12px] font-medium text-[#ddd]">{stats.total}</span>
          </div>
        </div>
      </div>

      {/* ── MAP AREA ── */}
      <div className="flex-1 relative bg-[#0d0e10] overflow-hidden">

        {/* Search bar overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-2 items-start pointer-events-none">
          <div className="relative flex-1 pointer-events-auto">
            <div className="bg-[#0f0f12] border border-[#2a2a2a] rounded-[8px] px-3 py-2 flex items-center gap-2">
              <span className="text-[#444]">🔍</span>
              <input
                className="bg-transparent border-none text-[12px] text-[#888] outline-none flex-1 min-w-0"
                placeholder="Buscar cancha..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="text-[#444] hover:text-[#888] text-[14px] leading-none">
                  ×
                </button>
              )}
            </div>

            {busqueda.trim() && canchasFiltradas.length > 1 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-[#0f0f12] border border-[#2a2a2a] rounded-[8px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
                {canchasFiltradas.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectFromDropdown(c)}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-[#18181f] transition-colors border-b border-[#1a1a1f] last:border-0"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ESTADO_COLORS[c.estado] }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#ccc] font-medium truncate">{c.nombre}</div>
                      <div className="text-[10px] text-[#555] truncate">{c.direccion}</div>
                    </div>
                  </button>
                ))}
                {canchasFiltradas.length > 8 && (
                  <div className="px-3 py-2 text-[10px] text-[#444] text-center">
                    +{canchasFiltradas.length - 8} más — refiná la búsqueda
                  </div>
                )}
              </div>
            )}
          </div>

          {(modoAgregar || modoEditarUbicacion) && (
            <div className="bg-[#F5C34420] border border-[#F5C34460] rounded-[8px] px-3 py-2 pointer-events-auto">
              <span className="text-[11px] text-[#F5C344]">
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
                    ? 'bg-[#0f0f12] border-[#3a3a3a] text-[#ddd]'
                    : 'bg-[#0f0f12bb] border-[#2a2a2a] text-[#555]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.color }} />
                {f.label}
              </button>
            ))}
            <div className="w-px self-stretch bg-[#2a2a2a] mx-0.5 shrink-0" />
            {DEPORTES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDeporteFiltro(deporteFiltro === d.id ? 'todas' : d.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold border transition-colors ${
                  deporteFiltro === d.id
                    ? 'bg-[#0f0f12] border-[#3a3a3a] text-[#ddd]'
                    : 'bg-[#0f0f12bb] border-[#2a2a2a] text-[#555]'
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
        <div className="hidden md:block absolute bottom-3 left-3 bg-[#0f0f12cc] border border-[#1e1e24] rounded-[8px] px-3 py-2.5 z-10">
          {[
            { color: '#F5C344', label: 'Mis canchas (King)' },
            { color: '#5a9e5a', label: 'Libre para conquistar' },
            { color: '#E24B4A', label: 'Cancha rival' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 mb-1.5 last:mb-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
              <span className="text-[11px] text-[#666]">{l.label}</span>
            </div>
          ))}
        </div>

        {/* ── MOBILE: list toggle button ── */}
        {!canchaSeleccionada && !modoAgregar && !modoEditarUbicacion && (
          <button
            onClick={() => setMobileListOpen(true)}
            className="md:hidden absolute bottom-4 left-3 z-20 bg-[#0f0f12] border border-[#2a2a2a] rounded-full px-3.5 py-2 text-[11px] text-[#888] flex items-center gap-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
          >
            <span className="w-2 h-2 rounded-full bg-[#888]" />
            {canchasFiltradas.length} canchas
          </button>
        )}

        {/* ── MOBILE: FAB add court ── */}
        {!canchaSeleccionada && !modoAgregar && !modoEditarUbicacion && (
          <button
            onClick={handleAgregarCanchaClick}
            className="md:hidden absolute bottom-4 right-3 z-20 w-11 h-11 bg-[#F5C344] text-[#080809] rounded-full text-xl font-bold flex items-center justify-center shadow-[0_4px_16px_rgba(245,195,68,0.4)]"
          >
            +
          </button>
        )}

        {/* ── Selected court panel — full width on mobile, fixed width on desktop ── */}
        {canchaSeleccionada && (
          <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-[220px] z-20 bg-[#0f0f12] border border-[#2a2a2a] rounded-[12px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between mb-2">
              <div
                className="text-[9px] px-1.5 py-0.5 rounded-[3px] font-medium"
                style={{
                  background: `${ESTADO_COLORS[canchaSeleccionada.estado]}20`,
                  color: ESTADO_COLORS[canchaSeleccionada.estado],
                }}
              >
                {ESTADO_LABELS[canchaSeleccionada.estado]}
              </div>
              <button
                onClick={() => setCanchaSeleccionada(null)}
                className="text-[#444] hover:text-[#888] text-[16px] leading-none -mt-0.5"
              >
                ×
              </button>
            </div>
            <div className="text-[13px] font-medium text-[#ddd] mb-1">{canchaSeleccionada.nombre}</div>
            <div className="text-[11px] text-[#555] mb-2">{canchaSeleccionada.direccion}</div>
            {canchaSeleccionada.equipoNombre && (
              <div className="text-[11px] mb-1" style={{ color: canchaSeleccionada.equipoColor ?? '#888' }}>
                {canchaSeleccionada.equipoNombre}
              </div>
            )}
            {(canchaSeleccionada.victorias !== undefined || canchaSeleccionada.derrotas !== undefined) && (
              <div className="text-[10px] text-[#444]">
                {canchaSeleccionada.victorias ?? 0}V - {canchaSeleccionada.derrotas ?? 0}D
              </div>
            )}
            {canchaSeleccionada.deporte.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {canchaSeleccionada.deporte.map((d) => (
                  <span key={d} className="text-[9px] px-1.5 py-0.5 rounded-[3px] bg-[#1e1e24] text-[#555]">{d}</span>
                ))}
              </div>
            )}
            {canchaSeleccionada.estado === 'rival' && equipoId && canchaSeleccionada.equipoId && (
              <button
                onClick={() => router.push(`/desafios?cancha=${canchaSeleccionada.id}&retado=${canchaSeleccionada.equipoId}`)}
                className="w-full mt-3 bg-[#E24B4A15] border border-[#E24B4A40] rounded-[7px] py-1.5 text-[11px] text-[#E24B4A] hover:bg-[#E24B4A25] hover:border-[#E24B4A70] transition-colors font-medium"
              >
                ⚔️ Desafiar
              </button>
            )}
            <button
              onClick={() => handleEditarCancha(canchaSeleccionada)}
              className="w-full mt-2 bg-transparent border border-[#2a2a2a] rounded-[7px] py-1.5 text-[11px] text-[#555] hover:border-[#444] hover:text-[#888] transition-colors"
            >
              Editar cancha
            </button>
          </div>
        )}

        {/* ── MOBILE: court list bottom sheet ── */}
        {mobileListOpen && (
          <>
            <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileListOpen(false)} />
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0c] border-t border-[#1a1a1f] rounded-t-[16px] max-h-[60vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1f]">
                <span className="text-[12px] font-medium text-[#ddd]">Canchas ({canchasFiltradas.length})</span>
                <button onClick={() => setMobileListOpen(false)} className="text-[#444] hover:text-[#888] text-xl leading-none">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {canchasFiltradas.length === 0 ? (
                  <div className="text-[11px] text-[#444] text-center py-6">Sin resultados</div>
                ) : (
                  canchasFiltradas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setCanchaSeleccionada(c); setPanToCoords({ lat: c.lat, lng: c.lng }); setMobileListOpen(false); }}
                      className="flex items-start gap-2 w-full bg-transparent border border-transparent rounded-[8px] px-2 py-2.5 mb-0.5 transition-colors text-left hover:bg-[#111114]"
                    >
                      <div className="w-2.5 h-2.5 rounded-full mt-[3px] flex-shrink-0" style={{ background: ESTADO_COLORS[c.estado] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-[#ccc] font-medium truncate">{c.nombre}</div>
                        <div className="text-[10px] text-[#444] mt-0.5 truncate">
                          {c.equipoNombre ? `${c.equipoNombre} · ${c.victorias ?? 0}-${c.derrotas ?? 0}` : c.direccion}
                        </div>
                      </div>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-[3px] font-medium flex-shrink-0"
                        style={{ background: `${ESTADO_COLORS[c.estado]}20`, color: ESTADO_COLORS[c.estado] }}
                      >
                        {ESTADO_LABELS[c.estado]}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-[#1a1a1f]">
                <button
                  onClick={handleAgregarCanchaClick}
                  className="w-full bg-transparent border border-dashed border-[#2a2a2a] rounded-[8px] p-2.5 text-[12px] text-[#444] flex items-center justify-center gap-1.5 hover:border-[#444] hover:text-[#666] transition-colors"
                >
                  + Agregar cancha
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT PANEL (desktop only) ── */}
      <div className="hidden md:flex md:flex-col w-[210px] bg-[#0a0a0c] border-l border-[#1a1a1f] p-3.5 overflow-y-auto flex-shrink-0">
        <div className="text-[10px] text-[#444] tracking-[0.1em] mb-2.5 font-medium uppercase flex-shrink-0">
          Canchas ({canchasFiltradas.length})
        </div>
        <div className="flex-1 overflow-y-auto">
          {canchasFiltradas.length === 0 ? (
            <div className="text-[11px] text-[#444] text-center py-6">Sin resultados</div>
          ) : (
            canchasFiltradas.map((c) => (
              <button
                key={c.id}
                onClick={() => setCanchaSeleccionada(c)}
                className={`flex items-start gap-2 w-full bg-transparent border rounded-[8px] px-2 py-2.5 cursor-pointer mb-0.5 transition-colors text-left ${
                  canchaSeleccionada?.id === c.id
                    ? 'bg-[#18180f] border-[#F5C34430]'
                    : 'border-transparent hover:bg-[#111114]'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full mt-[3px] flex-shrink-0" style={{ background: ESTADO_COLORS[c.estado] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[#ccc] font-medium truncate">{c.nombre}</div>
                  <div className="text-[10px] text-[#444] mt-0.5 truncate">
                    {c.equipoNombre ? `${c.equipoNombre} · ${c.victorias ?? 0}-${c.derrotas ?? 0}` : c.direccion}
                  </div>
                </div>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-[3px] font-medium flex-shrink-0"
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
          className="w-full bg-transparent border border-dashed border-[#2a2a2a] rounded-[8px] p-2.5 text-[12px] text-[#444] cursor-pointer flex items-center justify-center gap-1.5 mt-2.5 hover:border-[#444] hover:text-[#666] transition-colors flex-shrink-0"
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
            onClose={handleModalClose}
            onSuccess={handleModalSuccess}
            onNecesitaClickMapa={handleNecesitaClickMapa}
          />
        </div>
      )}
    </div>
  );
}
