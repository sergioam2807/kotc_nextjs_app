'use client';

import type { CanchaConEstado } from './MapaClientWrapper';
import { agruparEnGrilla } from '@/lib/mapa/clustering';

/**
 * Capa Canvas para los pines de canchas.
 *
 * Por qué no `google.maps.Marker`: el import OSM trae cientos de canchas por
 * ciudad, y un marker legacy por cancha significa un elemento (y un listener)
 * por punto — el mapa titubea al hacer pan/zoom justo donde el producto tiene
 * que sentirse fluido. Acá todo se dibuja en un solo contexto 2D: el coste por
 * frame es proporcional a lo visible, no al total, y el clustering geométrico
 * hace que a nivel ciudad se lea densidad en vez de una mancha de pines.
 *
 * Los colores salen de las CSS variables del sistema (no hex duplicados en JS),
 * así el mapa sigue al tema sin sincronización manual.
 */

type Estado = 'libre' | 'king' | 'rival';

/** Centro del pin en píxeles del contenedor del mapa. */
export interface OrigenPin {
  x: number;
  y: number;
}

export interface OverlayHandlers {
  /**
   * `origen` es dónde estaba el pin en pantalla: sirve para que el panel de
   * detalle pueda salir de ahí en vez de aparecer de la nada.
   */
  onSelectCancha: (cancha: CanchaConEstado, origen: OrigenPin | null) => void;
  onHoverChange: (hovering: boolean) => void;
}

interface Punto {
  cancha: CanchaConEstado;
  estado: Estado;
  /** Coordenada mundial de Google (0–256), independiente de zoom y pan. */
  wx: number;
  wy: number;
}

interface ItemPin {
  kind: 'pin';
  key: string;
  x: number;
  y: number;
  punto: Punto;
}

interface ItemCluster {
  kind: 'cluster';
  key: string;
  x: number;
  y: number;
  total: number;
  counts: Record<Estado, number>;
  miembros: Punto[];
}

type Item = ItemPin | ItemCluster;

/** Lado de la celda de clustering, en píxeles de pantalla. */
const CELL = 64;
/** Margen del canvas para que un pin cuya ancla está al borde no se corte. */
const PAD = 72;
/** Geometría del pin (misma que el SVG que reemplaza: 40×50, ancla abajo). */
const PIN_R = 19;
const PIN_CY = 30;
const HIT_R = 24;
const ANIM_MS = 280;
const STAGGER_MS = 9;
const STAGGER_MAX = 24;

const ESTADOS: Estado[] = ['king', 'rival', 'libre'];

