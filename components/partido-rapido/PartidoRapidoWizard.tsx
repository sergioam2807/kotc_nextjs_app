'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@heroui/react';
import { distanciaMetros } from '@/lib/geo';
import { SquadSlotPicker, SLOT_VACIO, slotsToSquad, type Slot } from './SquadSlotPicker';
import type { CanchaSimple, JugadorBusqueda, PartidoRapidoConDatos } from './types';

type Step = 'cancha' | 'equipo' | 'elegir-rival' | 'buscando' | 'pendiente' | 'encontrado' | 'confirmado' | 'resultado';

const POLL_MS = 4000;
const POLL_MAX_INTENTOS = 30; // ~2 minutos

function nombreJugador(j: { display_name: string | null; username: string | null } | null, fallback: string): string {
  return j?.display_name ?? j?.username ?? fallback;
}

interface Props {
  userId: string;
  userNombre: string;
  canchas: CanchaSimple[];
  partidoActivoId: string | null;
}

export function PartidoRapidoWizard({ userId, userNombre, canchas, partidoActivoId }: Props) {
  const [step, setStep] = useState<Step>('cancha');
  const [resumiendo, setResumiendo] = useState(!!partidoActivoId);

  // ── Paso cancha ──────────────────────────────────────────────────────────
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [canchaId, setCanchaId] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) { setGeoError(true); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError(true),
      { timeout: 8000 },
    );
  }, []);

  const canchasOrdenadas = useMemo(() => {
    if (!coords) return canchas;
    return [...canchas]
      .map(c => ({ ...c, _dist: distanciaMetros(coords.lat, coords.lng, c.lat, c.lng) }))
      .sort((a, b) => a._dist - b._dist);
  }, [canchas, coords]);

  const canchaSeleccionada = canchas.find(c => c.id === canchaId) ?? null;

  // ── Paso equipo ──────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<[Slot, Slot]>([SLOT_VACIO, SLOT_VACIO]);
  function setSlot(idx: number, slot: Slot) {
    setSlots(prev => (prev.map((s, i) => (i === idx ? slot : s)) as [Slot, Slot]));
  }

  // ── Paso elegir-rival ────────────────────────────────────────────────────
  const [lobby, setLobby] = useState<PartidoRapidoConDatos[]>([]);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [buscadorRivalAbierto, setBuscadorRivalAbierto] = useState(false);
  const [rivalBusqueda, setRivalBusqueda] = useState<{ q: string; resultados: JugadorBusqueda[] }>({ q: '', resultados: [] });
  const [rechazadoAviso, setRechazadoAviso] = useState(false);

  async function cargarLobby() {
    if (!canchaId) return;
    setLobbyLoading(true);
    try {
      const res = await fetch(`/api/partidos-rapidos?cancha_id=${canchaId}&mode=lobby`);
      const data = await res.json().catch(() => ({ lobby: [] }));
      setLobby(data.lobby ?? []);
    } catch {
      setLobby([]);
    } finally {
      setLobbyLoading(false);
    }
  }

  function irAElegirRival() {
    setStep('elegir-rival');
    setRechazadoAviso(false);
    cargarLobby();
  }

  useEffect(() => {
    if (buscadorRivalAbierto && rivalBusqueda.q.trim().length >= 2) {
      const t = setTimeout(async () => {
        try {
          const res = await fetch(`/api/jugadores/buscar?q=${encodeURIComponent(rivalBusqueda.q.trim())}`);
          const data = await res.json().catch(() => ({ jugadores: [] }));
          setRivalBusqueda(b => ({ ...b, resultados: data.jugadores ?? [] }));
        } catch {
          // silencioso
        }
      }, 300);
      return () => clearTimeout(t);
    }
    setRivalBusqueda(b => ({ ...b, resultados: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rivalBusqueda.q, buscadorRivalAbierto]);

  // ── Creación de partido + polling ────────────────────────────────────────
  const [partido, setPartido] = useState<PartidoRapidoConDatos | null>(null);
  const [rivalPendienteNombre, setRivalPendienteNombre] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentosRef = useRef(0);
  const [pollAgotado, setPollAgotado] = useState(false);

  function detenerPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function iniciarPolling(id: string) {
    detenerPolling();
    intentosRef.current = 0;
    setPollAgotado(false);
    pollRef.current = setInterval(async () => {
      intentosRef.current += 1;
      try {
        const res = await fetch(`/api/partidos-rapidos/${id}`);
        if (res.ok) {
          const { partido: actualizado } = await res.json();
          if (actualizado.estado === 'emparejado') {
            detenerPolling();
            setPartido(actualizado);
            setStep('encontrado');
            return;
          }
          if (actualizado.estado === 'rechazado') {
            detenerPolling();
            setPartido(null);
            setRechazadoAviso(true);
            setStep('elegir-rival');
            cargarLobby();
            return;
          }
        }
      } catch {
        // silencioso — reintenta en el próximo tick
      }
      if (intentosRef.current >= POLL_MAX_INTENTOS) {
        detenerPolling();
        setPollAgotado(true);
      }
    }, POLL_MS);
  }

  useEffect(() => () => detenerPolling(), []);

  // Resumir un partido activo existente (usuario volvió a la página)
  useEffect(() => {
    if (!partidoActivoId) return;
    (async () => {
      const res = await fetch(`/api/partidos-rapidos/${partidoActivoId}`);
      if (res.ok) {
        const { partido: p } = await res.json();
        setPartido(p);
        setCanchaId(p.cancha_id);
        if (p.estado === 'buscando') { setStep('buscando'); iniciarPolling(p.id); }
        else if (p.estado === 'pendiente') { setRivalPendienteNombre(p.capitan_b_nombre); setStep('pendiente'); iniciarPolling(p.id); }
        else if (p.estado === 'emparejado') setStep('encontrado');
        else setStep('confirmado');
      }
      setResumiendo(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidoActivoId]);

  async function crearPartido(opts: { rival_jugador_id?: string; join_partido_id?: string }) {
    if (!canchaId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/partidos-rapidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancha_id: canchaId, squad: slotsToSquad(slots), ...opts }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      setPartido(data.partido);
      if (data.partido.estado === 'pendiente') {
        setStep('pendiente');
        iniciarPolling(data.partido.id);
      } else if (data.partido.estado === 'emparejado') {
        setStep('encontrado');
      } else {
        setStep('buscando');
        iniciarPolling(data.partido.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  function retarRey() {
    if (!canchaSeleccionada?.king) return;
    setRivalPendienteNombre(canchaSeleccionada.king.nombre);
    crearPartido({ rival_jugador_id: canchaSeleccionada.king.jugadorId });
  }

  function retarJugador(j: JugadorBusqueda) {
    setRivalPendienteNombre(nombreJugador(j, 'Jugador'));
    crearPartido({ rival_jugador_id: j.id });
  }

  async function cancelarPartido() {
    if (!partido) return;
    detenerPolling();
    await fetch(`/api/partidos-rapidos/${partido.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'cancelar' }),
    }).catch(() => {});
    setPartido(null);
    setStep('elegir-rival');
    cargarLobby();
  }

  // ── Paso resultado ───────────────────────────────────────────────────────
  const [ladoGanador, setLadoGanador] = useState<'a' | 'b' | null>(null);
  const [resLoading, setResLoading] = useState(false);
  const [resError, setResError] = useState<string | null>(null);
  const [resEnviado, setResEnviado] = useState(false);

  async function enviarResultado() {
    if (!partido || !ladoGanador) return;
    setResLoading(true);
    setResError(null);
    try {
      const res = await fetch(`/api/partidos-rapidos/${partido.id}/resultado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ganador_lado: ladoGanador }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setResEnviado(true);
    } catch (err) {
      setResError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setResLoading(false);
    }
  }

  // ── Derivados de UI para el partido emparejado ──────────────────────────
  const miLado: 'a' | 'b' = partido?.capitan_a_id === userId ? 'a' : 'b';
  const rivalLado: 'a' | 'b' = miLado === 'a' ? 'b' : 'a';
  const jugadoresPropios = partido?.jugadores.filter(j => j.lado === miLado) ?? [];
  const jugadoresRivales = partido?.jugadores.filter(j => j.lado === rivalLado) ?? [];

  function nombreDeSlot(j: PartidoRapidoConDatos['jugadores'][number] | undefined): string {
    if (!j) return 'Jugador';
    return j.nombre_invitado ?? nombreJugador(j.perfil, 'Jugador');
  }

  const STEPS_PROGRESO: Step[] = ['cancha', 'equipo', 'elegir-rival', 'encontrado'];

  if (resumiendo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-on-surface-variant text-[13px]">
        Cargando partido rápido…
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      {/* Header con pasos */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard" className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0">
          ←
        </Link>
        <div className="text-[14px] font-bold text-on-surface">⚡ Partido Rápido 3v3</div>
        <div className="flex gap-1 ml-auto">
          {STEPS_PROGRESO.map(s => (
            <div
              key={s}
              className={`w-1.5 h-1.5 rounded-full ${
                s === step || STEPS_PROGRESO.indexOf(s) < STEPS_PROGRESO.indexOf(step)
                  ? 'bg-accent'
                  : 'bg-outline-variant'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Paso 1: cancha ─────────────────────────────────────────────── */}
      {step === 'cancha' && (
        <div>
          <h1 className="text-[18px] font-bold text-on-surface mb-1">¿Dónde están jugando?</h1>
          <p className="text-[12px] text-on-surface-variant mb-4">
            {geoError ? 'No pudimos ubicarte — elige tu cancha de la lista.' : 'Ordenamos las canchas por cercanía a ti.'}
          </p>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {canchasOrdenadas.map(c => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const dist = (c as any)._dist as number | undefined;
              const selected = c.id === canchaId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCanchaId(c.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                    selected ? 'border-accent bg-accent/8' : 'border-outline-variant bg-surface-container-low hover:border-outline'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-[16px] flex-shrink-0">📍</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-on-surface truncate">{c.nombre_recinto ?? c.nombre}</div>
                    <div className="text-[11px] text-on-surface-variant truncate flex items-center gap-1">
                      {c.es_publica === false ? '💰 De pago' : '🆓 Pública'}{c.superficie ? ` · ${c.superficie}` : ''}
                      {c.king && <span className="text-accent">· 👑 con Rey</span>}
                    </div>
                  </div>
                  {dist !== undefined && (
                    <div className="text-[11px] font-bold text-status-libre flex-shrink-0">
                      {dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`}
                    </div>
                  )}
                </button>
              );
            })}
            {canchasOrdenadas.length === 0 && (
              <div className="text-center py-8 text-[12px] text-on-surface-variant">
                No hay canchas verificadas todavía. <Link href="/mapa" className="text-accent hover:underline">Agrega una en el mapa →</Link>
              </div>
            )}
          </div>

          <Button variant="primary" fullWidth isDisabled={!canchaId} onPress={() => setStep('equipo')} className="mt-4">
            Continuar →
          </Button>
        </div>
      )}

      {/* ── Paso 2: equipo ─────────────────────────────────────────────── */}
      {step === 'equipo' && (
        <div>
          <h1 className="text-[18px] font-bold text-on-surface mb-1">Arma tu equipo al instante</h1>
          <p className="text-[12px] text-on-surface-variant mb-4">Suma a 2 jugadores que estén contigo ahora en la cancha (opcional).</p>

          {/* Capitán */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant bg-surface-container-low mb-2.5">
            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-[13px] flex-shrink-0">🧍</div>
            <div className="text-[13px] font-semibold text-on-surface">{userNombre} (Tú)</div>
            <div className="ml-auto text-[10px] font-bold text-accent">CAPITÁN</div>
          </div>

          <SquadSlotPicker slots={slots} onChange={setSlot} />

          <p className="text-[10px] text-outline mt-3 mb-4 leading-relaxed">
            ℹ️ Los invitados sin cuenta no acumulan XP. Pueden reclamar el partido después creando su perfil.
          </p>

          <Button variant="primary" fullWidth onPress={irAElegirRival}>
            Continuar →
          </Button>
        </div>
      )}

      {/* ── Paso 3: elegir rival ───────────────────────────────────────── */}
      {step === 'elegir-rival' && (
        <div>
          <h1 className="text-[18px] font-bold text-on-surface mb-1">Elegí a tu rival</h1>
          <p className="text-[12px] text-on-surface-variant mb-4">
            Retá directo a alguien (tiene que aceptar) o buscá rival automáticamente en {canchaSeleccionada?.nombre ?? 'la cancha'}.
          </p>

          {rechazadoAviso && (
            <div className="bg-error/10 border border-error/25 rounded-lg px-3 py-2 text-[11px] text-error mb-3">
              Tu reto anterior fue rechazado. Elegí otra opción.
            </div>
          )}

          <div className="space-y-2 mb-4">
            {canchaSeleccionada?.king && canchaSeleccionada.king.jugadorId !== userId && (
              <button
                type="button"
                onClick={retarRey}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-accent/40 bg-accent/8 text-left hover:bg-accent/12 transition-colors disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-[18px] flex-shrink-0">👑</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-on-surface">Retar al Rey de la cancha</div>
                  <div className="text-[11px] text-accent truncate">{canchaSeleccionada.king.nombre}</div>
                </div>
              </button>
            )}

            <div className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden">
              <button
                type="button"
                onClick={() => setBuscadorRivalAbierto(v => !v)}
                className="w-full flex items-center gap-3 p-3.5 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-[16px] flex-shrink-0">🔍</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-on-surface">Desafiar a un jugador</div>
                  <div className="text-[11px] text-on-surface-variant">Le llega el reto y tiene que aceptarlo</div>
                </div>
              </button>
              {buscadorRivalAbierto && (
                <div className="px-3.5 pb-3.5">
                  <Input
                    type="text"
                    aria-label="Buscar rival"
                    placeholder="Buscar jugador por nombre…"
                    value={rivalBusqueda.q}
                    onChange={e => setRivalBusqueda({ q: e.target.value, resultados: [] })}
                    fullWidth
                    autoFocus
                  />
                  {rivalBusqueda.resultados.length > 0 && (
                    <div className="mt-1 bg-surface-container border border-outline-variant rounded-lg overflow-hidden max-h-[160px] overflow-y-auto">
                      {rivalBusqueda.resultados.map(j => (
                        <button
                          key={j.id}
                          type="button"
                          disabled={loading}
                          onClick={() => retarJugador(j)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors text-left disabled:opacity-60"
                        >
                          {nombreJugador(j, 'Jugador')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {lobbyLoading && (
              <div className="text-center py-3 text-[11px] text-on-surface-variant">Buscando tríos activos…</div>
            )}
            {lobby.map(p => {
              const capitan = p.jugadores.find(j => j.es_capitan);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={loading}
                  onClick={() => crearPartido({ join_partido_id: p.id })}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-status-libre/30 bg-status-libre/8 text-left hover:bg-status-libre/12 transition-colors disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-lg bg-status-libre/15 text-status-libre flex items-center justify-center text-[16px] flex-shrink-0">🤝</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-on-surface">Trío de {nombreDeSlot(capitan)}</div>
                    <div className="text-[11px] text-status-libre">Buscando ahora en esta cancha — unite al toque</div>
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => crearPartido({})}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-outline-variant bg-surface-container-low text-left hover:border-outline transition-colors disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-[16px] flex-shrink-0">⏳</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-on-surface">Buscar rival automáticamente</div>
                <div className="text-[11px] text-on-surface-variant">Tu trío queda visible para otros que busquen acá</div>
              </div>
            </button>
          </div>

          {error && <div className="bg-error/15 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error">{error}</div>}
        </div>
      )}

      {/* ── Paso: pendiente (reto directo enviado) ──────────────────────── */}
      {step === 'pendiente' && (
        <div className="flex flex-col items-center text-center py-10">
          <div className="w-24 h-24 rounded-full border-2 border-outline-variant flex items-center justify-center text-[32px] mb-6">
            ⏳
          </div>
          <h3 className="text-[15px] font-bold text-on-surface mb-1">Esperando respuesta…</h3>
          <p className="text-[12px] text-on-surface-variant mb-6 max-w-xs">
            Le mandamos el reto a {rivalPendienteNombre ?? 'tu rival'}. Te avisamos apenas acepte o rechace.
          </p>

          {pollAgotado && (
            <div className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-[12px] text-on-surface-variant mb-4 max-w-xs">
              Todavía no responde.
              <button
                type="button"
                onClick={() => partido && iniciarPolling(partido.id)}
                className="block mt-2 text-accent font-semibold hover:underline"
              >
                Seguir esperando →
              </button>
            </div>
          )}

          <Button variant="outline" onPress={cancelarPartido}>Cancelar reto</Button>
        </div>
      )}

      {/* ── Paso: buscando (mutuo opt-in) ────────────────────────────────── */}
      {step === 'buscando' && (
        <div className="flex flex-col items-center text-center py-10">
          <div className="w-24 h-24 rounded-full border-2 border-outline-variant flex items-center justify-center text-[32px] mb-6 relative">
            <div className="absolute -inset-0.5 rounded-full border-2 border-accent border-t-transparent border-r-transparent animate-spin" />
            🏀
          </div>
          <h3 className="text-[15px] font-bold text-on-surface mb-1">Buscando rival cerca…</h3>
          <p className="text-[12px] text-on-surface-variant mb-6 max-w-xs">
            Tu trío queda visible para cualquiera que busque en {canchaSeleccionada?.nombre ?? 'la cancha'}.
          </p>

          {pollAgotado && (
            <div className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-[12px] text-on-surface-variant mb-4 max-w-xs">
              Nadie apareció todavía. Tu trío sigue visible — o volvé atrás y retá directo a alguien.
              <button
                type="button"
                onClick={() => partido && iniciarPolling(partido.id)}
                className="block mt-2 text-accent font-semibold hover:underline"
              >
                Seguir esperando →
              </button>
            </div>
          )}

          <Button variant="outline" onPress={cancelarPartido}>Cancelar búsqueda</Button>
        </div>
      )}

      {/* ── Paso: encontrado ─────────────────────────────────────────────── */}
      {step === 'encontrado' && partido && (
        <div className="text-center">
          <h1 className="text-[18px] font-bold text-on-surface mb-1">¡Rival encontrado!</h1>
          <p className="text-[12px] text-on-surface-variant mb-5">Confirma para iniciar el partido en {partido.cancha_nombre}.</p>

          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-status-libre/15 text-status-libre flex items-center justify-center text-[20px] mx-auto mb-1.5">
                🧍🧍🧍
              </div>
              <div className="text-[11px] font-bold text-on-surface">Tu trío</div>
              <div className="text-[10px] text-outline">{jugadoresPropios.map(j => nombreDeSlot(j)).join(', ')}</div>
            </div>
            <div className="text-[12px] font-black text-outline">VS</div>
            <div className="text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[20px] mx-auto mb-1.5 ${
                partido.es_vs_king ? 'bg-accent/15 text-accent' : 'bg-status-rival/15 text-status-rival'
              }`}>
                {partido.es_vs_king ? '👑' : '🧍🧍🧍'}
              </div>
              <div className="text-[11px] font-bold text-on-surface">
                {jugadoresRivales.length === 1 ? nombreDeSlot(jugadoresRivales[0]) : 'Trío rival'}
              </div>
              {partido.es_vs_king ? (
                <div className="text-[9px] font-bold text-accent">REY DE LA CANCHA</div>
              ) : (
                <div className="text-[10px] text-outline">{jugadoresRivales.map(j => nombreDeSlot(j)).join(', ')}</div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-left mb-5">
            <div className="flex justify-between text-[12px] mb-2">
              <span className="text-on-surface-variant">Cancha</span>
              <span className="font-semibold text-on-surface">{partido.cancha_nombre}</span>
            </div>
            <div className="flex justify-between text-[12px] mb-2">
              <span className="text-on-surface-variant">Formato</span>
              <span className="font-semibold text-on-surface">3v3</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-on-surface-variant">Recompensa</span>
              <span className="font-semibold text-status-libre">+100 XP c/u si ganas</span>
            </div>
          </div>

          <Button variant="primary" fullWidth onPress={() => setStep('confirmado')}>Confirmar partido</Button>
        </div>
      )}

      {/* ── Paso: confirmado ─────────────────────────────────────────────── */}
      {step === 'confirmado' && partido && (
        <div className="flex flex-col items-center text-center py-10">
          <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-[28px] mb-4">✅</div>
          <h1 className="text-[18px] font-bold text-on-surface mb-1">¡Partido creado!</h1>
          <p className="text-[12px] text-on-surface-variant mb-6 max-w-xs">
            Cuando terminen de jugar, carga el resultado para sumar XP y disputar la Corona.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            <Button variant="primary" onPress={() => setStep('resultado')}>📋 Cargar resultado ahora</Button>
            <Link href="/dashboard" className="text-[12px] text-on-surface-variant hover:text-on-surface hover:underline py-2">
              Volver al inicio
            </Link>
          </div>
        </div>
      )}

      {/* ── Paso: resultado ──────────────────────────────────────────────── */}
      {step === 'resultado' && partido && (
        <div>
          {resEnviado ? (
            <div className="flex flex-col items-center text-center py-10">
              <div className="text-[28px] mb-3">⏳</div>
              <h3 className="text-[15px] font-bold text-on-surface mb-1">Resultado enviado</h3>
              <p className="text-[12px] text-on-surface-variant mb-5 max-w-xs">
                Esperando que el rival confirme. Podrás revisarlo en Desafíos → Partidos rápidos.
              </p>
              <Link href="/desafios" className="text-[12px] text-accent hover:underline font-semibold">Ver en Desafíos →</Link>
            </div>
          ) : (
            <>
              <h1 className="text-[18px] font-bold text-on-surface mb-1">¿Quién ganó?</h1>
              <p className="text-[12px] text-on-surface-variant mb-4">Se necesita que el otro capitán confirme para otorgar XP.</p>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setLadoGanador(miLado)}
                  className={`flex-1 text-[12px] py-3 rounded-lg border font-semibold transition-colors ${
                    ladoGanador === miLado ? 'border-accent bg-accent/15 text-accent' : 'border-outline-variant text-on-surface-variant hover:border-outline'
                  }`}
                >
                  Ganamos nosotros
                </button>
                <button
                  type="button"
                  onClick={() => setLadoGanador(rivalLado)}
                  className={`flex-1 text-[12px] py-3 rounded-lg border font-semibold transition-colors ${
                    ladoGanador === rivalLado ? 'border-error bg-error/10 text-error' : 'border-outline-variant text-on-surface-variant hover:border-outline'
                  }`}
                >
                  Ganó el rival
                </button>
              </div>
              {resError && <div className="bg-error/15 border border-error/30 rounded-lg px-3 py-2 text-[11px] text-error mb-3">{resError}</div>}
              <Button variant="primary" fullWidth isDisabled={!ladoGanador || resLoading} onPress={enviarResultado}>
                {resLoading ? 'Enviando…' : 'Enviar resultado'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
