@AGENTS.md

# KOTC — King of the Court

App de desafíos territoriales de canchas deportivas (basketball, fútbol, vóleibol, tenis, pádel). Los equipos desafían canchas para convertirse en "King" de ese espacio.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 App Router (server components por defecto) |
| DB / Auth | Supabase (PostgreSQL + Auth con Google OAuth) |
| Estilos | Tailwind CSS 4 + `@theme inline` con CSS variables |
| Fuente | Lexend via `next/font/google` |
| Maps | Google Maps JS API |
| Package manager | **pnpm** |

---

## Ramas de desarrollo

| Rama | Base | Estado | Migraciones |
|------|------|--------|-------------|
| `main` | — | producción | 001–021 |
| `feature/ligas` | main | pendiente merge | 022 |
| `feature/canchas-info` | main | pendiente merge | 023 |

**Orden de merge recomendado:**
```bash
git checkout main
git merge feature/canchas-info   # supabase/migrations/023_canchas_info.sql
git merge feature/ligas           # supabase/migrations/022_ligas.sql
supabase db push                  # aplica ambas migraciones
```

---

## Rutas de la app

```
app/
  page.tsx                          ← Landing pública
  (app)/
    dashboard/page.tsx              ← Home: player banner, deportes, canchas, desafíos, card ligas
    mapa/page.tsx                   ← Mapa de canchas con Google Maps
    desafios/page.tsx               ← Gestión de desafíos del equipo
    equipo/page.tsx                 ← Perfil del equipo + roster (admins: solicitudes badge + buscar jugadores)
    equipo/invitaciones/            ← Gestión de invitaciones
    equipo/solicitudes/             ← Solicitudes de ingreso (solo admin/capitán)
    ranking/page.tsx                ← Ranking territorial (equipos + jugadores)
    perfil/page.tsx                 ← Editar perfil de jugador (bio, posición, especialidades, datos físicos, reclutamiento)
    jugadores/page.tsx              ← Lista de jugadores disponibles para reclutamiento (sin equipo)
    jugadores/[id]/page.tsx         ← Perfil público de jugador
    equipos/[id]/page.tsx           ← Perfil público de equipo (canchas, stats, roster, botón "Solicitar unirme")
    planes/page.tsx                 ← Página pública de planes: Gratuito vs Organizador, precios, FAQ, CTA WhatsApp [feature/ligas]
    ligas/page.tsx                  ← Lista de ligas; "Crear liga" si tiene suscripción; "Ver planes →" si no [feature/ligas]
    ligas/nueva/page.tsx            ← Formulario crear liga (requiere suscripción activa) [feature/ligas]
    ligas/[id]/page.tsx             ← Vista pública: hero, tabla/grupos/bracket, próximos, recientes, equipos [feature/ligas]
    ligas/[id]/admin/page.tsx       ← Panel admin: estado, stats, generar calendario, resultados, equipos [feature/ligas]
    ligas/[id]/admin/partidos/      ← Carga de resultados agrupada por fase/grupo/ronda [feature/ligas]
  auth/callback/route.ts            ← OAuth callback
  api/
    equipos/route.ts                ← POST crear equipo
    canchas/route.ts                ← GET list / POST crear cancha (acepta nuevos campos de recinto)
    canchas/[id]/route.ts           ← GET detalle / PATCH editar cancha (acepta nuevos campos de recinto)
    desafios/route.ts               ← POST crear desafío
    desafios/[id]/route.ts          ← PATCH aceptar/rechazar
    resultados/route.ts             ← POST proponer / PATCH confirmar|disputar
    equipo/miembros/route.ts        ← PATCH cambiar posición titular/suplente (admin); DELETE salir/expulsar
    equipo/disolver/route.ts        ← DELETE disolver equipo (admin), FK-safe
    invitaciones/route.ts           ← POST crear / GET aceptar invitación
    perfil/route.ts                 ← PATCH actualizar perfil propio
    solicitudes/route.ts            ← POST crear / GET listar solicitudes de equipo
    solicitudes/[id]/route.ts       ← PATCH aceptar/rechazar/cancelar; DELETE cancelar
    ligas/route.ts                  ← GET listar ligas / POST crear liga (requiere suscripción) [feature/ligas]
    ligas/[id]/route.ts             ← GET detalle / PATCH estado / DELETE eliminar [feature/ligas]
    ligas/[id]/equipos/route.ts     ← GET listar / POST invitar o inscribir equipo [feature/ligas]
    ligas/[id]/equipos/[equipoId]/route.ts ← PATCH estado/grupo/seed; DELETE retirar [feature/ligas]
    ligas/[id]/generar/route.ts     ← POST generar calendario (todos los formatos) [feature/ligas]
    ligas/[id]/partidos/route.ts    ← GET listar partidos (?fase&grupo&ronda&estado) [feature/ligas]
    ligas/[id]/partidos/[partidoId]/route.ts ← PATCH cargar resultado [feature/ligas]
    ligas/[id]/tabla/route.ts       ← GET standings computados [feature/ligas]
```

