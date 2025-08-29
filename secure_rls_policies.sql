-- secure_rls_policies.sql
-- This script updates the Row Level Security policies for all tables to be secure.

-- Helper function to get negocio_id from user's metadata
CREATE OR REPLACE FUNCTION auth.get_negocio_id()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt()->'user_metadata'->>'negocio_id';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================
-- Table: turnos
-- =============================
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS turnos_select ON public.turnos;
CREATE POLICY turnos_select ON public.turnos
  FOR SELECT USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS turnos_insert ON public.turnos;
CREATE POLICY turnos_insert ON public.turnos
  FOR INSERT WITH CHECK (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS turnos_update ON public.turnos;
CREATE POLICY turnos_update ON public.turnos
  FOR UPDATE USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS turnos_delete ON public.turnos;
CREATE POLICY turnos_delete ON public.turnos
  FOR DELETE USING (negocio_id = auth.get_negocio_id());

-- =============================
-- Table: servicios
-- =============================
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS servicios_select ON public.servicios;
CREATE POLICY servicios_select ON public.servicios
  FOR SELECT USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS servicios_insert ON public.servicios;
CREATE POLICY servicios_insert ON public.servicios
  FOR INSERT WITH CHECK (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS servicios_update ON public.servicios;
CREATE POLICY servicios_update ON public.servicios
  FOR UPDATE USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS servicios_delete ON public.servicios;
CREATE POLICY servicios_delete ON public.servicios
  FOR DELETE USING (negocio_id = auth.get_negocio_id());


-- =============================
-- Table: cierres_caja
-- =============================
ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cierres_select ON public.cierres_caja;
CREATE POLICY cierres_select ON public.cierres_caja
  FOR SELECT USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS cierres_insert ON public.cierres_caja;
CREATE POLICY cierres_insert ON public.cierres_caja
  FOR INSERT WITH CHECK (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS cierres_update ON public.cierres_caja;
CREATE POLICY cierres_update ON public.cierres_caja
  FOR UPDATE USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS cierres_delete ON public.cierres_caja;
CREATE POLICY cierres_delete ON public.cierres_caja
  FOR DELETE USING (negocio_id = auth.get_negocio_id());


-- =============================
-- Table: configuracion_negocio
-- =============================
ALTER TABLE public.configuracion_negocio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for configuracion_negocio" ON public.configuracion_negocio;

DROP POLICY IF EXISTS configuracion_negocio_select ON public.configuracion_negocio;
CREATE POLICY configuracion_negocio_select ON public.configuracion_negocio
  FOR SELECT USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS configuracion_negocio_insert ON public.configuracion_negocio;
CREATE POLICY configuracion_negocio_insert ON public.configuracion_negocio
  FOR INSERT WITH CHECK (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS configuracion_negocio_update ON public.configuracion_negocio;
CREATE POLICY configuracion_negocio_update ON public.configuracion_negocio
  FOR UPDATE USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS configuracion_negocio_delete ON public.configuracion_negocio;
CREATE POLICY configuracion_negocio_delete ON public.configuracion_negocio
  FOR DELETE USING (negocio_id = auth.get_negocio_id());


-- =============================
-- Table: estado_negocio
-- =============================
ALTER TABLE public.estado_negocio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estado_negocio_select ON public.estado_negocio;
CREATE POLICY estado_negocio_select ON public.estado_negocio
  FOR SELECT USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS estado_negocio_insert ON public.estado_negocio;
CREATE POLICY estado_negocio_insert ON public.estado_negocio
  FOR INSERT WITH CHECK (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS estado_negocio_update ON public.estado_negocio;
CREATE POLICY estado_negocio_update ON public.estado_negocio
  FOR UPDATE USING (negocio_id = auth.get_negocio_id());

DROP POLICY IF EXISTS estado_negocio_delete ON public.estado_negocio;
CREATE POLICY estado_negocio_delete ON public.estado_negocio
  FOR DELETE USING (negocio_id = auth.get_negocio_id());
