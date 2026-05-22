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
    equipo/page.tsx             ← Perfil del equipo + roster
    equipo/invitaciones/        ← Gestión de invitaciones
    ranking/page.tsx            ← Ranking territorial (equipos + jugadores)
    jugadores/[id]/page.tsx     ← Perfil público de jugador
    equipos/[id]/page.tsx       ← Perfil público de equipo (canchas, stats, roster)
  auth/callback/route.ts        ← OAuth callback
  api/
    equipos/route.ts            ← POST crear equipo
    canchas/route.ts            ← GET list / POST crear cancha
    canchas/[id]/route.ts       ← PATCH editar cancha
    desafios/route.ts           ← POST crear desafío
    desafios/[id]/route.ts      ← PATCH aceptar/rechazar
    resultados/route.ts         ← POST proponer / PATCH confirmar|disputar
    equipo/miembros/route.ts    ← DELETE expulsar miembro
    invitaciones/route.ts       ← POST crear / GET aceptar invitación
```

---

## Schema de base de datos (resumen)

```sql
profiles          (id→auth.users, username, display_name, avatar_url, ciudad, nivel, xp)
temporadas        (id, nombre, deporte, inicio, fin, activa)
equipos           (id, nombre, deporte, modalidad, ciudad, color, nivel, xp, creador_id, temporada_id nullable)
equipo_miembros   (id, equipo_id, jugador_id→profiles, rol, posicion, temporada_id nullable, deporte)
canchas           (id, nombre, direccion, lat, lng, fotos, deporte[], agregada_por)
cancha_dominio    (id, cancha_id, equipo_id, victorias, derrotas, es_king, temporada_id nullable)
desafios          (id, equipo_retador_id, equipo_retado_id, cancha_id, deporte, formato, fecha, mensaje, estado)
resultados        (id, desafio_id, ganador_id, propuesto_por→equipos, puntos_retador nullable, puntos_retado nullable, confirmado_por_perdedor, disputado, confirmado_at)
invitaciones      (id, equipo_id, token, email, metodo, estado, expira_at)
```

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

## Cosas pendientes / conocidas

- **Karla Moyano** (u otros jugadores de equipo) pueden no aparecer en ranking si no tienen fila en `profiles` — diagnosticar con: `SELECT em.jugador_id, p.username FROM equipo_miembros em LEFT JOIN profiles p ON p.id = em.jugador_id WHERE p.id IS NULL`
- **Sin temporadas activas** — `temporada_id` es nullable en todas las tablas relevantes
- **Sin Supabase Realtime** — cambios entre equipos requieren recarga manual (`router.refresh()` o botón ↻)
- El equipo page y dashboard aún usan estilos hardcodeados legacy (`bg-[#0f0f12]` etc.) — refactoring pendiente
