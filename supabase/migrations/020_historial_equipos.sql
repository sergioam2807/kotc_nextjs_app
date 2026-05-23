-- 020: Historial de equipos por jugador
-- Usa triggers para registrar automáticamente entradas y salidas de equipo_miembros.
-- equipo_nombre/color son desnormalizados para preservar historia si el equipo es eliminado.

CREATE TABLE IF NOT EXISTS historial_equipos (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  jugador_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipo_id     uuid        REFERENCES equipos(id) ON DELETE SET NULL,
  equipo_nombre text        NOT NULL,
  equipo_color  text,
  deporte       text,
  ciudad        text,
  rol           text,
  posicion      text,
  fecha_ingreso timestamptz NOT NULL DEFAULT now(),
  fecha_salida  timestamptz
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_historial_jugador ON historial_equipos (jugador_id, fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_historial_equipo  ON historial_equipos (equipo_id);

-- RLS
ALTER TABLE historial_equipos ENABLE ROW LEVEL SECURITY;

-- Cualquiera autenticado puede leer el historial (perfiles son públicos)
CREATE POLICY "historial_select_authenticated" ON historial_equipos
  FOR SELECT USING (auth.role() = 'authenticated');

-- Solo funciones SECURITY DEFINER pueden insertar/actualizar (via triggers)

-- ---------------------------------------------------------------------------
-- Trigger: INSERT en equipo_miembros → registra ingreso
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _trg_equipo_miembro_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_nombre text;
  v_color  text;
  v_ciudad text;
BEGIN
  SELECT nombre, color, ciudad
    INTO v_nombre, v_color, v_ciudad
    FROM equipos
   WHERE id = NEW.equipo_id;

  INSERT INTO historial_equipos (
    jugador_id, equipo_id, equipo_nombre, equipo_color,
    deporte, ciudad, rol, posicion, fecha_ingreso
  ) VALUES (
    NEW.jugador_id,
    NEW.equipo_id,
    COALESCE(v_nombre, 'Equipo desconocido'),
    v_color,
    NEW.deporte,
    v_ciudad,
    NEW.rol,
    NEW.posicion,
    now()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_equipo_miembro_insert
  AFTER INSERT ON equipo_miembros
  FOR EACH ROW EXECUTE FUNCTION _trg_equipo_miembro_insert();

-- ---------------------------------------------------------------------------
-- Trigger: DELETE en equipo_miembros → registra fecha de salida
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _trg_equipo_miembro_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE historial_equipos
     SET fecha_salida = now()
   WHERE jugador_id  = OLD.jugador_id
     AND equipo_id   = OLD.equipo_id
     AND fecha_salida IS NULL;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_equipo_miembro_delete
  AFTER DELETE ON equipo_miembros
  FOR EACH ROW EXECUTE FUNCTION _trg_equipo_miembro_delete();

-- ---------------------------------------------------------------------------
-- Backfill: registrar miembros ya existentes con fecha_ingreso = joined_at
-- ---------------------------------------------------------------------------
INSERT INTO historial_equipos (
  jugador_id, equipo_id, equipo_nombre, equipo_color,
  deporte, ciudad, rol, posicion, fecha_ingreso
)
SELECT
  em.jugador_id,
  em.equipo_id,
  COALESCE(e.nombre, 'Equipo desconocido'),
  e.color,
  COALESCE(em.deporte, e.deporte),
  e.ciudad,
  em.rol,
  em.posicion,
  COALESCE(em.joined_at, now())
FROM equipo_miembros em
JOIN equipos e ON e.id = em.equipo_id
ON CONFLICT DO NOTHING;
