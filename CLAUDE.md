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

## Rutas de la app

```
app/
  page.tsx                      ← Landing pública
  (app)/
    dashboard/page.tsx          ← Home del jugador autenticado
    mapa/page.tsx               ← Mapa de canchas con Google Maps
    desafios/page.tsx           ← Gestión de desafíos del equipo
    equipo/page.tsx             ← Perfil del equipo + roster (admins: solicitudes badge + buscar jugadores)
    equipo/invitaciones/        ← Gestión de invitaciones
    equipo/solicitudes/         ← Solicitudes de ingreso (solo admin/capitán)
    ranking/page.tsx            ← Ranking territorial (equipos + jugadores)
    perfil/page.tsx             ← Editar perfil de jugador (bio, posición, especialidades, datos físicos, reclutamiento)
    jugadores/page.tsx          ← Lista de jugadores disponibles para reclutamiento (sin equipo)
    jugadores/[id]/page.tsx     ← Perfil público de jugador (bio, posición, especialidades, datos físicos, disponible badge)
    equipos/[id]/page.tsx       ← Perfil público de equipo (canchas, stats, roster, botón "Solicitar unirme")
    ligas/page.tsx              ← Lista de ligas (mis ligas + otras); botón "Crear liga" si tiene suscripción
    ligas/nueva/page.tsx        ← Formulario crear liga (requiere suscripción activa)
    ligas/[id]/page.tsx         ← Vista pública de liga: hero, tabla/grupos/bracket, próximos, recientes, equipos
    ligas/[id]/admin/page.tsx   ← Panel admin: estado, stats, generar calendario, cargar resultados, equipos
    ligas/[id]/admin/partidos/  ← Carga de resultados agrupada por fase/grupo/ronda
  auth/callback/route.ts        ← OAuth callback
  api/
    equipos/route.ts            ← POST crear equipo
    canchas/route.ts            ← GET list / POST crear cancha
    canchas/[id]/route.ts       ← PATCH editar cancha
    desafios/route.ts           ← POST crear desafío
    desafios/[id]/route.ts      ← PATCH aceptar/rechazar
    resultados/route.ts         ← POST proponer / PATCH confirmar|disputar
    equipo/miembros/route.ts    ← PATCH cambiar posición titular/suplente (admin); DELETE salir/expulsar con validaciones
    equipo/disolver/route.ts    ← DELETE disolver equipo (admin): elimina dominio, solicitudes, invitaciones, desafíos, miembros y equipo en orden FK-safe
    invitaciones/route.ts       ← POST crear / GET aceptar invitación
    perfil/route.ts             ← PATCH actualizar perfil propio (bio, posición, especialidades, datos físicos, reclutamiento)
    solicitudes/route.ts        ← POST crear solicitud / GET listar (admin: equipo | jugador: ?tipo=mias)
    solicitudes/[id]/route.ts   ← PATCH aceptar/rechazar/cancelar solicitud; DELETE cancelar
    ligas/route.ts              ← GET listar ligas / POST crear liga (requiere suscripción)
    ligas/[id]/route.ts         ← GET detalle / PATCH actualizar+transición estado / DELETE eliminar
    ligas/[id]/equipos/route.ts         ← GET listar equipos / POST invitar o inscribir equipo
    ligas/[id]/equipos/[equipoId]/route.ts ← PATCH estado/grupo/seed; DELETE retirar equipo
    ligas/[id]/generar/route.ts         ← POST generar calendario (round_robin, eliminacion_directa, grupos+playoffs)
    ligas/[id]/partidos/route.ts        ← GET listar partidos (?fase&grupo&ronda&estado)
    ligas/[id]/partidos/[partidoId]/route.ts ← PATCH cargar resultado (puntos + ganador)
    ligas/[id]/tabla/route.ts           ← GET standings computados (tabla o grupos)
```

---

## Schema de base de datos (resumen)

