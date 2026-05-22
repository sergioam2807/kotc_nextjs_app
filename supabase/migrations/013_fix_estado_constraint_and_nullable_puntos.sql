-- ============================================================
-- Fix 1: Remove the stale "estado_valido" check constraint that
--        still blocks 'resultado_pendiente', 'disputado', 'completado'.
--        Migration 012 only dropped "desafios_estado_check" but the
--        constraint created in 010 was named "estado_valido", so it
--        was never dropped and continued to enforce the old 4-value enum.
-- ============================================================
ALTER TABLE desafios DROP CONSTRAINT IF EXISTS estado_valido;

-- Make sure the correct, broader constraint exists (012 should have
-- added it, but drop-and-recreate to be safe).
ALTER TABLE desafios DROP CONSTRAINT IF EXISTS desafios_estado_check;
ALTER TABLE desafios
  ADD CONSTRAINT desafios_estado_check
  CHECK (estado IN ('pendiente', 'aceptado', 'rechazado', 'jugado',
                    'resultado_pendiente', 'disputado', 'completado'));

-- ============================================================
-- Fix 2: puntos_retador / puntos_retado were created NOT NULL in
--        001_initial.sql and never relaxed.  Scores are optional
--        when proposing a result, so make them nullable.
-- ============================================================
ALTER TABLE resultados
  ALTER COLUMN puntos_retador DROP NOT NULL,
  ALTER COLUMN puntos_retado  DROP NOT NULL;