---

## Schema de base de datos (resumen)

```sql
-- Core (main)
profiles          (id→auth.users, username, display_name, avatar_url, ciudad, nivel, xp,
                   bio, posicion_principal, posiciones_adicionales text[], especialidades text[],
                   altura_cm, peso_kg, mano_habil, anos_experiencia, disponible_reclutamiento)
temporadas        (id, nombre, deporte, inicio, fin, activa)
equipos           (id, nombre, deporte, modalidad, ciudad, color, nivel, xp, creador_id, temporada_id nullable)
equipo_miembros   (id, equipo_id, jugador_id→profiles, rol, posicion, temporada_id nullable, deporte)
canchas           (id, nombre, direccion, lat, lng, fotos, deporte[], agregada_por,
                   -- Campos de recinto (migración 023, feature/canchas-info):
                   es_publica      bool  NOT NULL DEFAULT true,   -- pública/gratuita vs de pago
                   precio_hora     int   NULL,                    -- CLP por hora (solo si es de pago)
                   telefono_contacto text NULL,                   -- contacto para reservas
                   nombre_recinto  text  NULL)                    -- nombre del complejo/recinto
cancha_dominio    (id, cancha_id, equipo_id, victorias, derrotas, es_king, temporada_id nullable)
desafios          (id, equipo_retador_id, equipo_retado_id, cancha_id, deporte, formato,
                   fecha, mensaje, estado)
resultados        (id, desafio_id, ganador_id, propuesto_por→equipos,
                   puntos_retador nullable, puntos_retado nullable,
                   confirmado_por_perdedor, disputado, confirmado_at)
invitaciones      (id, equipo_id, token, email, metodo, estado, expira_at)
solicitudes_equipo (id, equipo_id, jugador_id→auth.users, mensaje,
                    estado [pendiente|aceptada|rechazada|cancelada], created_at, updated_at)
historial_equipos  (id, jugador_id→auth.users, equipo_id nullable→equipos,
                    equipo_nombre, equipo_color, deporte, ciudad, rol, posicion,
                    fecha_ingreso, fecha_salida nullable)

-- Ligas (migración 022, feature/ligas)
suscripciones     (id, user_id→auth.users, plan, estado [activa|cancelada|expirada],
                   fecha_inicio, fecha_fin)
ligas             (id, organizador_id→auth.users, nombre, descripcion, deporte, modalidad,
                   formato CHECK('round_robin','eliminacion_directa','grupos_playoffs'),
                   estado CHECK('borrador','inscripciones','en_curso','finalizada','cancelada'),
                   max_equipos, num_grupos, equipos_clasifican, inscripcion_publica,
                   puntos_victoria, puntos_empate, puntos_derrota, fecha_inicio, fecha_fin)
liga_equipos      (id, liga_id→ligas, equipo_id→equipos,
                   estado CHECK('invitado','aceptado','rechazado','retirado'),
                   grupo, seed, UNIQUE(liga_id, equipo_id))
liga_partidos     (id, liga_id→ligas,
                   equipo_local_id→equipos nullable, equipo_visitante_id→equipos nullable,
                   fase, grupo, ronda,
                   estado CHECK('pendiente','completado','cancelado'),
                   fecha, cancha_id, puntos_local, puntos_visitante, ganador_id→equipos nullable)
```

