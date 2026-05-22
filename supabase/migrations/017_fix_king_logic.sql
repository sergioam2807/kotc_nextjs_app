-- ============================================================
-- KOTC — Migración 017: corregir lógica de King por cancha
--
-- Regla: 1 solo King por cancha = equipo con más victorias (≥1).
-- Desempate: menos derrotas.
-- ============================================================

-- 1. Primero, quitar es_king de todos (partimos de cero)
UPDATE cancha_dominio
SET es_king = false;

-- 2. Asignar es_king = true al equipo con más victorias por cancha
--    (desempate: menos derrotas). Solo equipos con ≥1 victoria.
WITH ranking AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY cancha_id
      ORDER BY victorias DESC, derrotas ASC
    ) AS rn
  FROM cancha_dominio
  WHERE victorias > 0
)
UPDATE cancha_dominio cd
SET    es_king = true
FROM   ranking r
WHERE  cd.id = r.id
  AND  r.rn = 1;
