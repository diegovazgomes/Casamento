-- ============================================================
-- Migration 009 — Evolução de guest_views para analytics
-- Objetivo: adicionar colunas de página, sessão e duração
-- Uso: aplicar em projetos que já possuem a tabela public.guest_views
-- ============================================================

ALTER TABLE public.guest_views
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS page_path TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS referrer_page TEXT;

CREATE INDEX IF NOT EXISTS idx_views_page_path
  ON public.guest_views USING btree (page_path);

CREATE INDEX IF NOT EXISTS idx_views_session_id
  ON public.guest_views USING btree (session_id);