**Triggers automáticos en `equipo_miembros`:**
- `trg_equipo_miembro_insert` → INSERT en `historial_equipos` (captura nombre/color del equipo)
- `trg_equipo_miembro_delete` → SET `fecha_salida = now()` en `historial_equipos`

**Estado de desafío (FSM):**
`pendiente → aceptado → resultado_pendiente → completado | disputado`
También: `pendiente → rechazado`, `aceptado → resultado_pendiente` (via POST /api/resultados)

**XP functions (SECURITY DEFINER, bypasan RLS):**
- `add_xp(target_user_id uuid, amount int)` → incrementa `profiles.xp` y auto-nivela
- `add_team_xp(team_id uuid, amount int)` → incrementa `equipos.xp` y auto-nivela

**Al confirmar resultado:** ganador +500 XP equipo / +100 XP por jugador · perdedor +150 XP equipo / +35 XP por jugador · actualiza `cancha_dominio` (victorias/derrotas) · recalcula King de la cancha

**Regla King:** 1 solo equipo por cancha puede tener `es_king = true` = el que más victorias tiene en esa cancha (≥1). Desempate: menos derrotas. Último desempate: ganador del partido actual. Se recalcula en cada confirmación de resultado.

---

## Cliente Supabase

```ts
// Siempre en Server Components / API routes:
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient(); // usa ANON KEY + cookies del usuario → RLS activo
```

**No existe** un cliente con `service_role` — todo pasa por RLS.

---

## Sistema de diseño (Tailwind tokens)

Todos los colores son CSS variables — el tema se cambia con `data-theme="light"` en `<html>`.

| Token | Uso |
|---|---|
| `bg-surface` | Fondo de página |
| `bg-surface-container-low` | Cards principales |
| `bg-surface-container` | Cards secundarias / inputs |
| `text-on-surface` | Texto principal |
| `text-on-surface-variant` | Texto secundario |
| `text-outline` | Texto terciario / labels |
| `text-accent` / `bg-accent` | Amarillo gold (dark) / dorado (light) |
| `text-on-accent` | Texto sobre fondo accent |
| `border-outline-variant` | Bordes de cards |
| `border-outline` | Bordes hover |
| `text-status-libre` / `bg-status-libre/15` | Verde (disponible / ganado) |
| `text-status-rival` / `bg-status-rival/15` | Rojo (rival) |
| `text-error` / `bg-error/15` | Error |
| `text-primary` / `bg-primary/15` | Azul |
| `var(--medal-gold/silver/bronze)` | Colores de medalla (theming) |
| `var(--text-brand)` | Texto decorativo — amarillo en dark, azul en light |

**Nunca usar** colores hardcodeados (`bg-[#0f0f12]`, `text-[#F5C344]`) en código nuevo.

**Radios:** `rounded-xl` (14px) cards principales · `rounded-lg` (8px) botones/inputs  
**Tipografía:** `text-[15px]` títulos · `text-[13px]` body · `text-[11px]` secondary · `text-[10px]` labels uppercase

---

## Componentes UI reutilizables

### UI base (`components/ui/`)
- `Badge` — variants: `accent / primary / green / error / purple / neutral / king / libre / rival / gold`
- `XPBar` — Props: `xp, nivel, showLabel?, compact?`. Muestra progreso del nivel, XP total, nombre nivel siguiente.
- `RefreshButton` — llama `router.refresh()` via `useTransition`. Spinner animado. `w-9 h-9` tap target. Usado en Dashboard y DesafiosClientWrapper.
- `ThemeToggle` — alterna entre `data-theme="dark"` y `"light"` en `<html>`.