function iniciales(nombre: string | undefined): string {
  if (!nombre) return '?';
  return nombre.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export type Paleta = Record<string, string>;

export const PALETA_FALLBACK: Paleta = {
  king: '#d5ff40',
  libre: '#4ade80',
  rival: '#f87171',
  hueco: '#141414',
  texto: '#ffffff',
  borde: '#2a2a2a',
};

/**
 * Pin: aro del color del estado, hueco oscuro, iniciales del rey (o 🏀 si está
 * libre). Se dibuja centrado en el origen del contexto, con el ancla en (0,0).
 */
export function dibujarPin(
  ctx: CanvasRenderingContext2D,
  opts: { estado: Estado; equipoNombre?: string; selected?: boolean; colores: Paleta; fontStack: string },
) {
  const { estado, equipoNombre, selected, colores, fontStack } = opts;
  const color = colores[estado] ?? colores.libre;
  const alpha = ctx.globalAlpha;

  // Anillo, no disco: un relleno traslúcido sobre el mapa oscuro se ve como
  // una mancha sucia; el aro lee como foco.
  if (selected) {
    ctx.beginPath();
    ctx.arc(0, -PIN_CY, PIN_R + 6, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = alpha * 0.5;
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }

  ctx.beginPath();
  ctx.moveTo(-6, -13);
  ctx.lineTo(0, 0);
  ctx.lineTo(6, -13);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -PIN_CY, PIN_R, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -PIN_CY, PIN_R - 5, 0, Math.PI * 2);
  ctx.fillStyle = colores.hueco;
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (estado === 'libre') {
    ctx.font = `16px ${fontStack}`;
    ctx.fillText('🏀', 0, -PIN_CY + 1);
  } else {
    ctx.font = `700 12px ${fontStack}`;
    ctx.fillStyle = color;
    ctx.fillText(iniciales(equipoNombre), 0, -PIN_CY + 1);
  }
}

/**
 * Cluster: dona segmentada por estado — a nivel ciudad se lee de un vistazo
 * cuánto territorio está libre, cuánto es tuyo y cuánto es rival, sin abrir nada.
 */
export function dibujarCluster(
  ctx: CanvasRenderingContext2D,
  opts: { total: number; counts: Record<Estado, number>; colores: Paleta; fontStack: string },
) {
  const { total, counts, colores, fontStack } = opts;
  const r = total >= 50 ? 26 : total >= 10 ? 22 : 19;

  ctx.beginPath();
  ctx.arc(0, -PIN_CY, r, 0, Math.PI * 2);
  ctx.fillStyle = colores.hueco;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = colores.borde;
  ctx.stroke();

  let ang = -Math.PI / 2;
  const gap = 0.06;
  for (const estado of ESTADOS) {
    const n = counts[estado];
    if (!n) continue;
    const span = (n / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0, -PIN_CY, r - 2, ang + gap / 2, ang + span - gap / 2);
    ctx.strokeStyle = colores[estado];
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'butt';
    ctx.stroke();
    ang += span;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${total >= 100 ? 11 : 13}px ${fontStack}`;
  ctx.fillStyle = colores.texto;
  ctx.fillText(String(total), 0, -PIN_CY + 1);
}

/**
 * Define la clase al vuelo: `google.maps.OverlayView` solo existe después de
 * que cargó el SDK, así que no puede extenderse en el top level del módulo.
 */
export function crearCanchasOverlay(handlers: OverlayHandlers) {
  class CanchasOverlay extends google.maps.OverlayView {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private canchas: CanchaConEstado[] = [];
    private puntos: Punto[] = [];
    private items: Item[] = [];
    private selectedId: string | null = null;
    private hoverKey: string | null = null;
    private interactive = true;
    private listeners: google.maps.MapsEventListener[] = [];
    private rafId: number | null = null;
    private animStart = new Map<string, number>();
    private reducedMotion = false;
    private fontStack = 'system-ui, sans-serif';
    private colores: Paleta = PALETA_FALLBACK;

    // ── Ciclo de vida ────────────────────────────────────────────────────────

    onAdd() {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      // Sin pointer-events: los gestos del mapa (drag, pinch) siguen siendo del
      // mapa, y el hit-test se hace sobre los eventos del propio mapa.
      canvas.style.pointerEvents = 'none';
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.getPanes()?.overlayLayer.appendChild(canvas);

      this.leerTema();
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Poppins carga async: redibujar cuando esté lista, para no dejar las
      // iniciales pintadas con la tipografía de fallback.
      document.fonts?.ready
        .then(() => {
          this.leerTema();
          this.draw();
        })
        .catch(() => {});

      const map = this.getMap() as google.maps.Map | undefined;
      if (map) {
        this.listeners.push(
          map.addListener('click', (e: google.maps.MapMouseEvent) => this.handleClick(e)),
          map.addListener('mousemove', (e: google.maps.MapMouseEvent) => this.handleMove(e)),
        );
      }
    }

    onRemove() {
      this.listeners.forEach((l) => google.maps.event.removeListener(l));
      this.listeners = [];
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.canvas?.parentNode?.removeChild(this.canvas);
      this.canvas = null;
      this.ctx = null;
    }

    // ── API pública ──────────────────────────────────────────────────────────

    setCanchas(canchas: CanchaConEstado[]) {
      this.canchas = canchas;
      this.proyectarPuntos();
      this.draw();
    }

    setSelected(id: string | null) {
      if (this.selectedId === id) return;
      this.selectedId = id;
      // Reanima el pin elegido: el foco es un evento, no un estado decorativo.
      if (id) this.animStart.delete(`p:${id}`);
      this.draw();
    }

    setInteractive(interactive: boolean) {
      this.interactive = interactive;
      if (!interactive && this.hoverKey) {
        this.hoverKey = null;
        handlers.onHoverChange(false);
        this.draw();
      }
    }

    // ── Proyección ───────────────────────────────────────────────────────────

    /** Coordenadas mundiales: se calculan una vez por dataset, no por frame. */
    private proyectarPuntos() {
      const map = this.getMap() as google.maps.Map | undefined;
      const proj = map?.getProjection();
      if (!proj) {
        this.puntos = [];
        return;
      }
      this.puntos = this.canchas.map((cancha) => {
        const p = proj.fromLatLngToPoint(new google.maps.LatLng(cancha.lat, cancha.lng));
        return { cancha, estado: cancha.estado, wx: p?.x ?? 0, wy: p?.y ?? 0 };
      });
    }

    private leerTema() {
      const css = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
      this.colores = {
        king: v('--accent', '#d5ff40'),
        libre: v('--status-libre', '#4ade80'),
        rival: v('--status-rival', '#f87171'),
        hueco: v('--surface-container-low', '#141414'),
        texto: v('--on-surface', '#ffffff'),
        borde: v('--outline-variant', '#2a2a2a'),
      };
      const body = getComputedStyle(document.body).fontFamily;
      if (body) this.fontStack = body;
    }

    // ── Dibujo ───────────────────────────────────────────────────────────────

    draw() {
      const map = this.getMap() as google.maps.Map | undefined;
      const proj = this.getProjection();
      const canvas = this.canvas;
      const ctx = this.ctx;
      if (!map || !proj || !canvas || !ctx) return;

      const center = map.getCenter();
      const zoom = map.getZoom();
      if (!center || zoom == null) return;

      // La proyección del mapa puede no existir todavía en el primer setCanchas.
      if (this.puntos.length !== this.canchas.length) this.proyectarPuntos();

      const coreProj = map.getProjection();
      const centerDiv = proj.fromLatLngToDivPixel(center);
      if (!coreProj || !centerDiv) return;
      const centerWorld = coreProj.fromLatLngToPoint(center);
      if (!centerWorld) return;

      const div = map.getDiv() as HTMLElement;
      const w = div.offsetWidth;
      const h = div.offsetHeight;
      const scale = Math.pow(2, zoom);

      // Transformación mundo→canvas: lineal, un solo cálculo por frame.
      const offX = w / 2 - centerWorld.x * scale + PAD;
      const offY = h / 2 - centerWorld.y * scale + PAD;

      canvas.style.left = `${centerDiv.x - w / 2 - PAD}px`;
      canvas.style.top = `${centerDiv.y - h / 2 - PAD}px`;
      canvas.style.width = `${w + PAD * 2}px`;
      canvas.style.height = `${h + PAD * 2}px`;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round((w + PAD * 2) * dpr);
      const chh = Math.round((h + PAD * 2) * dpr);
      if (canvas.width !== cw || canvas.height !== chh) {
        canvas.width = cw;
        canvas.height = chh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w + PAD * 2, h + PAD * 2);

      this.items = this.agrupar(scale, offX, offY, w, h);
      this.pintar(ctx);
    }

    /** Traduce los grupos de la grilla a items dibujables (pin o cluster). */
    private agrupar(scale: number, offX: number, offY: number, w: number, h: number): Item[] {
      const grupos = agruparEnGrilla(this.puntos, {
        scale,
        offX,
        offY,
        ancho: w + PAD * 2,
        alto: h + PAD * 2,
        cell: CELL,
        margen: PAD,
      });

      const items: Item[] = grupos.map((g) => {
        if (g.miembros.length === 1) {
          const punto = g.miembros[0];
          return {
            kind: 'pin',
            key: `p:${punto.cancha.id}`,
            x: punto.wx * scale + offX,
            y: punto.wy * scale + offY,
            punto,
          } satisfies ItemPin;
        }
        return {
          kind: 'cluster',
          // El total entra en la clave: si el cluster cambia de tamaño al
          // filtrar, vuelve a animar en vez de mutar en silencio.
          key: `c:${g.key}:${g.miembros.length}`,
          x: g.x,
          y: g.y,
          total: g.miembros.length,
          counts: g.counts,
          miembros: g.miembros,
        } satisfies ItemCluster;
      });

      // El seleccionado se pinta último para quedar por encima de sus vecinos.
      items.sort((a, b) => {
        const sa = a.kind === 'pin' && a.punto.cancha.id === this.selectedId ? 1 : 0;
        const sb = b.kind === 'pin' && b.punto.cancha.id === this.selectedId ? 1 : 0;
        if (sa !== sb) return sa - sb;
        return a.y - b.y;
      });
      return items;
    }

    private pintar(ctx: CanvasRenderingContext2D) {
      const now = performance.now();
      const vistos = new Set<string>();
      let animando = false;

      this.items.forEach((item, i) => {
        vistos.add(item.key);
        let t = 1;
        if (!this.reducedMotion) {
          let start = this.animStart.get(item.key);
          if (start === undefined) {
            start = now + Math.min(i, STAGGER_MAX) * STAGGER_MS;
            this.animStart.set(item.key, start);
          }
          t = Math.max(0, Math.min(1, (now - start) / ANIM_MS));
          if (t < 1) animando = true;
        }
        const entrada = easeOut(t);
        if (entrada <= 0) return;

        const hover = this.hoverKey === item.key;
        const selected = item.kind === 'pin' && item.punto.cancha.id === this.selectedId;
        const escala = entrada * (selected ? 1.14 : hover ? 1.08 : 1);

        ctx.save();
        ctx.globalAlpha = entrada;
        ctx.translate(item.x, item.y + (hover ? -2 : 0));
        ctx.scale(escala, escala);
        if (item.kind === 'pin') {
          dibujarPin(ctx, {
            estado: item.punto.cancha.estado,
            equipoNombre: item.punto.cancha.equipoNombre,
            selected,
            colores: this.colores,
            fontStack: this.fontStack,
          });
        } else {
          dibujarCluster(ctx, {
            total: item.total,
            counts: item.counts,
            colores: this.colores,
            fontStack: this.fontStack,
          });
        }
        ctx.restore();
      });

      // Olvidar claves que ya no se dibujan: si reaparecen, vuelven a animar.
      this.animStart.forEach((_, key) => {
        if (!vistos.has(key)) this.animStart.delete(key);
      });

      if (animando && this.rafId === null) {
        this.rafId = requestAnimationFrame(() => {
          this.rafId = null;
          this.draw();
        });
      }
    }

    // ── Interacción ──────────────────────────────────────────────────────────

    private hitTest(e: google.maps.MapMouseEvent): Item | null {
      if (!this.interactive || !e.latLng) return null;
      const map = this.getMap() as google.maps.Map | undefined;
      const coreProj = map?.getProjection();
      const center = map?.getCenter();
      const zoom = map?.getZoom();
      if (!map || !coreProj || !center || zoom == null) return null;

      const centerWorld = coreProj.fromLatLngToPoint(center);
      const world = coreProj.fromLatLngToPoint(e.latLng);
      if (!centerWorld || !world) return null;

      const div = map.getDiv() as HTMLElement;
      const scale = Math.pow(2, zoom);
      const x = (world.x - centerWorld.x) * scale + div.offsetWidth / 2 + PAD;
      const y = (world.y - centerWorld.y) * scale + div.offsetHeight / 2 + PAD;

      // De arriba hacia abajo: el último pintado es el que se ve encima.
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        const dx = x - item.x;
        const dy = y - (item.y - PIN_CY);
        const r = item.kind === 'cluster' ? (item.total >= 50 ? 30 : 26) : HIT_R;
        if (dx * dx + dy * dy <= r * r) return item;
      }
      return null;
    }

    private handleClick(e: google.maps.MapMouseEvent) {
      const item = this.hitTest(e);
      if (!item) return;
      if (item.kind === 'pin') {
        // El canvas está desplazado PAD px respecto del contenedor, y el pin se
        // dibuja PIN_CY arriba de su ancla.
        handlers.onSelectCancha(item.punto.cancha, {
          x: item.x - PAD,
          y: item.y - PIN_CY - PAD,
        });
        return;
      }
      // Cluster: encuadra a sus miembros en vez de saltar un zoom arbitrario.
      const map = this.getMap() as google.maps.Map;
      const bounds = new google.maps.LatLngBounds();
      item.miembros.forEach((m) => bounds.extend({ lat: m.cancha.lat, lng: m.cancha.lng }));
      if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
        map.panTo(bounds.getCenter());
        map.setZoom(Math.min((map.getZoom() ?? 13) + 3, 19));
      } else {
        map.fitBounds(bounds, 90);
      }
    }

    private handleMove(e: google.maps.MapMouseEvent) {
      const item = this.hitTest(e);
      const key = item?.key ?? null;
      if (key === this.hoverKey) return;
      this.hoverKey = key;
      handlers.onHoverChange(key !== null);
      this.draw();
    }
  }

  return new CanchasOverlay();
}

export type CanchasOverlayInstance = ReturnType<typeof crearCanchasOverlay>;
