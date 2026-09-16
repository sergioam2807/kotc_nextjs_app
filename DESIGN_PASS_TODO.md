# Impeccable design pass — estado y continuación

Contexto: el usuario pidió aplicar los 9 comandos de `/impeccable` (`onboard`,
`animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`,
`adapt`) a **toda la app**, en un solo pase por archivo en vez de 9 pasadas
separadas (más eficiente, misma calidad). `PRODUCT.md` y `DESIGN.md` ya
existen en la raíz del repo — léelos primero, son la fuente de verdad de
producto y del sistema visual "Blacktop Neon" (negro puro, acento lima
`#d5ff40` gastado con disciplina, Poppins, profundidad tonal sin sombras,
mobile-first denso).

El build (`npx next build`) está limpio en este momento. Todo lo listado
como "hecho" abajo fue verificado con build passing.

## ✅ Hecho (onboard + colorize + typeset + layout + delight + clarify + adapt, tejidos juntos)

- **Sistema de tokens global** (`app/globals.css`, `lib/design-tokens.ts`): ya
  migrado a la paleta lima/negro esta sesión (previo a este pase de 9 comandos).
- **Dashboard** (`app/(app)/dashboard/page.tsx`) — CTA reordenada, módulo
  "Mis desafíos" consolidado, King siempre lima, colores hardcodeados
  eliminados. (Trabajo de la crítica anterior, no de este pase.)
- **Equipo** (`app/(app)/equipo/page.tsx`) — ya limpio de una sesión anterior.
- **Mapa** — `components/mapa/MapaClientWrapper.tsx`, `MapaGoogle.tsx`,
  `components/ui/StarRating.tsx`: fix real de bug — el mapa todavía usaba el
  amarillo viejo (`#ffe083`) hardcodeado para King, incluyendo el estilo de
  las tiles de Google Maps (seguían en navy, no negro puro). Corregido.
  `components/mapa/MapaLeaflet.tsx` es código muerto (no se usa,
  `MapaTerritorial` siempre monta `MapaGoogle`) — tiene los mismos colores
  viejos pero **no se tocó** porque nadie lo renderiza; candidato a borrar.
- **Desafíos** — `DesafioCard.tsx`, `DesafiosClientWrapper.tsx` (estado vacío
  con CTA real), `NuevoDesafioModal.tsx`, `Desafios1v1Section.tsx`,
  `NuevoDesafio1v1Modal.tsx`: avatares fallback que usaban lima de forma
  ambiental (dilución de la regla One Voice) → neutral. `Desafiar1v1Button.tsx`
  ya estaba ejemplar, sin cambios. `ProponeResultadoModal.tsx` revisado, sin
  hallazgos.
- **Equipos / Jugadores / Ranking / Perfil** (cluster completo, vía subagente,
  build verificado):
  - `app/(app)/equipos/[id]/page.tsx`, `app/(app)/jugadores/[id]/page.tsx`:
    fix `text-error`→`text-status-rival` en conteos de derrotas, stat numbers
    a `font-black`, CTAs primarias movidas arriba (Solicitar unirme, Invitar,
    Desafiar 1v1), copy en empty states.
  - `app/(app)/perfil/page.tsx`, `components/perfil/EditarPerfilForm.tsx`
    (quitado un `shadow` prohibido), `components/perfil/SolicitarEquipoButton.tsx`
    (sin cambios, ya correcto).
  - `components/jugadores/InvitarJugadorButton.tsx`: hex de WhatsApp
    hardcodeado (`#25D366`) → tokens.
  - `components/ranking/RankingClientWrapper.tsx`, `TeamRankingView.tsx`
    (sombra de color prohibida eliminada), `PlayerRankingView.tsx`,
    `Player1v1RankingView.tsx` (naranja hardcodeado → `status-libre`).
  - `app/(app)/ranking/page.tsx`: sin cambios (es puro data-fetching).