### Layout (`components/layout/`)
- `MobileBottomNav` — nav fijo inferior, solo en mobile (`md:hidden`). Items: **Inicio** `/dashboard` · **Mapa** `/mapa` · **Desafíos** `/desafios` · **Ligas** `/ligas` · **Equipo** `/equipo`. `aria-current` en item activo. Padding safe-area.
  > ⚠️ `feature/ligas` reemplazó **Ranking** por **Ligas**. Ranking sigue accesible en `/ranking`.

### Mapa (`components/mapa/`)
- `MapaClientWrapper` — wrapper cliente completo del mapa. Gestiona estado: filtros, búsqueda, cancha seleccionada, modales. Exporta interfaz `CanchaConEstado`:
  ```ts
  interface CanchaConEstado {
    id, nombre, direccion, lat, lng: number, deporte: string[]
    estado: 'libre' | 'king' | 'rival'
    equipoId?, equipoNombre?, equipoColor?, victorias?, derrotas?: number
    // campos de recinto (feature/canchas-info):
    es_publica?: boolean           // undefined = desconocido (legacy)
    precio_hora?: number | null    // CLP por hora
    telefono_contacto?: string | null
    nombre_recinto?: string | null
  }
  ```
- `MapaTerritorial` — componente Google Maps; pines coloreados por estado (king/libre/rival). Props: `canchas, onSelectCancha, modoAgregar, onMapClick, panToCoords`.
- `AgregarCanchaModal` — bottom-sheet modal para agregar cancha. Campos: nombre, dirección, deportes (multi-select), ubicación (mapa/geoloc), **sección recinto** (nombre recinto, acceso público/pago, precio/hr, teléfono). +80 XP al crear. POST `/api/canchas`.
- `EditarCanchaModal` — idéntico a Agregar pero pre-poblado con datos existentes. PATCH `/api/canchas/[id]`.

### Perfil / reclutamiento (`components/perfil/`)
- `EditarPerfilForm` ('use client') — edita bio, posición, especialidades, datos físicos, toggle reclutamiento. Props: `initialData: PerfilData`.
- `SolicitarEquipoButton` ('use client') — botón/modal para solicitar unirse a equipo. Props: `equipoId, equipoNombre`.

### Equipo (`components/equipo/`)
- `SolicitudActions` ('use client') — botones Accept/Reject con confirmación. Props: `solicitudId, jugadorNombre`.
- `DisolverEquipoButton` ('use client') — panel con input del nombre exacto del equipo como doble confirmación. Props: `equipoNombre`. Llama DELETE `/api/equipo/disolver`.
- `RosterRow` ('use client') — fila del roster. Chip Titular/Suplente clickeable para admin (optimistic PATCH). Admin expulsa; jugador sale. Props: `miembroId, jugadorId, nombre, iniciales, avatarColor, avatarUrl?, roles[], posicion, nivel, xp, isCurrentUser, isAdmin`.

### Ligas (`components/ligas/`) — feature/ligas
- `TablaLiga` — tabla de posiciones. Columnas: #, Equipo, PJ, PG, PE, PP, DP, Pts. Filas sobre `equiposClasifican` resaltadas con `↑`. Props: `rows: StandingRow[], titulo?, equiposClasifican?`.
- `PartidoCard` — card de partido: equipos con iniciales/color, marcador, ganador resaltado, badge estado. Props: `partido, compact?`.
- `BracketView` — bracket visual. Agrupa por fase ordenada: octavos→cuartos→semifinal→3er_lugar→final. Props: `partidos`.
- `LigaCard` — card de lista: emoji deporte, nombre, badges estado/formato, n/max equipos, fechas. Link a `/ligas/[id]`.
- `CrearLigaForm` ('use client') — form completo: nombre, descripcion, deporte, modalidad, formato (radio + descripciones), max_equipos, inscripcion_publica, fechas, puntos (collapsible), campos grupos (num_grupos, equipos_clasifican). POST `/api/ligas` → redirect a `/ligas/[id]/admin`.

