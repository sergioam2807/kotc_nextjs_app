-- 018: Player profile enrichment fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS posicion_principal text,
  ADD COLUMN IF NOT EXISTS posiciones_adicionales text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS especialidades text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS altura_cm integer,
  ADD COLUMN IF NOT EXISTS peso_kg integer,
  ADD COLUMN IF NOT EXISTS mano_habil text DEFAULT 'derecha'
    CHECK (mano_habil IN ('derecha', 'izquierda', 'ambas')),
  ADD COLUMN IF NOT EXISTS anos_experiencia integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disponible_reclutamiento boolean DEFAULT false;
