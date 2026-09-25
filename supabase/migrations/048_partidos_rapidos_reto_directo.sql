-- Migration 048: Partido Rápido — reto directo (con aceptación) en vez de
-- solo matchmaking a ciegas.
--
-- Motivo: el matching ciego (047) solo empareja si otro capitán está
-- buscando en la MISMA cancha en la MISMA ventana de tiempo, y además el
-- fallback automático contra el Rey de la cancha lo comprometía a un
-- partido sin que hubiera aceptado nada. Se agrega un camino de reto
-- directo (a un jugador específico o al Rey) que pasa por 'pendiente' hasta
-- que el retado acepta — mismo patrón que ya usan los desafíos de equipo y
-- 1v1 en el resto de la app. El matching ciego (mutuo opt-in) se mantiene
-- para quienes elijan "buscar automáticamente".
--
-- 'rechazado' se agrega para el reto directo rechazado por el retado.

-- Busca el nombre real de la constraint (no se asume el nombre
-- auto-generado por Postgres) y la reemplaza por la versión con 'pendiente'
-- y 'rechazado' agregados.
DO $$
DECLARE
  nombre_constraint text;
BEGIN
  SELECT con.conname INTO nombre_constraint
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
  WHERE con.conrelid = 'partidos_rapidos'::regclass
    AND con.contype = 'c'
    AND att.attname = 'estado';

  IF nombre_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE partidos_rapidos DROP CONSTRAINT %I', nombre_constraint);
  END IF;
END $$;

ALTER TABLE partidos_rapidos ADD CONSTRAINT partidos_rapidos_estado_check
  CHECK (estado IN ('pendiente','buscando','emparejado','resultado_pendiente','disputado','completado','cancelado','rechazado'));

-- ────────────────────────────────────────────────────────────────────────────
-- Fix de concurrencia en emparejar_partido_rapido() (047), dos partes:
--
-- 1. El SELECT de la fila propia (v_propio) no tomaba lock (`FOR UPDATE`).
--    Con 3+ búsquedas "buscando" en la misma cancha a la vez, eso permite que
--    OTRA llamada concurrente elija la fila propia como candidata rival y la
--    deje 'emparejado' MIENTRAS la propia transacción, en paralelo, también
--    consigue emparejarse con una tercera fila — dejando a un mismo capitán
--    "emparejado" en dos partidos distintos a la vez (double-booking). Se
--    agrega `FOR UPDATE` al SELECT propio: así, cualquier otra transacción
--    que intente tomar esa fila como candidata (con SKIP LOCKED) la salta
--    mientras siga en curso, en vez de arriesgarse a la carrera.
-- 2. El paso final que cancela la fila propia no tenía guard de estado — si
--    igual llegaba a pisar una fila que otra transacción ya había dejado
--    'emparejado' (before fix #1), la volvía a 'cancelado' y perdía ese
--    partido. Se agrega `AND estado = 'buscando'` para que cancelar sea un
--    no-op si alguien más ya la reclamó primero.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION emparejar_partido_rapido(p_partido_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_propio   partidos_rapidos%ROWTYPE;
  v_rival_id uuid;
BEGIN
  SELECT * INTO v_propio FROM partidos_rapidos WHERE id = p_partido_id FOR UPDATE;
  IF NOT FOUND OR v_propio.estado <> 'buscando' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_rival_id
  FROM partidos_rapidos
  WHERE cancha_id = v_propio.cancha_id
    AND formato = v_propio.formato
    AND estado = 'buscando'
    AND id <> v_propio.id
    AND capitan_a_id <> v_propio.capitan_a_id
    AND created_at > now() - interval '4 hours'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_rival_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE partidos_rapidos
  SET capitan_b_id = v_propio.capitan_a_id,
      estado = 'emparejado',
      matched_at = now()
  WHERE id = v_rival_id
    AND estado = 'buscando';

  -- No-op si otra llamada concurrente ya reclamó esta fila como SU rival
  -- (ver comentario arriba) — no pisar ese emparejamiento.
  UPDATE partidos_rapidos
  SET estado = 'cancelado'
  WHERE id = v_propio.id
    AND estado = 'buscando';

  RETURN v_rival_id;
END;
$$;
