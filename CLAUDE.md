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
- `add_xp(target_user_id uuid, amount int)` → incrementa `profiles.xp`
- `add_team_xp(team_id uuid, amount int)` → incrementa `equipos.xp`

**Al confirmar resultado:** ganador +50 XP equipo / +15 XP por jugador · perdedor +10 XP equipo / +5 XP por jugador · actualiza `cancha_dominio` (victorias/derrotas)

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

**Componentes UI disponibles:** `Badge` (variants: accent/primary/green/error/purple/neutral/king/libre/rival), `XPBar` (xp, nivel, showLabel?, compact?), `ThemeToggle`

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
`DesafiosClientWrapper` tiene un `↻` que llama `router.refresh()` via `useTransition`.

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

## Cosas pendientes / conocidas

- **Karla Moyano** (u otros jugadores de equipo) pueden no aparecer en ranking si no tienen fila en `profiles` — diagnosticar con: `SELECT em.jugador_id, p.username FROM equipo_miembros em LEFT JOIN profiles p ON p.id = em.jugador_id WHERE p.id IS NULL`
- **Sin temporadas activas** — `temporada_id` es nullable en todas las tablas relevantes
- **Sin Supabase Realtime** — cambios entre equipos requieren recarga manual (`router.refresh()` o botón ↻)
- **Dashboard "Canchas bajo control"** y **"Desafíos pendientes"** son live desde DB pero no auto-refrescan
- El equipo page y dashboard aún usan estilos hardcodeados legacy (`bg-[#0f0f12]` etc.) — refactoring pendiente