- **Ligas** (cluster completo, vía subagente, build verificado):
  - `app/(app)/ligas/page.tsx`, `ligas/[id]/page.tsx`, `ligas/[id]/admin/page.tsx`
    + `AdminEstadoPanel.tsx` + `AdminEquiposPanel.tsx`, `ligas/[id]/admin/partidos/page.tsx`
    + `ResultadoForm.tsx`, `CrearLigaForm.tsx` (migrado a inputs HeroUI),
    `BracketView.tsx` (🏆 en la final).
  - Varias violaciones reales de la regla One Voice corregidas (dos CTAs
    lima compitiendo en la misma pantalla, un link estilizado como texto
    lima plano en vez de botón, etc.) — detalle completo en el resumen del
    agente si hace falta releerlo.
  - **Gap conocido, no arreglado a propósito**: `TablaLiga` ya tiene un prop
    `miEquipoId?` listo pero nada lo alimenta (resaltar "tu equipo" en la
    tabla necesitaría una query nueva, fuera de alcance de un pase de diseño).
  - **Gap conocido**: el empty-state de `BracketView.tsx` es código muerto
    hoy (el único call site ya filtra `length > 0` antes de montar el
    componente) — no se conectaron props nuevas para arreglar una rama que
    nada ejecuta.
- **Auth / Marketing / Onboarding** (cluster completo, vía subagente, build
  verificado):
  - `app/page.tsx` (landing): gradiente navy → lima/negro, eliminados 3
    "eyebrows" prohibidos por el craft-floor del skill, eliminadas
    estadísticas de uso inventadas (PRODUCT.md prohíbe fabricar evidencia
    pre-lanzamiento) — reemplazadas por copy honesto.
  - `app/(auth)/login/page.tsx`, `app/(auth)/layout.tsx`, `app/onboarding/page.tsx`:
    migrados de la paleta vieja (`#F5C344`, `#0f0f12`, etc.) a tokens.
  - `app/register/page.tsx`: revisado, es un stub de redirect puro, sin cambios.
  - `app/join/[equipoId]/[token]/page.tsx`: **bug real encontrado y
    arreglado** — la página nunca validaba `expira_at` al renderizar (solo
    la server action lo hacía), así que una invitación vencida pero aún
    `pendiente` mostraba el formulario normal y el usuario quedaba en un
    loop silencioso. Se agregó un chequeo de solo-lectura usando el dato ya
    obtenido (sin queries nuevas). Migrado a tokens + estados sin salida
    ("no encontrado"/"vencida"/"temporada iniciada") con CTA real.
  - `app/(app)/planes/page.tsx`: violación One Voice en la card Organizador
    (ribbon + badge + precio + borde, todo lima a la vez) → corregido.
- **Limpieza de color legacy transversal** (yo mismo, no vía agente):
  `CrearEquipoForm.tsx`, `EditarEquipoForm.tsx`, `InvitacionesRecibidas.tsx`,
  `app/(app)/equipo/editar/page.tsx`, `app/api/equipos/route.ts`,
  `app/api/invitaciones/route.ts` (email HTML). `CLAUDE.md` actualizado
  (info obsoleta sobre migraciones pendientes y colores removida).

## ✅ `animate` — COMPLETO (build verificado)

Las tres clases del "Motion system" de `app/globals.css` ya están aplicadas
según el plan que estaba escrito acá:

- `.kotc-king-claim` → `components/desafios/DesafioCard.tsx`, bloque de estado
  completado, condicionado a un `justResolved` nuevo: solo anima cuando la
  victoria se confirmó en esta sesión (`handleConfirmar` / `handleAceptarOriginal`),
  no cuando la card carga ya completada desde el server.
- `.kotc-confirm-in` → `Desafiar1v1Button.tsx` (paso `enviado`) y
  `AgregarCanchaModal.tsx` (bloque "+80 XP ganados").