```sql
profiles          (id→auth.users, username, display_name, avatar_url, ciudad, nivel, xp,
                   bio, posicion_principal, posiciones_adicionales text[], especialidades text[],
                   altura_cm, peso_kg, mano_habil, anos_experiencia, disponible_reclutamiento)
temporadas        (id, nombre, deporte, inicio, fin, activa)
equipos           (id, nombre, deporte, modalidad, ciudad, color, nivel, xp, creador_id, temporada_id nullable)
equipo_miembros   (id, equipo_id, jugador_id→profiles, rol, posicion, temporada_id nullable, deporte)
canchas           (id, nombre, direccion, lat, lng, fotos, deporte[], agregada_por)
cancha_dominio    (id, cancha_id, equipo_id, victorias, derrotas, es_king, temporada_id nullable)
desafios          (id, equipo_retador_id, equipo_retado_id, cancha_id, deporte, formato, fecha, mensaje, estado)
resultados        (id, desafio_id, ganador_id, propuesto_por→equipos, puntos_retador nullable, puntos_retado nullable, confirmado_por_perdedor, disputado, confirmado_at)
invitaciones      (id, equipo_id, token, email, metodo, estado, expira_at)
solicitudes_equipo (id, equipo_id, jugador_id→auth.users, mensaje, estado [pendiente|aceptada|rechazada|cancelada], created_at, updated_at)
historial_equipos  (id, jugador_id→auth.users, equipo_id nullable→equipos, equipo_nombre, equipo_color, deporte, ciudad, rol, posicion, fecha_ingreso, fecha_salida nullable)

-- Ligas (feature/ligas branch, migración 022)
suscripciones     (id, user_id→auth.users, plan, estado [activa|cancelada|expirada], fecha_inicio, fecha_fin)
ligas             (id, organizador_id→auth.users, nombre, descripcion, deporte, modalidad,
                   formato CHECK('round_robin','eliminacion_directa','grupos_playoffs'),
                   estado CHECK('borrador','inscripciones','en_curso','finalizada','cancelada'),
                   max_equipos, num_grupos, equipos_clasifican, inscripcion_publica,
                   puntos_victoria, puntos_empate, puntos_derrota, fecha_inicio, fecha_fin)
liga_equipos      (id, liga_id→ligas, equipo_id→equipos, estado CHECK('invitado','aceptado','rechazado','retirado'),
                   grupo, seed, UNIQUE(liga_id, equipo_id))
liga_partidos     (id, liga_id→ligas, equipo_local_id→equipos nullable, equipo_visitante_id→equipos nullable,
                   fase, grupo, ronda, estado CHECK('pendiente','completado','cancelado'),
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

**Componentes UI disponibles:** `Badge` (variants: accent/primary/green/error/purple/neutral/king/libre/rival), `XPBar` (xp, nivel, showLabel?, compact?), `RefreshButton` (llama router.refresh() via useTransition, w-9 h-9 tap target), `ThemeToggle`

**Componentes de perfil/reclutamiento:**
- `components/perfil/EditarPerfilForm` — form 'use client' para editar bio, posición, especialidades, datos físicos y toggle de reclutamiento. Props: `initialData: PerfilData`.
- `components/perfil/SolicitarEquipoButton` — botón/modal 'use client' para que un jugador sin equipo solicite unirse. Props: `equipoId`, `equipoNombre`.
- `components/equipo/SolicitudActions` — botones Accept/Reject con confirmación 'use client'. Props: `solicitudId`, `jugadorNombre`.
- `components/equipo/DisolverEquipoButton` — panel de disolución con doble confirmación (input con nombre del equipo). Props: `equipoNombre`. Llama DELETE `/api/equipo/disolver`.
- `components/equipo/RosterRow` — fila de miembro del roster. Admin puede hacer clic en el chip Titular/Suplente para cambiar posición (optimistic update, PATCH `/api/equipo/miembros`). Admin puede expulsar no-admins; jugadores pueden salirse. Props: `miembroId, jugadorId, nombre, iniciales, avatarColor, avatarUrl?, roles[], posicion, nivel, xp, isCurrentUser, isAdmin`.

**Componentes de ligas (`components/ligas/`):**
- `TablaLiga` — tabla de posiciones con columnas PJ/PG/PE/PP/DP/Pts. Props: `rows: StandingRow[], titulo?, equiposClasifican?`. Filas sobre el umbral de clasificación se resaltan con `↑`.
- `PartidoCard` — card de partido con equipos (iniciales + color), resultado, ganador resaltado, badge estado. Props: `partido, compact?`.
- `BracketView` — bracket de eliminación: agrupa partidos por fase (octavos→cuartos→semifinal→3er_lugar→final). Props: `partidos`.
- `LigaCard` — card de liga en la lista: emoji deporte, nombre, badges estado/formato, equipos/max, fechas. Link a `/ligas/[id]`.
- `CrearLigaForm` ('use client') — formulario completo: nombre, descripcion, deporte, modalidad, formato (radio con descripciones), max_equipos, inscripcion_publica, fechas, puntos (collapsible); campos extra para grupos_playoffs (num_grupos, equipos_clasifican). POST `/api/ligas` → redirect a `/ligas/[id]/admin`.

**Componentes admin de ligas (`components/ligas/admin/`):**
- `AdminEstadoPanel` ('use client') — muestra estado actual con badge; botones de transición (borrador→inscripciones→en_curso→finalizada). Doble confirmación para finalizar.
- `AdminEquiposPanel` ('use client') — lista invitados pendientes (aceptar/rechazar), equipos aceptados con selector de grupo (para grupos_playoffs), input para invitar por equipo_id.
- `GenerarCalendarioButton` ('use client') — POST `/api/ligas/[id]/generar` con body opcional `{ fase }`. Props: `ligaId, formato, fase?, label?`.
- `ResultadoForm` ('use client') — inputs de puntos local/visitante con PATCH `/api/ligas/[id]/partidos/[partidoId]`. Props: `ligaId, partidoId, equipoLocal, equipoVisitante, puntosLocalActual?, puntosVisitanteActual?`.

**Constantes de jugador (`lib/player-constants.ts`):**
- `POSICIONES_POR_DEPORTE` — mapa deporte → array de posiciones
- `ESPECIALIDADES_POR_DEPORTE` — mapa deporte → array de especialidades
- `DEPORTES_MAP` — mapa deporte → `{ emoji, label }`

**Radios:** `rounded-xl` (14px) cards principales · `rounded-lg` (8px) botones/inputs  
**Tipografía:** `text-[15px]` títulos · `text-[13px]` body · `text-[11px]` secondary · `text-[10px]` labels uppercase

---

## Patrones recurrentes

### Fetch en Server Component
```tsx
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
// queries paralelas con Promise.all
```

### Optimistic update + server sync
En `DesafioCard`: actualizar estado local inmediatamente + llamar `router.refresh()` tras la mutación para sincronizar server data.

### Botón de refresco
`<RefreshButton />` (`components/ui/RefreshButton.tsx`) — componente cliente reutilizable, llama `router.refresh()` via `useTransition`. Spinner animado mientras carga. Usado en Dashboard (canchas + desafíos) y DesafiosClientWrapper.

---

## Migraciones aplicadas (estado actual)

| # | Descripción |
|---|---|
| 001 | Schema inicial: todas las tablas |
| 002 | `profiles.deportes_activos` array |
| 003 | `temporada_id` nullable en equipos/miembros; `display_name` en profiles; RLS miembros |
| 004 | Backfill display_name |
| 005 | Políticas join de equipos |
| 006 | Fix unique roster |
| 007 | Admin delete en roster |
| 008 | `add_xp()` function |
| 009 | Update policy para canchas |
| 010 | Tabla `desafios` (nueva, reemplaza la inicial) |
| 011 | No-op |
| 012 | Columnas de validación en `resultados` (`propuesto_por`, `confirmado_por_perdedor`, etc.) |
| 013 | **Fix:** elimina constraint `estado_valido` zombie; hace nullable `puntos_retador/retado` |
| 014 | `add_team_xp()` function |
| 015 | **Fix:** `cancha_dominio.temporada_id` nullable; unique sin temporada; RLS INSERT/UPDATE |
| 016 | Sistema de niveles 1–100: `_compute_nivel()`, `add_xp()` y `add_team_xp()` con auto-nivel; backfill |
| 017 | **Fix:** `cancha_dominio.es_king` — reset + recalcular King real por cancha (más victorias, desempate: menos derrotas) |
| 018 | Columnas de enriquecimiento de perfil: `bio`, `posicion_principal`, `posiciones_adicionales`, `especialidades`, `altura_cm`, `peso_kg`, `mano_habil`, `anos_experiencia`, `disponible_reclutamiento` |
| 019 | Tabla `solicitudes_equipo` con RLS; política de inserción en `equipo_miembros` para admins |
| 020 | Tabla `historial_equipos` + triggers automáticos `trg_equipo_miembro_insert/delete`; backfill de miembros actuales |
| 021 | `historial_equipos` + columnas `temporada_id/temporada_nombre`; trigger actualizado captura temporada al ingreso; backfill activos |
| 022 | **Ligas** (feature/ligas): tablas `suscripciones`, `ligas`, `liga_equipos`, `liga_partidos` con RLS completo. Políticas: crear liga requiere suscripción activa; editar/generar solo organizador; ver ligas: públicas o propias |

---

## Sistema de Niveles (1–100)

### Fórmula matemática

**XP acumulado para alcanzar el nivel `n`:**

```
xp(n) = 100 × n × (n − 1)
```

**Nivel a partir del XP total (inversa analítica, O(1)):**

```
n = ⌊ (1 + √(1 + 4·xp/100)) / 2 ⌋    (clampeado a [1, 100])
```

**XP necesario para subir del nivel `n` al `n+1` (incremento):**

```
Δxp(n) = 200 × n    ← crece linealmente con el nivel
```

### Umbrales clave

| Nivel | XP acumulado | Incremento al siguiente |
|------:|-------------:|------------------------:|
| 1     | 0            | 200 XP |
| 2     | 200          | 400 XP |
| 5     | 2 000        | 1 000 XP |
| 10    | 9 000        | 2 000 XP |
| 20    | 38 000       | 4 000 XP |
| 50    | 245 000      | 10 000 XP |
| 100   | 990 000      | — (máximo) |

### Nombres de nivel (tiers)

Cada tier cubre 10 niveles. El sub-nivel se añade en romano a partir del 2.

| Niveles | Tier base |
|---------|-----------|
| 1–10    | Rookie (I … X) |
| 11–20   | Contender |
| 21–30   | Challenger |
| 31–40   | Fighter |
| 41–50   | Warrior |
| 51–60   | Elite |
| 61–70   | Master |
| 71–80   | Champion |
| 81–90   | Legend |
| 91–99   | King (I … IX) |
| **100** | **King of the Court** |

Ejemplos: `Nivel 1 → Rookie`, `Nivel 3 → Rookie III`, `Nivel 12 → Contender II`, `Nivel 100 → King of the Court`.

### Implementación

- **`lib/levels.ts`** — utilidades compartidas (client + server):
  - `xpParaNivel(n)` / `nivelDesdeXP(xp)` — conversión XP ↔ nivel
  - `nombreNivel(nivel)` — nombre del nivel (tier + romano)
  - `porcentajeEnNivel(xp, nivel)` — % de progreso en el nivel actual
  - `xpInicioNivel(nivel)` / `xpSiguienteNivel(nivel)` / `xpNecesarioEnNivel(nivel)`
  - `MAX_NIVEL = 100`

- **`components/ui/XPBar`** — barra visual; muestra XP en nivel / XP necesario + XP total + nombre siguiente nivel. Si nivel == 100 muestra "👑 Nivel máximo alcanzado".

- **SQL (migración 016):**
  - `_compute_nivel(xp_total int)` — helper inmutable, implementa la inversa analítica
  - `add_xp(target_user_id, amount)` — incrementa `profiles.xp` y actualiza `profiles.nivel` si cambió
  - `add_team_xp(team_id, amount)` — ídem para `equipos`
  - Backfill automático al aplicar la migración

### XP por partido

| Evento | XP equipo | XP por jugador |
|--------|----------:|---------------:|
| Victoria | +500 | +100 |
| Derrota  | +150 | +35  |

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

- **Viewport:** `h-[100dvh]` en el layout raíz (evita cropping por barra del browser en iPhone)
- **Bottom padding del `<main>`:** utility CSS `.kotc-main-scroll` en `app/globals.css` = `padding-bottom: calc(64px + env(safe-area-inset-bottom))` en mobile, `0` en `md+`
- **Bottom sheets que van ENCIMA del nav (z > 50):** `padding-bottom: env(safe-area-inset-bottom, 0px)`
- **Elementos `absolute bottom-X` dentro del mapa:** `bottom: calc(12px + env(safe-area-inset-bottom, 0px))`
- **Modales:** `z-[100]`, en mobile `items-end rounded-t-xl` (bottom-sheet), `max-h-[100dvh] overflow-y-auto`, `padding-bottom: max(1.5rem, env(safe-area-inset-bottom))`
- **Touch targets:** mínimo 44×44 px (`.kotc-tap-target`); botones de acción con `min-h-[40px]`
- **MobileBottomNav:** `min-h-[56px]`, iconos 18px, labels 10px, `aria-label` + `aria-current`

---

## Lógica de gestión de equipo

### Salir / expulsión (DELETE `/api/equipo/miembros`)
- **Admin → salir**: bloqueado. Debe usar "Disolver equipo".
- **Jugador/capitán → salir**: permitido, excepto si `temporada.activa && inicio ≤ hoy ≤ fin`.
- **Admin → expulsar miembro**: permitido si target no es admin.
- **Admin → expulsar admin**: bloqueado siempre.

### Disolver equipo (DELETE `/api/equipo/disolver`)
- Solo accesible para el admin del equipo.
- Bloqueado si hay temporada en curso (`activa && inicio ≤ hoy ≤ fin`).
- Requiere doble confirmación en UI: panel con input del nombre exacto del equipo.
- Orden de eliminación FK-safe: `cancha_dominio` → `solicitudes_equipo` → `invitaciones` → `resultados` (de desafíos) → `desafios` → `equipo_miembros` (trigger: pone fecha_salida en historial) → `equipos` (ON DELETE SET NULL en historial_equipos.equipo_id).
- El historial personal de cada jugador se preserva (equipo_nombre/color denormalizados).

### Cambio de posición (PATCH `/api/equipo/miembros`)
- Body: `{ miembro_id, posicion: 'titular' | 'suplente' }`.
- Solo admin o capitán del equipo puede cambiar la posición de cualquier miembro.
- En el roster, el chip Titular/Suplente es clickeable solo para el admin (toggle optimista).

---

## Sistema de ligas (feature/ligas)

> Rama: `feature/ligas` — pendiente de merge a main.
> Para aplicar: `supabase db push` o ejecutar `supabase/migrations/022_ligas.sql`.

### Suscripciones

- La tabla `suscripciones` se gestiona manualmente (admin SQL o panel Supabase).
- Para habilitar a un usuario: `INSERT INTO suscripciones (user_id, plan, estado, fecha_inicio, fecha_fin) VALUES ('<uid>', 'organizador', 'activa', now(), now() + interval '1 year')`.
- El endpoint POST `/api/ligas` y la página `/ligas/nueva` verifican `suscripciones` (estado=activa, fecha_fin≥hoy) antes de permitir crear.

### Formatos de liga

| Formato | Descripción | Generación |
|---------|-------------|------------|
| `round_robin` | Todos contra todos (Berger circle) | Una sola llamada genera todas las rondas |
| `eliminacion_directa` | Bracket de eliminación directa | Llamada por ronda; avanza ganadores |
| `grupos_playoffs` | Fase de grupos + bracket playoffs | Dos llamadas: `fase=grupos` y luego `fase=playoffs` |

### Estado de liga (FSM)

`borrador → inscripciones → en_curso → finalizada | cancelada`

- La transición `inscripciones → en_curso` ocurre automáticamente al generar el primer calendario.
- Solo el organizador puede cambiar el estado.

### Generación de calendario (`lib/ligas/generar.ts`)

- **`generarRoundRobin(equipoIds)`** — algoritmo de Berger (circle method); fixture completo, n-1 rondas, n/2 partidos por ronda. Bye con `__bye__` si número impar de equipos.
- **`generarRondaEliminacion(equipoIds, rondaNum, faseOverride?)`** — una ronda seedeada: #1 vs #N, #2 vs #N-1, etc. Determina la fase automáticamente según el número de equipos (octavos/cuartos/semifinal/final) si no se pasa `faseOverride`.
- **`generarPartidosGrupos(equiposPorGrupo)`** — round-robin por grupo, con campo `grupo` en cada partido.

### Standings (`lib/ligas/tabla.ts`)

- **`computeTabla(equipos, partidos, config, grupoFilter?)`** — calcula standings. Ordena por Pts DESC, GD DESC, GF DESC.
- **`computeTablaByGrupo(equipos, partidos, config)`** — llama `computeTabla` por grupo; retorna `Record<string, StandingRow[]>`.
- Config: `{ puntos_victoria, puntos_empate, puntos_derrota }` — configurable por liga.

### Normalización de FK joins de Supabase

Supabase JS sin generated types infiere los FK joins como arrays. Todos los archivos que hacen joins usan el helper:

```typescript
function unwrap<T>(v: T | T[]): T | null {
  if (Array.isArray(v)) return (v as T[])[0] ?? null;
  return v ?? null;
}
```

Para API routes que no pueden usar el helper (distintas shapes), se usa `as any` con `Array.isArray` guard:
```typescript
const eqRaw = le.equipos as any;
const eqObj = Array.isArray(eqRaw) ? eqRaw[0] : eqRaw;
```

---

## Cosas pendientes / conocidas

- **Karla Moyano** (u otros jugadores de equipo) pueden no aparecer en ranking si no tienen fila en `profiles` — diagnosticar con: `SELECT em.jugador_id, p.username FROM equipo_miembros em LEFT JOIN profiles p ON p.id = em.jugador_id WHERE p.id IS NULL`
- **Sin temporadas activas** — `temporada_id` es nullable en todas las tablas relevantes
- **Sin Supabase Realtime** — cambios entre equipos requieren recarga manual (`router.refresh()` o botón ↻)
- El equipo page y dashboard aún usan estilos hardcodeados legacy (`bg-[#0f0f12]` etc.) — refactoring pendiente
