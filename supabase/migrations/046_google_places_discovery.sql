-- Migration 046: descubrimiento de canchas vía Google Places
--
-- Google se usa como fuente de DESCUBRIMIENTO, no como espejo: lo único que se
-- guarda de forma permanente como referencia externa es el place id (el ToS de
-- Google permite almacenarlo indefinidamente, a diferencia del resto de campos).
-- El nombre, la dirección y las coordenadas entran como propuesta y pasan a ser
-- dato de KOC recién cuando un admin revisa la cancha.
--
-- Convive con el import de OpenStreetMap (migración 044): una cancha puede tener
-- osm_id, google_place_id, ambos o ninguno (alta manual de un jugador).

-- ── Referencia externa a Google ─────────────────────────────────────────────
ALTER TABLE canchas
  ADD COLUMN IF NOT EXISTS google_place_id text NULL;

-- Índice único NO parcial, a diferencia de canchas_osm_unique (migración 044).
-- En Postgres los NULL son distintos entre sí dentro de un índice único, así que
-- esto ya permite infinitas canchas sin place id (las creadas a mano) y a la vez
-- garantiza que un place id no se repita. Tiene que ser no parcial porque
-- `ON CONFLICT (google_place_id)` no puede inferir un índice parcial, y el
-- upsert es lo que resuelve las race conditions entre dos importaciones
-- simultáneas.
CREATE UNIQUE INDEX IF NOT EXISTS canchas_google_place_unique
  ON canchas (google_place_id);

-- ── Moderación ──────────────────────────────────────────────────────────────
-- `validada` (migración 001) ya era el booleano de verificación; no se crea una
-- columna nueva al lado. `status` agrega el ciclo de vida que le faltaba.
--
-- DEFAULT 'verified': las canchas que ya están en la DB fueron creadas por
-- jugadores o por el import de OSM y hoy son visibles en el mapa. Poner
-- 'pending' por defecto las escondería a todas de golpe. El descubrimiento por
-- Google inserta 'pending' de forma explícita.
ALTER TABLE canchas
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'verified'
    CHECK (status IN ('pending', 'verified', 'rejected', 'closed'));

CREATE INDEX IF NOT EXISTS canchas_status_idx ON canchas (status);

COMMENT ON COLUMN canchas.google_place_id IS
  'Place ID de Google Places. Única referencia externa que se conserva; el resto de los datos son de KOC.';
COMMENT ON COLUMN canchas.status IS
  'pending: descubierta, esperando revisión · verified: aprobada · rejected: descartada por un admin · closed: ya no existe';

-- ── Historial de ejecuciones de descubrimiento ──────────────────────────────
-- Sirve para auditoría y, además, para limitar la frecuencia de importaciones
-- sin depender de un rate limiter en memoria (que no sobrevive a un redeploy).
CREATE TABLE IF NOT EXISTS cancha_discovery_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejecutado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zona         text        NULL,          -- etiqueta libre: "Viña del Mar", "Centro", …
  lat          double precision NOT NULL,
  lng          double precision NOT NULL,
  radio_m      integer     NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz NULL,
  found        integer     NOT NULL DEFAULT 0,
  created      integer     NOT NULL DEFAULT 0,
  duplicated   integer     NOT NULL DEFAULT 0,
  errors       integer     NOT NULL DEFAULT 0,
  error_detail text        NULL
);

CREATE INDEX IF NOT EXISTS cancha_discovery_runs_started_idx
  ON cancha_discovery_runs (started_at DESC);

ALTER TABLE cancha_discovery_runs ENABLE ROW LEVEL SECURITY;

-- RLS permisiva + guard en la capa de API: mismo criterio que la migración 027
-- para lo administrativo. El admin se identifica por ADMIN_EMAIL, que es una
-- env var del server y no algo que Postgres pueda comprobar desde una policy.
CREATE POLICY "discovery runs lectura" ON cancha_discovery_runs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "discovery runs insert" ON cancha_discovery_runs
  FOR INSERT WITH CHECK (auth.uid() = ejecutado_por);

CREATE POLICY "discovery runs update" ON cancha_discovery_runs
  FOR UPDATE USING (auth.uid() = ejecutado_por);
