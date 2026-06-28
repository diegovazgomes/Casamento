-- ============================================================
-- Migration 006 — Bloqueio read-only (legado por slug)
-- Objetivo: travar o evento demo seedado originalmente por slug.
-- Observação: a estratégia robusta por conta demo está na migration 007.
-- ============================================================

UPDATE public.events
SET
  config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{demo}',
    '{"locked": true}'::jsonb,
    true
  ),
  updated_at = NOW()
WHERE slug = 'siannah-diego-2026';
