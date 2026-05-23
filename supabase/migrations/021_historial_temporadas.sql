-- 021: Vincular historial_equipos con temporadas
-- Agrega temporada_id y temporada_nombre (desnormalizado) a historial_equipos.
-- Reemplaza el trigger de INSERT para capturar la temporada activa al momento de unirse.
-- Hace backfill de los registros existentes tomando la temporada de equipo_miembros.

-- 1. Nuevas columnas
ALTER TABLE historial_equipos
  ADD COLUMN IF NOT EXISTS temporada_id     uuid REFERENCES temporadas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS temporada_nombre text;

CREATE INDEX IF NOT EXISTS idx_historial_temporada ON historial_equipos (temporada_id);

-- 2. Reemplazar función del trigger INSERT para capturar temporada
CREATE OR REPLACE FUNCTION _trg_equipo_miembro_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_equipo         record;
  v_temporada_nombre text;
BEGIN
  -- Datos del equipo (desnormalizados para durabilidad)
  SELECT nombre, color, ciudad
    INTO v_equipo
    FROM equipos
   WHERE id = NEW.equipo_id;

  -- Nombre de la temporada si existe
  IF NEW.temporada_id IS NOT NULL THEN
    SELECT nombre
      INTO v_temporada_nombre
      FROM temporadas
     WHERE id = NEW.temporada_id;
  END IF;

  INSERT INTO historial_equipos (
    jugador_id,  equipo_id,   equipo_nombre,                     equipo_color,
    deporte,     ciudad,      rol,                               posicion,
    fecha_ingreso,
    temporada_id, temporada_nombre
  ) VALUES (
    NEW.jugador_id,
    NEW.equipo_id,
    COALESCE(v_equipo.nombre, 'Equipo desconocido'),
    v_equipo.color,
    NEW.deporte,
    v_equipo.ciudad,
    NEW.rol,
    NEW.posicion,
    now(),
    NEW.temporada_id,
    v_temporada_nombre
  );

  RETURN NEW;
END;
$$;

-- El trigger trg_equipo_miembro_insert ya existe; la función es REPLACE, no hace falta recrearlo.

-- 3. Backfill: poblar temporada en los registros ya existentes (miembros actuales)
UPDATE historial_equipos h
   SET temporada_id     = em.temporada_id,
       temporada_nombre = t.nombre
  FROM equipo_miembros em
  LEFT JOIN temporadas t ON t.id = em.temporada_id
 WHERE h.jugador_id   = em.jugador_id
   AND h.equipo_id    = em.equipo_id
   AND h.fecha_salida IS NULL           -- solo miembros aún activos
   AND em.temporada_id IS NOT NULL      -- solo si tienen temporada asignada
   AND h.temporada_id IS NULL;          -- evitar sobreescribir si ya estaba lleno