### Ligas admin (`components/ligas/admin/`) — feature/ligas
- `AdminEstadoPanel` ('use client') — badge estado actual + botones de transición FSM. Doble confirmación para finalizar.
- `AdminEquiposPanel` ('use client') — invitados pendientes (aceptar/rechazar), aceptados con selector de grupo (grupos_playoffs), input invitar por equipo_id.
- `GenerarCalendarioButton` ('use client') — POST `/api/ligas/[id]/generar`. Props: `ligaId, formato, fase?, label?`. Muestra estado éxito/error.
- `ResultadoForm` ('use client') — inputs puntos local/visitante. PATCH `/api/ligas/[id]/partidos/[partidoId]`. Props: `ligaId, partidoId, equipoLocal, equipoVisitante, puntosLocalActual?, puntosVisitanteActual?`.

---

## Patrones recurrentes

### Fetch en Server Component
```tsx
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
// Queries paralelas:
const [{ data: a }, { data: b }] = await Promise.all([
  supabase.from('tabla_a').select('...'),
  supabase.from('tabla_b').select('...'),
]);
```

### Optimistic update + server sync
En `RosterRow`, `AdminEquiposPanel`: actualizar estado local inmediatamente → llamar `router.refresh()` tras la mutación para sincronizar server data.

### Botón de refresco
`<RefreshButton />` — llama `router.refresh()` via `useTransition`. Spinner animado mientras carga.

### Normalización FK joins Supabase
Supabase JS sin generated types infiere FK joins como arrays. Helper en cada archivo afectado:
```typescript
function unwrap<T>(v: T | T[]): T | null {
  if (Array.isArray(v)) return (v as T[])[0] ?? null;
  return v ?? null;
}
```
En API routes con shapes distintas usar guard manual:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eqRaw = le.equipos as any;
const eqObj = Array.isArray(eqRaw) ? eqRaw[0] : eqRaw;
```

### Constantes de jugador (`lib/player-constants.ts`)
- `POSICIONES_POR_DEPORTE` — mapa deporte → array de posiciones
- `ESPECIALIDADES_POR_DEPORTE` — mapa deporte → array de especialidades
- `DEPORTES_MAP` — mapa deporte → `{ emoji, label }`

---

## Migraciones aplicadas (estado actual)

| # | Descripción | Rama |
|---|---|---|
| 001 | Schema inicial: todas las tablas | main |
| 002 | `profiles.deportes_activos` array | main |
| 003 | `temporada_id` nullable en equipos/miembros; `display_name` en profiles; RLS miembros | main |
| 004 | Backfill display_name | main |
| 005 | Políticas join de equipos | main |
| 006 | Fix unique roster | main |
| 007 | Admin delete en roster | main |
| 008 | `add_xp()` function | main |
| 009 | Update policy para canchas | main |
| 010 | Tabla `desafios` (nueva, reemplaza la inicial) | main |
| 011 | No-op | main |
| 012 | Columnas de validación en `resultados` (`propuesto_por`, `confirmado_por_perdedor`, etc.) | main |
| 013 | **Fix:** elimina constraint `estado_valido` zombie; hace nullable `puntos_retador/retado` | main |
| 014 | `add_team_xp()` function | main |
| 015 | **Fix:** `cancha_dominio.temporada_id` nullable; unique sin temporada; RLS INSERT/UPDATE | main |
| 016 | Sistema de niveles 1–100: `_compute_nivel()`, `add_xp()` y `add_team_xp()` con auto-nivel; backfill | main |
| 017 | **Fix:** `cancha_dominio.es_king` — reset + recalcular King real por cancha | main |
| 018 | Columnas de enriquecimiento de perfil: bio, posicion_principal, posiciones_adicionales, especialidades, datos físicos, reclutamiento | main |
| 019 | Tabla `solicitudes_equipo` con RLS; política inserción en `equipo_miembros` para admins | main |
| 020 | Tabla `historial_equipos` + triggers `trg_equipo_miembro_insert/delete`; backfill | main |
| 021 | `historial_equipos` + columnas `temporada_id/temporada_nombre`; trigger actualizado; backfill | main |
| 022 | **Ligas:** `suscripciones`, `ligas`, `liga_equipos`, `liga_partidos` con RLS completo | feature/ligas |
| 023 | **Canchas info:** `es_publica`, `precio_hora`, `telefono_contacto`, `nombre_recinto` en `canchas`; índice `es_publica` | feature/canchas-info |

---

## Sistema de Niveles (1–100)

### Fórmula matemática

**XP acumulado para alcanzar el nivel `n`:** `xp(n) = 100 × n × (n − 1)`  
**Nivel desde XP (inversa analítica O(1)):** `n = ⌊ (1 + √(1 + 4·xp/100)) / 2 ⌋`  
**Incremento del nivel `n` al `n+1`:** `Δxp(n) = 200 × n`

### Umbrales clave

| Nivel | XP acumulado | Incremento al siguiente |
|------:|-------------:|------------------------:|
| 1     | 0            | 200 XP |
| 5     | 2 000        | 1 000 XP |
| 10    | 9 000        | 2 000 XP |
| 20    | 38 000       | 4 000 XP |
| 50    | 245 000      | 10 000 XP |
| 100   | 990 000      | — (máximo) |

### Tiers de nivel

| Niveles | Tier |
|---------|------|
| 1–10    | Rookie |
| 11–20   | Contender |
| 21–30   | Challenger |
| 31–40   | Fighter |
| 41–50   | Warrior |
| 51–60   | Elite |
| 61–70   | Master |
| 71–80   | Champion |
| 81–90   | Legend |
| 91–99   | King |
| **100** | **King of the Court** |

Sub-nivel en romano desde el 2: `Rookie III`, `Contender II`, etc.

### Implementación

- **`lib/levels.ts`** — `xpParaNivel(n)`, `nivelDesdeXP(xp)`, `nombreNivel(nivel)`, `porcentajeEnNivel(xp, nivel)`, `xpInicioNivel`, `xpSiguienteNivel`, `xpNecesarioEnNivel`, `MAX_NIVEL = 100`
- **`components/ui/XPBar`** — barra visual con progreso en nivel y XP total. Nivel 100 → "👑 Nivel máximo alcanzado".
- **SQL migración 016:** `_compute_nivel(xp_total int)` helper; `add_xp` / `add_team_xp` con auto-nivel.

### XP por partido (desafíos territoriales)

| Evento | XP equipo | XP por jugador |
|--------|----------:|---------------:|
| Victoria | +500 | +100 |
| Derrota  | +150 | +35 |
| Agregar cancha al mapa | — | +80 |

---

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=https://byoreeirinyyivxwjhjj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000   ← cambiar en producción
RESEND_API_KEY=...
```

