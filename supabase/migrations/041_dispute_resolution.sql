-- Migration 041: Dispute resolution
-- Adds disputa_at timestamp to resultados and 'cancelado' state to desafios.

-- 1. Track when a dispute was raised (needed for 5-day auto-cancel timeout)
ALTER TABLE resultados
  ADD COLUMN IF NOT EXISTS disputa_at timestamptz NULL;

-- 2. Add 'cancelado' as a valid estado for desafios
--    We must drop the old CHECK constraint and recreate it with the new value.
--    The constraint may be named differently across environments, so we drop by
--    a known candidate name first, then a generic approach via pg_constraint.
DO $$
DECLARE
  _con text;
BEGIN
  SELECT conname INTO _con
  FROM pg_constraint
  WHERE conrelid = 'desafios'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%resultado_pendiente%'
  LIMIT 1;

  IF _con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE desafios DROP CONSTRAINT %I', _con);
  END IF;
END
$$;

ALTER TABLE desafios
  ADD CONSTRAINT desafios_estado_valid
  CHECK (estado IN (
    'pendiente',
    'aceptado',
    'rechazado',
    'jugado',
    'resultado_pendiente',
    'disputado',
    'completado',
    'cancelado'
  ));
