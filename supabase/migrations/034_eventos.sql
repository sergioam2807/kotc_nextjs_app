-- Migration 034: Eventos especiales
-- El admin puede crear eventos que aparecen en el dashboard de todos los usuarios.
-- Tipos: torneo_express, bonus_xp, cancha_especial, nightball, king_challenge, reto_semanal, otro

CREATE TABLE IF NOT EXISTS eventos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL,
  descripcion text        NULL,
  tipo        text        NOT NULL
    CHECK (tipo IN ('torneo_express','bonus_xp','cancha_especial','nightball','king_challenge','reto_semanal','otro')),
  fecha_inicio timestamptz NOT NULL,
  fecha_fin    timestamptz NOT NULL,
  activo       boolean     NOT NULL DEFAULT true,
  color        text        NULL,    -- hex color, p.ej. '#a855f7'
  emoji        text        NULL,    -- ícono del evento
  premio       text        NULL,    -- descripción del premio / beneficio
  reglas       text        NULL,    -- reglas o condiciones del evento
  bonus_xp_mult numeric(4,2) NULL, -- multiplicador XP (ej: 2.0 = doble XP). NULL = sin bonus
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer eventos activos
CREATE POLICY "eventos_public_read" ON eventos
  FOR SELECT USING (true);

-- Solo admins crean/modifican/eliminan (guard en API layer, no en DB para no duplicar lógica)
CREATE POLICY "eventos_service_write" ON eventos
  FOR ALL USING (true);

-- Índice para buscar eventos vigentes
CREATE INDEX IF NOT EXISTS eventos_fechas_idx ON eventos (fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS eventos_activo_idx ON eventos (activo, fecha_fin DESC);
