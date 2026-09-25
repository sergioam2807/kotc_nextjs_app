'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@heroui/react';
import { SoftButton } from '@/components/ui/SoftButton';
import { CountUp } from '@/components/ui/CountUp';
import { SquadSlotPicker, SLOT_VACIO, slotsToSquad, type Slot } from '@/components/partido-rapido/SquadSlotPicker';
import type { PartidoRapidoConDatos } from '@/components/partido-rapido/types';

function nombreDeSlot(j: PartidoRapidoConDatos['jugadores'][number] | undefined): string {
  if (!j) return 'Jugador';
  return j.nombre_invitado ?? j.perfil?.display_name ?? j.perfil?.username ?? 'Jugador';
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Reto pendiente',
  buscando: 'Buscando rival',
  emparejado: 'Emparejado',
  resultado_pendiente: 'Resultado pend.',
  completado: 'Completado',
  cancelado: 'Cancelado',
  rechazado: 'Rechazado',
};

const ESTADO_CLASS: Record<string, string> = {
  pendiente: 'bg-yellow-500/15 text-yellow-600',
  buscando: 'bg-primary/15 text-primary',
  emparejado: 'bg-primary/15 text-primary',
  resultado_pendiente: 'bg-orange-500/15 text-orange-500',
  completado: 'bg-status-libre/15 text-status-libre',
  cancelado: 'bg-surface-container text-outline',
  rechazado: 'bg-surface-container text-outline',
};

interface Resolucion {
  partidoId: string;
  gane: boolean;
  xp: number;
  king: boolean;
  canchaNombre: string | null;
}

interface Props {
  partidos: PartidoRapidoConDatos[];
  userId: string;
}

