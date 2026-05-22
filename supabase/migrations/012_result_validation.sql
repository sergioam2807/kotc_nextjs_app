-- Drop existing check constraint (may vary by name)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%estado%' AND conrelid = 'desafios'::regclass) THEN
    ALTER TABLE desafios DROP CONSTRAINT IF EXISTS desafios_estado_check;
  END IF;
END $$;

ALTER TABLE desafios
  ADD CONSTRAINT desafios_estado_check
  CHECK (estado IN ('pendiente', 'aceptado', 'rechazado', 'jugado', 'resultado_pendiente', 'disputado', 'completado'));

-- Add validation columns to resultados table
ALTER TABLE resultados
  ADD COLUMN IF NOT EXISTS propuesto_por UUID REFERENCES equipos(id),
  ADD COLUMN IF NOT EXISTS confirmado_por_perdedor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disputado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmado_at TIMESTAMPTZ;

-- RLS for resultados
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resultados_select_all" ON resultados;
CREATE POLICY "resultados_select_all" ON resultados FOR SELECT USING (true);

DROP POLICY IF EXISTS "resultados_insert_auth" ON resultados;
CREATE POLICY "resultados_insert_auth" ON resultados FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "resultados_update_auth" ON resultados;
CREATE POLICY "resultados_update_auth" ON resultados FOR UPDATE USING (auth.uid() IS NOT NULL);
