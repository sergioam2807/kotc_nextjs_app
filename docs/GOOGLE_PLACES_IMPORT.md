# Descubrimiento de canchas con Google Places

Google se usa para **encontrar** canchas que KOC todavía no tiene. No para
copiarlas: lo que se publica en el mapa es lo que un admin aprueba, y los datos
de juego (King, desafíos, valoraciones, superficie, iluminación) son de KOC y
Google nunca los toca.

```
Google Places → descubrimiento → deduplicación → cancha PENDING
                                                      ↓ revisión del admin
                                                 cancha VERIFIED → aparece en el mapa
```

---

## 1. Configurar la API key

Hace falta una **segunda** key, distinta de la que ya usa el mapa del frontend.

| Variable | Dónde se usa | Restricción recomendada |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | mapa en el browser (ya existía) | HTTP referrers de tu dominio |
| `GOOGLE_MAPS_API_KEY` | **solo server**, este import | IP del server, o sin restricción de referrer |

No se puede reutilizar la primera: está restringida por referrer y las llamadas
salen del servidor, sin referrer. Y exponer una key con Places habilitado en el
browser es justamente lo que este diseño evita.

**Pasos en Google Cloud Console:**

1. [console.cloud.google.com](https://console.cloud.google.com) → seleccioná el proyecto.
2. **APIs y servicios → Biblioteca** → habilitá **Places API (New)**.
   Ojo: es la nueva, no la "Places API" legacy — este código usa el endpoint
   `places.googleapis.com/v1/places:searchNearby`.
3. **Credenciales → Crear credenciales → Clave de API**.
4. En la key nueva: **Restricciones de API** → limitá a *Places API (New)*.
   **Restricciones de aplicación** → "Direcciones IP" con la IP de salida de tu
   server (en Vercel, dejala sin restricción de referrer).
5. Facturación habilitada en el proyecto. Sin billing, Google responde
   `BillingNotEnabledMapError` y la importación falla con un 502.

En `.env.local`:

```
GOOGLE_MAPS_API_KEY=AIza...
```

Nunca con prefijo `NEXT_PUBLIC_`. Además, `lib/google/places.ts` importa
`server-only`: si alguien intenta usarlo desde un componente cliente, el build
falla en vez de filtrar la key.

---

## 2. Ejecutar una importación

1. Entrá con la cuenta de `ADMIN_EMAIL`.
2. **Panel Admin → Canchas** (`/admin/canchas`).
3. Elegí una zona predefinida o escribí latitud y longitud.
4. Radio en metros (mín. 50, máx. 50.000 — es el tope de Google).
5. **Buscar canchas**.

El resultado muestra cuatro números:

```
Encontradas: 37   ← lo que devolvió Google
Nuevas:      24   ← creadas como PENDING
Duplicadas:  13   ← ya estaban en KOC
Errores:      0
```

Google devuelve como máximo **20 resultados por llamada**. Para cubrir una ciudad
hay que hacer varias corridas con centros distintos; no hay (todavía) un job que
divida una ciudad en zonas automáticamente, y es a propósito: la importación es
una acción administrativa deliberada.

---

## 3. Cómo funciona la deduplicación

Tres capas, de más barata a más cara:

1. **Dentro de la respuesta de Google.** Puede repetir el mismo `place id`; se
   colapsa a uno.
2. **Contra los `google_place_id` ya guardados.** Es la dedup principal.
3. **Por cercanía (< 40 m).** Necesaria porque KOC ya tiene canchas importadas de
   **OpenStreetMap** (migración 044) que Google también conoce. Sin esta capa,
   la primera corrida duplicaría todas.

Cuando la capa 3 encuentra una cancha existente **sin** place id, le anota el
`google_place_id` y no toca nada más. No es sobrescribir: es agregarle la
referencia externa que le faltaba, para que la próxima corrida la descarte por id
(barato) en vez de por distancia.

A nivel base de datos hay un índice único sobre `canchas.google_place_id`, y el
insert usa `upsert ... ignoreDuplicates`. Si dos importaciones corren a la vez,
la segunda rebota en el índice y se cuenta como duplicada, no como error.

---

## 4. Qué se guarda y qué no

**De Google** (referencia y propuesta inicial):

| Campo | Nota |
|---|---|
| `google_place_id` | Única referencia externa permanente. El ToS de Google permite almacenar place IDs indefinidamente. |
| `nombre`, `direccion`, `lat`, `lng` | Entran como propuesta. Pasan a ser dato de KOC cuando el admin aprueba la cancha; son editables desde la app como cualquier otra cancha. |

**No se pide ni se guarda** nada más: ni fotos, ni horarios, ni reseñas, ni
rating de Google. El `FieldMask` de la llamada pide exactamente cuatro campos, y
nunca se llama a *Place Details*, que es el endpoint caro.

**De KOC** (Google no los toca nunca, ni en reimportaciones):

`status` · `validada` · `superficie` · `iluminacion` · `tipo_aro` · `es_publica`
· `precio_hora` · `valoracion_promedio` · dominio de canchas (King) · desafíos ·
partidos · temporadas.

Si una cancha ya tiene `iluminacion = true` y `tipo_aro = 'estandar'` y Google la
vuelve a devolver, esos valores quedan intactos: la importación solo crea filas
nuevas, nunca actualiza una existente (salvo anotar el place id faltante).

---

## 5. Estados

| Estado | Qué significa | ¿Se ve en el mapa? |
|---|---|---|
| `pending` | Descubierta, esperando revisión | No |
| `verified` | Aprobada por un admin | Sí |
| `rejected` | Descartada (no era una cancha, estaba mal ubicada…) | No |
| `closed` | Existía pero ya no | No |

Las canchas que ya estaban en la base antes de la migración 046 quedaron en
`verified`: se crearon por jugadores o por el import de OSM y ya eran visibles.

Rechazar **no borra la fila**: queda el registro de que esa cancha ya se revisó,
y su `google_place_id` sigue ocupado, así que no vuelve a proponerse en la
próxima corrida.

`validada` (columna que existe desde la migración 001) es el booleano de
verificación; `status` es el ciclo de vida. Aprobar pone las dos cosas.

---

## 6. Límites y costos

- **Frecuencia:** máximo 10 importaciones cada 10 minutos por admin. El límite se
  calcula sobre `cancha_discovery_runs`, así que sobrevive a un redeploy (un
  contador en memoria, no).
- **Campos:** solo `id`, `displayName`, `location`, `formattedAddress`. Pedir más
  sube el tier de precio de Nearby Search.
- **Sin Place Details.** El place id alcanza como referencia.
- **Sin scraping.** Solo la API oficial.
- **Timeout** de 10 s por llamada; si Google no responde, la corrida se marca con
  error en el historial y no deja nada a medias.

Cada corrida queda registrada en `cancha_discovery_runs` (zona, coordenadas,
radio, resultados) y las últimas 5 se ven en `/admin/canchas`.

---

## 7. Limitaciones conocidas

- **Google no tiene un tipo "cancha de basketball".** La búsqueda usa
  `sports_complex` y `park`, así que van a aparecer plazas y polideportivos que
  no son canchas. Por eso existe el paso PENDING: el filtro real es la revisión
  humana.
- **La RLS limita el UPDATE de `canchas` a quien la creó** (migración 045). Las
  canchas descubiertas quedan a nombre del admin que corrió la importación, así
  que aprobar y rechazar funciona. Una cancha dada de alta por un jugador no se
  puede moderar desde acá: la API devuelve 403 explicando por qué, en vez de un
  404 que mienta.
- **20 resultados por llamada.** Para cubrir una ciudad hacen falta varias
  corridas con centros distintos.