---

## Mobile / responsive — patrones clave

- **Viewport:** `h-[100dvh]` en layout raíz (evita cropping por barra del browser en iPhone)
- **Bottom padding del `<main>`:** `.kotc-main-scroll` en `app/globals.css` = `padding-bottom: calc(64px + env(safe-area-inset-bottom))` en mobile, `0` en `md+`
- **Bottom sheets sobre el nav (z > 50):** `padding-bottom: env(safe-area-inset-bottom, 0px)`
- **Elementos `absolute bottom-X` en el mapa:** `bottom: calc(12px + env(safe-area-inset-bottom, 0px))`
- **Modales:** `z-[100]`, mobile = bottom-sheet (`items-end rounded-t-xl`), `max-h-[100dvh] overflow-y-auto`, `padding-bottom: max(1.5rem, env(safe-area-inset-bottom))`
- **Touch targets:** mínimo 44×44 px (`.kotc-tap-target`); botones de acción `min-h-[40px]`
- **MobileBottomNav:** `min-h-[56px]`, iconos 18px, labels 10px, `aria-label` + `aria-current`

---

## Lógica de gestión de equipo

### Salir / expulsión (DELETE `/api/equipo/miembros`)
- **Admin → salir**: bloqueado. Debe usar "Disolver equipo".
- **Jugador/capitán → salir**: permitido, excepto si `temporada.activa && inicio ≤ hoy ≤ fin`.
- **Admin → expulsar miembro**: permitido si target no es admin.
- **Admin → expulsar admin**: bloqueado siempre.