export function PartidosRapidosSection({ partidos: initial, userId }: Props) {
  const router = useRouter();
  const [partidos, setPartidos] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [resolucion, setResolucion] = useState<Resolucion | null>(null);
  const [error, setError] = useState<{ id: string; mensaje: string } | null>(null);
  const [aceptando, setAceptando] = useState<string | null>(null);
  const [aceptarSlots, setAceptarSlots] = useState<[Slot, Slot]>([SLOT_VACIO, SLOT_VACIO]);

  function refresh() {
    router.refresh();
  }

  async function proponer(partidoId: string, ladoGanador: 'a' | 'b') {
    setLoadingId(partidoId);
    setError(null);
    const res = await fetch(`/api/partidos-rapidos/${partidoId}/resultado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ganador_lado: ladoGanador }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError({ id: partidoId, mensaje: data.error ?? 'No se pudo enviar el resultado' });
      setLoadingId(null);
      return;
    }
    setPartidos(prev => prev.map(p => (
      p.id === partidoId
        ? { ...p, estado: 'resultado_pendiente', resultado: { id: '', ganador_lado: ladoGanador, puntos_a: null, puntos_b: null, propuesto_por: userId, confirmado_por_perdedor: false, disputado: false } }
        : p
    )));
    setLoadingId(null);
    refresh();
  }

  async function confirmar(partidoId: string) {
    setLoadingId(partidoId);
    setError(null);
    const res = await fetch(`/api/partidos-rapidos/${partidoId}/resultado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'confirmar' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError({ id: partidoId, mensaje: data.error ?? 'No se pudo confirmar' });
      setLoadingId(null);
      return;
    }
    const partido = partidos.find(p => p.id === partidoId);
    const miLado = partido?.capitan_a_id === userId ? 'a' : 'b';
    const gane = data.ganador_lado === miLado;
    setResolucion({
      partidoId,
      gane,
      xp: gane ? data.xp?.ganador ?? 0 : data.xp?.perdedor ?? 0,
      king: data.king_jugador_id === userId,
      canchaNombre: data.cancha_nombre ?? null,
    });
    setPartidos(prev => prev.map(p => (p.id === partidoId ? { ...p, estado: 'completado' } : p)));
    setLoadingId(null);
    refresh();
  }

  async function disputar(partidoId: string) {
    setLoadingId(partidoId);
    const res = await fetch(`/api/partidos-rapidos/${partidoId}/resultado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'disputar' }),
    });
    if (res.ok) {
      setPartidos(prev => prev.map(p => (p.id === partidoId && p.resultado ? { ...p, resultado: { ...p.resultado, disputado: true } } : p)));
      refresh();
    }
    setLoadingId(null);
  }

  async function cancelar(partidoId: string) {
    setLoadingId(partidoId);
    const res = await fetch(`/api/partidos-rapidos/${partidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'cancelar' }),
    });
    if (res.ok) {
      setPartidos(prev => prev.map(p => (p.id === partidoId ? { ...p, estado: 'cancelado' } : p)));
      refresh();
    }
    setLoadingId(null);
  }

  async function rechazar(partidoId: string) {
    setLoadingId(partidoId);
    const res = await fetch(`/api/partidos-rapidos/${partidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'rechazar' }),
    });
    if (res.ok) {
      setPartidos(prev => prev.map(p => (p.id === partidoId ? { ...p, estado: 'rechazado' } : p)));
      refresh();
    }
    setLoadingId(null);
  }

  async function aceptar(partidoId: string, slots: [Slot, Slot]) {
    setLoadingId(partidoId);
    setError(null);
    const res = await fetch(`/api/partidos-rapidos/${partidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'aceptar', squad: slotsToSquad(slots) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError({ id: partidoId, mensaje: data.error ?? 'No se pudo aceptar el reto' });
      setLoadingId(null);
      return;
    }
    setPartidos(prev => prev.map(p => (p.id === partidoId ? (data.partido ?? { ...p, estado: 'emparejado' }) : p)));
    setAceptando(null);
    setAceptarSlots([SLOT_VACIO, SLOT_VACIO]);
    setLoadingId(null);
    refresh();
  }

  // ── Groups ──────────────────────────────────────────────────────────────────
  const recibidos = partidos.filter(p => p.estado === 'pendiente' && p.capitan_b_id === userId);
  const enviados = partidos.filter(p => p.estado === 'pendiente' && p.capitan_a_id === userId);
  const activos = partidos.filter(p => ['buscando', 'emparejado'].includes(p.estado));
  const resultadoPendiente = partidos.filter(p => p.estado === 'resultado_pendiente');
  const historial = partidos.filter(p => ['completado', 'cancelado', 'rechazado'].includes(p.estado));

  function renderCard(p: PartidoRapidoConDatos) {
    const miLado: 'a' | 'b' = p.capitan_a_id === userId ? 'a' : 'b';
    const rivalLado: 'a' | 'b' = miLado === 'a' ? 'b' : 'a';
    const jugadoresPropios = p.jugadores.filter(j => j.lado === miLado);
    const jugadoresRivales = p.jugadores.filter(j => j.lado === rivalLado);
    const rivalNombre = miLado === 'a' ? (p.capitan_b_nombre ?? 'Rival') : p.capitan_a_nombre;
    const isBusy = loadingId === p.id;
    const recien = resolucion?.partidoId === p.id ? resolucion : null;

    return (
      <Card key={p.id} variant="secondary" className="border border-outline-variant rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center text-[16px] flex-shrink-0">
            {p.es_vs_king ? '👑' : '🏀'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-on-surface truncate">
              {p.estado === 'buscando' ? 'Buscando rival…' : `vs ${rivalNombre}`}
            </div>
            <div className="text-[11px] text-on-surface-variant truncate">
              🏀 3v3 · {p.cancha_nombre}
            </div>
          </div>
          <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${ESTADO_CLASS[p.estado]}`}>
            {ESTADO_LABEL[p.estado]}
          </div>
        </div>

        {jugadoresPropios.length > 0 && (
          <div className="text-[11px] text-on-surface-variant mb-3">
            Tu trío: {jugadoresPropios.map(j => nombreDeSlot(j)).join(', ')}
          </div>
        )}

        {p.estado === 'completado' && p.resultado && (
          <div className="bg-surface-container rounded-lg px-3 py-2 mb-3 flex flex-col gap-1.5">
            <div className={`flex items-center gap-2 text-[12px]${recien ? ' kotc-king-claim' : ''}`}>
              <span>{p.resultado.ganador_lado === miLado ? '🏆' : '😞'}</span>
              <span className="font-semibold">{p.resultado.ganador_lado === miLado ? 'Ganaste' : 'Perdiste'}</span>
              {(p.resultado.puntos_a !== null || p.resultado.puntos_b !== null) && (
                <span className="text-on-surface-variant ml-1">{p.resultado.puntos_a ?? '?'} – {p.resultado.puntos_b ?? '?'}</span>
              )}
            </div>
            {recien && (
              <div className="kotc-confirm-in text-[11px] text-outline" style={{ '--kotc-stagger': '180ms' } as React.CSSProperties}>
                <CountUp value={recien.xp} prefix="+" delayMs={180} className="text-on-surface font-semibold" /> XP
              </div>
            )}
            {recien?.king && recien.canchaNombre && (
              <div className="kotc-king-claim flex items-center gap-1.5 text-[11px] font-semibold text-accent" style={{ '--kotc-stagger': '420ms' } as React.CSSProperties}>
                <span>👑</span>
                <span>{recien.canchaNombre} es tuya en 3v3</span>
              </div>
            )}
          </div>
        )}

        {error?.id === p.id && (
          <div className="text-[10px] px-2 py-1 rounded-md mb-2 bg-error/15 text-error border border-error/25">{error.mensaje}</div>
        )}

        {/* Reto recibido: aceptar (solo o con compañeros) / rechazar */}
        {p.estado === 'pendiente' && p.capitan_b_id === userId && (
          aceptando === p.id ? (
            <div>
              <p className="text-[11px] text-on-surface-variant mb-2">Sumá compañeros (opcional):</p>
              <SquadSlotPicker
                slots={aceptarSlots}
                onChange={(idx, slot) => setAceptarSlots(prev => (prev.map((s, i) => (i === idx ? slot : s)) as [Slot, Slot]))}
              />
              <div className="flex gap-2 mt-1">
                <Button variant="primary" onPress={() => aceptar(p.id, aceptarSlots)} isDisabled={isBusy} className="flex-1">
                  {isBusy ? '…' : 'Confirmar equipo'}
                </Button>
                <Button variant="outline" onPress={() => setAceptando(null)} className="px-4">Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="primary" onPress={() => aceptar(p.id, [SLOT_VACIO, SLOT_VACIO])} isDisabled={isBusy} className="flex-1">
                {isBusy ? '…' : 'Aceptar'}
              </Button>
              <SoftButton color="neutral" onPress={() => { setAceptando(p.id); setAceptarSlots([SLOT_VACIO, SLOT_VACIO]); }} isDisabled={isBusy} className="px-3">
                + Compañeros
              </SoftButton>
              <SoftButton color="red" onPress={() => rechazar(p.id)} isDisabled={isBusy} className="px-3">
                {isBusy ? '…' : 'Rechazar'}
              </SoftButton>
            </div>
          )
        )}

        {/* Reto enviado: esperando respuesta / cancelar */}
        {p.estado === 'pendiente' && p.capitan_a_id === userId && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-surface-container rounded-lg px-3 py-2 text-[11px] text-on-surface-variant">
              ⏳ Esperando que {rivalNombre} responda...
            </div>
            <SoftButton color="red" onPress={() => cancelar(p.id)} isDisabled={isBusy} className="px-3">
              {isBusy ? '…' : 'Cancelar'}
            </SoftButton>
          </div>
        )}

        {/* Buscando: cancelar */}
        {p.estado === 'buscando' && p.capitan_a_id === userId && (
          <SoftButton color="red" onPress={() => cancelar(p.id)} isDisabled={isBusy} fullWidth>
            {isBusy ? '…' : 'Cancelar búsqueda'}
          </SoftButton>
        )}

        {/* Emparejado: cargar resultado */}
        {p.estado === 'emparejado' && (
          <div className="flex gap-2">
            <SoftButton color="green" onPress={() => proponer(p.id, miLado)} isDisabled={isBusy} className="flex-1">
              Ganamos nosotros
            </SoftButton>
            <SoftButton color="red" onPress={() => proponer(p.id, rivalLado)} isDisabled={isBusy} className="flex-1">
              Ganó el rival
            </SoftButton>
          </div>
        )}

        {/* Resultado pendiente: confirmar/disputar, o re-proponer si está disputado */}
        {p.estado === 'resultado_pendiente' && p.resultado && (
          p.resultado.disputado ? (
            <div>
              <div className="bg-error/10 border border-error/25 rounded-lg px-3 py-2 text-[11px] text-error mb-2">
                ⚠️ Resultado en disputa — cualquiera de los dos puede proponer uno nuevo.
              </div>
              <div className="flex gap-2">
                <SoftButton color="green" onPress={() => proponer(p.id, miLado)} isDisabled={isBusy} className="flex-1">
                  Ganamos nosotros
                </SoftButton>
                <SoftButton color="red" onPress={() => proponer(p.id, rivalLado)} isDisabled={isBusy} className="flex-1">
                  Ganó el rival
                </SoftButton>
              </div>
            </div>
          ) : p.resultado.propuesto_por === userId ? (
            <div className="bg-surface-container rounded-lg px-3 py-2 text-[11px] text-on-surface-variant">
              ⏳ Esperando que {rivalNombre} confirme el resultado...
            </div>
          ) : (
            <div className="flex gap-2">
              <SoftButton color="green" onPress={() => confirmar(p.id)} isDisabled={isBusy} className="flex-1">
                {isBusy ? '…' : '✓ Confirmar'}
              </SoftButton>
              <SoftButton color="neutral" onPress={() => disputar(p.id)} isDisabled={isBusy} className="flex-1">
                Disputar
              </SoftButton>
            </div>
          )
        )}
      </Card>
    );
  }

  const hayPartidos = partidos.length > 0;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">⚡</span>
          <div>
            <div className="text-[15px] font-bold text-on-surface">Partidos rápidos</div>
            <div className="text-[11px] text-outline">Pickup 3v3 · Basketball</div>
          </div>
        </div>
        <Link href="/partido-rapido">
          <Button variant="primary" className="whitespace-nowrap flex-shrink-0">
            <span className="sm:hidden">+ Rápido</span>
            <span className="hidden sm:inline">+ Partido rápido</span>
          </Button>
        </Link>
      </div>

      {!hayPartidos ? (
        <div className="text-center py-10 text-on-surface-variant">
          <div className="text-[28px] mb-3">⚡</div>
          <div className="text-[14px] font-semibold text-on-surface mb-1">Sin partidos rápidos aún</div>
          <p className="text-[12px] text-on-surface-variant max-w-xs mx-auto">
            Arma un trío al instante en cualquier cancha y desafía en minutos.
          </p>
          <Link href="/partido-rapido">
            <Button variant="primary" className="mt-4">Armar partido →</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {recibidos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-error text-white text-[9px] font-bold">{recibidos.length}</span>
                <span className="text-[11px] font-semibold text-on-surface uppercase tracking-[0.08em]">Retos recibidos</span>
              </div>
              <div className="space-y-2">{recibidos.map(renderCard)}</div>
            </div>
          )}
          {enviados.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-[0.08em] mb-2">Retos enviados</div>
              <div className="space-y-2">{enviados.map(renderCard)}</div>
            </div>
          )}
          {activos.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-[0.08em] mb-2">En curso</div>
              <div className="space-y-2">{activos.map(renderCard)}</div>
            </div>
          )}
          {resultadoPendiente.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-[0.08em] mb-2">Resultado pendiente</div>
              <div className="space-y-2">{resultadoPendiente.map(renderCard)}</div>
            </div>
          )}
          {historial.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-[0.08em] mb-2">Historial</div>
              <div className="space-y-2">{historial.map(renderCard)}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
