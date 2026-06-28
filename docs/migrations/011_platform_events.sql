-- ============================================================
-- Migration 011 - Analytics da plataforma
-- Objetivo: medir landing page e funil comercial sem usar pixels externos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_events IS
  'Eventos agregados da plataforma Devazi: landing, cadastro, checkout e uso operacional.';

CREATE INDEX IF NOT EXISTS platform_events_event_name_idx
  ON public.platform_events(event_name);

CREATE INDEX IF NOT EXISTS platform_events_created_at_idx
  ON public.platform_events(created_at DESC);

CREATE INDEX IF NOT EXISTS platform_events_session_id_idx
  ON public.platform_events(session_id);

CREATE INDEX IF NOT EXISTS platform_events_utm_source_idx
  ON public.platform_events(utm_source);

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_events_service_role_all" ON public.platform_events;

CREATE POLICY "platform_events_service_role_all"
  ON public.platform_events FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
