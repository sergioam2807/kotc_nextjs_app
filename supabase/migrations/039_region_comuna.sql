-- Migration 039: Añade región y comuna a canchas, equipos y profiles
-- Permite filtrar jugadores libres, equipos y canchas por ubicación geográfica.

-- profiles (jugadores)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region text NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS comuna text NULL;

-- equipos
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS region text NULL;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS comuna text NULL;

-- canchas
ALTER TABLE canchas ADD COLUMN IF NOT EXISTS region text NULL;
ALTER TABLE canchas ADD COLUMN IF NOT EXISTS comuna text NULL;

-- Índices para filtros de búsqueda eficientes
CREATE INDEX IF NOT EXISTS profiles_region_idx ON profiles (region)  WHERE region  IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_comuna_idx ON profiles (comuna)  WHERE comuna  IS NOT NULL;
CREATE INDEX IF NOT EXISTS equipos_region_idx  ON equipos  (region)  WHERE region  IS NOT NULL;
CREATE INDEX IF NOT EXISTS equipos_comuna_idx  ON equipos  (comuna)  WHERE comuna  IS NOT NULL;
CREATE INDEX IF NOT EXISTS canchas_region_idx  ON canchas  (region)  WHERE region  IS NOT NULL;
CREATE INDEX IF NOT EXISTS canchas_comuna_idx  ON canchas  (comuna)  WHERE comuna  IS NOT NULL;