### Disolver equipo (DELETE `/api/equipo/disolver`)
- Solo el admin del equipo.
- Bloqueado si hay temporada en curso.
- UI: doble confirmación con input del nombre exacto del equipo.
- Orden FK-safe: `cancha_dominio` → `solicitudes_equipo` → `invitaciones` → `resultados` → `desafios` → `equipo_miembros` (trigger pone fecha_salida) → `equipos` (ON DELETE SET NULL en historial).
- Historial personal preservado (nombre/color denormalizados).

### Cambio de posición (PATCH `/api/equipo/miembros`)
- Body: `{ miembro_id, posicion: 'titular' | 'suplente' }`.
- Solo admin o capitán. Chip en roster clickeable solo para admin (toggle optimista).

---

## Canchas — información del recinto (`feature/canchas-info`)

> Migración 023. Rama: `feature/canchas-info`.

### Nuevos campos

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `es_publica` | `boolean` | `true` | Pública/gratuita (`true`) o recinto de pago (`false`) |
| `precio_hora` | `integer` | `null` | Precio promedio en CLP/hora. Solo relevante si `es_publica = false` |
| `telefono_contacto` | `text` | `null` | Número o texto de contacto para reservar |
| `nombre_recinto` | `text` | `null` | Nombre del complejo o recinto que administra la cancha |

### Comportamiento en UI

**Panel de cancha seleccionada (mapa):**
- Badge verde "🆓 Pública" o amarillo "💰 De pago"
- Si hay precio: `~$8.000/hr` junto al badge
- Teléfono como link `tel:` clickeable (abre marcador en móvil)
- Nombre del recinto en subtítulo bajo el nombre de la cancha

**Formularios (AgregarCanchaModal / EditarCanchaModal):**
- Sección "Información del recinto" colapsada al fondo del form
- Toggle de dos botones: 🆓 Pública / 💰 De pago
- Campo precio (`$` prefix + `/hr` suffix) solo visible cuando "De pago" está activo
- Campos nombre recinto y teléfono siempre opcionales

**API:** POST `/api/canchas` y PATCH `/api/canchas/[id]` aceptan todos los campos nuevos como opcionales.

---

## Sistema de ligas (`feature/ligas`)

> Migración 022. Rama: `feature/ligas`.

### Página de planes (`/planes`)

- **Pública** — accesible sin login. Accesible desde dashboard, `/ligas`, `/ligas/nueva`.
- Muestra dos columnas: **Gratuito** (siempre gratis) y **Organizador** (de pago).
- Detección automática: si el usuario tiene suscripción activa → badge "Activo ✓" + CTA "Ir a mis ligas".
- **Configurar antes de producción** (en `app/(app)/planes/page.tsx`):
  ```typescript
  const PLAN_ORGANIZADOR = {
    precio:      '$9.990',          // cambiar precio
    periodo:     '/mes',
    ctaWhatsapp: 'https://wa.me/56912345678?text=...', // cambiar número
    ctaEmail:    'mailto:contacto@kotc.cl',
  };
  ```
- FAQ con 3 preguntas frecuentes editables en el mismo archivo.

### Activar suscripción manualmente (admin)

```sql
-- Buscar UUID del usuario por email y crear suscripción en un solo query:
INSERT INTO suscripciones (user_id, plan, estado, fecha_inicio, fecha_fin)
SELECT id, 'organizador', 'activa', now(), now() + interval '1 year'
FROM auth.users
WHERE email = 'usuario@ejemplo.com';

-- Verificar:
SELECT s.*, u.email FROM suscripciones s
JOIN auth.users u ON u.id = s.user_id
WHERE u.email = 'usuario@ejemplo.com';
```

### Dashboard — card de ligas

