-- ============================================================
-- Migration 010 - Minimizacao de guest_views para analytics agregado
-- Objetivo: remover colunas excessivas e manter apenas o necessario
-- para audiencia agregada por evento/pagina
-- ============================================================

DROP INDEX IF EXISTS public.idx_views_session_id;

ALTER TABLE public.guest_views
  DROP COLUMN IF EXISTS left_at,
  DROP COLUMN IF EXISTS user_agent,
  DROP COLUMN IF EXISTS viewport_width,
  DROP COLUMN IF EXISTS viewport_height,
  DROP COLUMN IF EXISTS country_code,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS session_id,
  DROP COLUMN IF EXISTS referrer_page;

CREATE INDEX IF NOT EXISTS idx_views_token_id
  ON public.guest_views USING btree (token_id);

CREATE INDEX IF NOT EXISTS idx_views_event_id
  ON public.guest_views USING btree (event_id);

CREATE INDEX IF NOT EXISTS idx_views_opened_at
  ON public.guest_views USING btree (opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_views_page_path
  ON public.guest_views USING btree (page_path);