- `.kotc-btn-press` → dashboard ("⚔️ Desafiar cancha"), mapa ("⚡ Conquistar
  cancha" y "⚔️ Desafiar al Rey"), `DesafiosClientWrapper` (ambos "+ Nuevo
  desafío"), `Desafiar1v1Button` ("Enviar desafío" e idle).

Un cambio no previsto en el plan: `.kotc-btn-press` pasó a usar las propiedades
individuales `scale`/`translate` en vez de `transform`, porque Tailwind v4
compila `scale-*`/`translate-*` a esas propiedades y la versión original
rompía el hover de los botones del mapa (su `transition-all` quedaba pisado).
Ahora la clase transporta todo el vocabulario de hover y reemplaza a
`transition-all` en esos botones, en vez de competir con él.

## ✅ `overdrive` — las 3 direcciones hechas

El gate obligatorio del skill (`AskUserQuestion` con 2-3 direcciones) se corrió.
Direcciones propuestas: (A) clímax al confirmar resultado, (B) mapa a 60fps con
cientos de canchas, (C) morph del pin al panel. **El usuario eligió hacerlas de
a una, empezando por la del mapa.**

### ✅ B — Mapa a 60fps (hecho)

- `lib/mapa/clustering.ts` — clustering en grilla, puro y sin dependencias de
  Google Maps. La grilla está anclada al mundo, no al viewport: al panear la
  pertenencia a la celda no cambia (los clusters no parpadean), solo se
  reagrupa al hacer zoom. Cubierto por `lib/mapa/clustering.test.ts` (5 tests).
- `components/mapa/canchasOverlay.ts` — capa `OverlayView` que dibuja todas las
  canchas en un solo canvas 2D, reemplazando un `google.maps.Marker` por cancha.
  Pines con la misma geometría que el SVG anterior, clusters como dona segmentada
  por estado (cuánto hay libre / tuyo / rival de un vistazo). Colores leídos de
  las CSS variables, no hex duplicados en JS. Animación de entrada con stagger,
  apagada bajo `prefers-reduced-motion`. `dibujarPin` / `dibujarCluster` están
  exportadas como funciones puras para poder verificarlas fuera del mapa.
- `components/mapa/MapaGoogle.tsx` — usa la capa; nuevo prop `selectedId`
  (viene de `MapaClientWrapper` → `MapaTerritorial`) para resaltar en el mapa la
  cancha abierta en el panel. El canvas tiene `pointer-events: none` y el
  hit-test va sobre los eventos del mapa, así los gestos de pan/pinch siguen
  siendo del mapa. En modo agregar los pines no responden.
- Click en un cluster: `fitBounds` de sus miembros, no un salto de zoom fijo.

**Verificación:** build limpio, `tsc` limpio, 36 tests unitarios pasando, y
captura con Playwright del pintado real de pines y clusters (se corrigió el
halo del pin seleccionado: era un disco traslúcido que se veía como mancha,
ahora es un anillo). **No se pudo verificar la integración con el mapa real**
porque la API key de Google devuelve `BillingNotEnabledMapError` en este
entorno — ver "Hallazgos" abajo.

### ✅ A — Clímax al confirmar resultado (hecho)

- **Optimista con rollback.** `DesafioCard.resolver()` unifica `confirmar` y
  `aceptar_original`: la card salta al desenlace antes de que responda el
  server y vuelve al estado anterior, con el error visible, si el server
  rechaza. Mismo tratamiento en `Desafios1v1Section.handleConfirmar` — ahí
  además se arregló un fallo silencioso: si el PATCH fallaba, el botón
  simplemente no hacía nada y no se mostraba ningún error.
- **Coreografía.** `--kotc-stagger` (nuevo, en `app/globals.css`) da
  `animation-delay` a `.kotc-confirm-in` y `.kotc-king-claim`, así un mismo
  momento se puede escalonar sin duplicar keyframes: desenlace (0ms) → XP
  (180ms) → corona (420ms). El bloque de `prefers-reduced-motion` ahora también
  anula el delay, si no una pieza escalonada quedaba invisible durante su
  espera por el `animation-fill-mode: both`.
- **`components/ui/CountUp.tsx`** — el XP sube hasta su valor. Renderiza el
  número final desde el primer frame y recién después baja a 0 para animar: si
  el efecto no corre (reduced-motion, sin JS, un error), lo que queda es el
  número correcto y no un 0 congelado. Es rAF, no Web Animations API como decía
  la propuesta: WAAPI no anima contenido de texto, y la vía `@property` +
  `counter()` degrada a "0" cuando no hay soporte.
- **Nada de recompensas inventadas.** Los dos endpoints ahora devuelven lo que
  realmente aplicaron: `xp` (constantes extraídas, antes repetidas literales en
  dos ramas de `resultados`) y `king_equipo_id` / `king_jugador_id`
  aprovechando el King que ya calculaban. La corona solo aparece si el server
  dice que la cancha quedó tuya. `resultados-1v1` devuelve además
  `cancha_nombre` para poder nombrarla.
- **Jerarquía.** Cuando el rival ya propuso un resultado, "Proponer resultado"
  (lima sólido) competía con "✓ Confirmar", que es la acción real del momento.
  Ahora es "Proponer otro" en la nueva variante `neutral` de `SoftButton`.

**Verificación:** build limpio, `tsc` limpio, 36 tests, y recorrido real con
Playwright interceptando la red (respuesta con 700ms de latencia): estado
optimista a los 250ms, XP contando a mitad de camino, secuencia completa, y el
camino de fallo volviendo atrás con el error a la vista. Los dos flujos,
equipo y 1v1.

### ✅ C — Morph del pin al panel (hecho)

La reevaluación cambió el diagnóstico: el bloqueo era necesitar marcadores DOM
(`AdvancedMarkerElement` + Map ID de Google Cloud). Con los pines en canvas eso
ya no aplica — alcanza con un **elemento puente**: al tocar un pin se pinta un
recuadro chico sobre él y una View Transition lo convierte en el panel. Sin Map
ID, sin marcadores DOM, sin dependencias nuevas.

- `canchasOverlay.ts` reporta el origen del pin (`OrigenPin`, centro en píxeles
  del contenedor) junto con la cancha; `MapaGoogle` y `MapaTerritorial` lo pasan.
- `MapaClientWrapper.seleccionarDesdeMapa()` decide: sin soporte de View
  Transitions o con `prefers-reduced-motion`, el panel abre directo. Con panel
  ya abierto no hay puente — el panel se transforma en sí mismo con el contenido
  de la otra cancha. El puente se pinta un frame antes de arrancar la
  transición (por eso arranca en un `useEffect`, no en el handler).
- CSS en `app/globals.css`, bajo "Morph pin → panel".

**Tres correcciones que salieron de mirarlo, no de escribirlo:**
1. El puente era un círculo del color del estado (como el pin). La foto del
   elemento viejo se estira hasta el tamaño del panel, así que un círculo lleno
   daba un manchón de color enorme. Ahora es un recuadro oscuro con borde de
   color: se estira como lo que va a ser.
2. La curva del sistema (`0.16,1,0.3,1`) llega al 75% en el primer 20% del
   tiempo — acá convertía el recorrido en una aparición. El grupo usa
   `cubic-bezier(0.32,0.72,0,1)` a 320ms; el trayecto se ve.
3. `::view-transition-old/new(root)` con `animation: none`: sin eso el
   documento entero hace un cross-fade inútil sobre las tiles del mapa.

**Verificación:** build limpio, `tsc` limpio, 36 tests, y captura cuadro a cuadro
con Playwright del mecanismo real (mismas clases, mismo patrón de estado) a los
40/90/160/250ms. **No se pudo verificar sobre el mapa real** — sigue el
`BillingNotEnabledMapError`. Lo que queda sin comprobar en vivo es la aritmética
de coordenadas del pin (`item.x - PAD`, `item.y - PIN_CY - PAD`); si el panel
sale de un punto corrido, eso es lo que hay que mirar.

## 🔎 Hallazgos fuera del pase de diseño (no tocados)

- **`BillingNotEnabledMapError`** — con la key de `.env.local`, Google Maps no
  carga (billing deshabilitado en el proyecto de Google Cloud). Si pasa también
  en el browser del usuario, el mapa está caído en dev, no es un problema del
  código nuevo.
- **`proxy.ts` no protegía nada — ARREGLADO.** `publicPaths` incluía `'/'` y el
  check era `pathname.startsWith(p)`; `startsWith('/')` es verdadero para toda
  ruta, así que el redirect a `/login` era código muerto. Ahora hay dos listas:
  `PUBLICAS_EXACTAS` (`/`, `/planes`, `/login`, `/register`, `/onboarding`) y
  `PUBLICAS_PREFIJO` (`/auth/`, `/join/`). Todo lo demás pide sesión.
  Dos decisiones que vale la pena recordar:
  - Las rutas `/api/*` no se redirigen: cada handler ya responde 401 en JSON, y
    un redirect le devolvería HTML a un `fetch()`.
  - Los dos CTA de la landing apuntaban a `/ranking`, que ahora pide sesión;
    pasaron a `/login?next=/ranking` para no chocar contra una pared (el
    parámetro `next` ya funcionaba de punta a punta).
  - `GET /api/canchas` sigue siendo público por decisión del propio handler
    (no valida sesión). Es de solo lectura y pasa por RLS, pero conviene saberlo.

## 🧹 Pendientes menores (sin cambios)

- `components/mapa/MapaLeaflet.tsx` sigue siendo código muerto con colores
  viejos — ahora más desincronizado todavía. Candidato a borrar (decisión del
  usuario; también arrastra `leaflet` y `react-leaflet` en `package.json`).
- Gap de `TablaLiga`/`miEquipoId` y empty state de `BracketView`: siguen
  necesitando cambios de query, fuera de alcance de un pase de diseño.

## Qué queda

El pase de los 9 comandos está completo. Lo único que sigue abierto es lo de
"Pendientes menores" y los dos hallazgos de infra (billing de Google Maps, y
`GET /api/canchas` público). Este archivo se puede borrar cuando esos ítems
estén resueltos o anotados en otro lado.