La página `dashboard/page.tsx` hace dos queries adicionales si el usuario está autenticado:
1. `suscripciones` — verifica si tiene plan activo
2. `ligas` (count) — cuántas ligas ha creado (solo si tiene suscripción)

Resultado: muestra card con estado del plan y CTA contextual, o teaser con link a `/planes`.

### Navegación

`MobileBottomNav` items actuales: **Inicio** · **Mapa** · **Desafíos** · **Ligas** · **Equipo**  
Ranking fue reemplazado por Ligas. `/ranking` sigue funcionando como URL directa.

### Formatos de liga

| Formato | Descripción | Cómo generar |
|---------|-------------|-------------|
| `round_robin` | Todos contra todos (Berger) | 1 llamada → genera todas las rondas |
| `eliminacion_directa` | Bracket seedeado | 1 llamada por ronda; avanza ganadores automáticamente |
| `grupos_playoffs` | Grupos + bracket | 2 llamadas: `fase=grupos`, luego `fase=playoffs` tras completar grupos |

### Estado de liga (FSM)

```
borrador → inscripciones → en_curso → finalizada
                                    → cancelada
```
- `inscripciones → en_curso`: automático al generar el primer calendario.
- Solo el organizador puede cambiar estado.
- DELETE bloqueado si `en_curso`.

### Fases de partido

| `fase` | Contexto |
|--------|----------|
| `regular` | Round-robin (liga todos vs todos) |
| `grupos` | Fase de grupos (grupos_playoffs) |
| `octavos` | Eliminación directa (16 equipos) |
| `cuartos` | Eliminación directa (8 equipos) |
| `semifinal` | Eliminación directa (4 equipos) |
| `3er_lugar` | Partido por tercer puesto |
| `final` | Final |

### Generación de calendario (`lib/ligas/generar.ts`)

- **`generarRoundRobin(equipoIds)`** — algoritmo Berger circle; n-1 rondas; n/2 partidos por ronda; bye = `__bye__` si número impar.
- **`generarRondaEliminacion(equipoIds, rondaNum, faseOverride?)`** — seedeado: #1 vs #N, #2 vs #N-1. Fase auto-detectada por número de equipos.
- **`generarPartidosGrupos(equiposPorGrupo)`** — round-robin por grupo con campo `grupo`.

### Standings (`lib/ligas/tabla.ts`)

```typescript
interface StandingRow {
  equipo_id, nombre, color, grupo?: string
  PJ, PG, PE, PP, GF, GC, GD, Pts: number
}
computeTabla(equipos, partidos, config, grupoFilter?)        // → StandingRow[]
computeTablaByGrupo(equipos, partidos, config)               // → Record<string, StandingRow[]>
// config = { puntos_victoria, puntos_empate, puntos_derrota }
// Orden: Pts DESC, GD DESC, GF DESC
```

### Normalización FK joins Supabase

Sin generated types, Supabase infiere FK joins como arrays. Usar el helper `unwrap<T>()` en páginas y `Array.isArray` guard en API routes (ver sección "Patrones recurrentes").

---

## Cosas pendientes / conocidas

- **Dashboard y equipo page** usan estilos hardcodeados legacy (`bg-[#0f0f12]`, `text-[#F5C344]`) — refactoring a tokens pendiente
- **Sin temporadas activas** — `temporada_id` nullable en todas las tablas relevantes
- **Sin Supabase Realtime** — cambios requieren recarga manual (`router.refresh()` o `<RefreshButton />`)
- **Ranking** eliminado del nav en `feature/ligas`; accesible por URL directa `/ranking`
- **Precio en planes** — `$9.990/mes` es un placeholder; cambiar en `app/(app)/planes/page.tsx` antes de producción
- **WhatsApp CTA** — número placeholder `+56912345678`; cambiar en `PLAN_ORGANIZADOR.ctaWhatsapp` en `/planes`
- **Jugadores sin fila en `profiles`** pueden no aparecer en ranking: `SELECT em.jugador_id, p.username FROM equipo_miembros em LEFT JOIN profiles p ON p.id = em.jugador_id WHERE p.id IS NULL`
