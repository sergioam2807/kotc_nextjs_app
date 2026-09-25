-- Migration 049: fix RLS que bloqueaba unirse a un trío ajeno ("join_partido_id")
--
-- Bug: la policy UPDATE de partidos_rapidos (047) solo permitía tocar filas
-- donde auth.uid() ya fuera capitan_a_id o capitan_b_id. Pero "unirse a un
-- trío que está buscando" (app/api/partidos-rapidos/route.ts → unirseATrio)
-- es exactamente el caso en el que el usuario TODAVÍA no es ninguno de los
-- dos capitanes — va a convertirse en capitan_b_id recién con ese UPDATE. La
-- policy filtraba la fila (0 filas afectadas) y el código interpretaba eso
-- como "alguien más se unió primero" (409), incluso en el primer intento.
--
-- Fix: se agrega una tercera condición — cualquier usuario autenticado puede
-- tocar una fila en 'buscando' sin capitan_b_id asignado (el propio UPDATE
-- de la API, acotado por columnas y por el `.eq('estado','buscando')` en la
-- query, es la única vía real: capitan_b_id, estado, matched_at). Tras el
-- UPDATE la nueva fila ya satisface `auth.uid() = capitan_b_id`, así que
-- pasa el WITH CHECK implícito (mismo USING) sin cambios adicionales.
DROP POLICY IF EXISTS "partidos_rapidos_update" ON partidos_rapidos;
CREATE POLICY "partidos_rapidos_update" ON partidos_rapidos
  FOR UPDATE USING (
    auth.uid() = capitan_a_id
    OR auth.uid() = capitan_b_id
    OR (estado = 'buscando' AND capitan_b_id IS NULL)
  );
