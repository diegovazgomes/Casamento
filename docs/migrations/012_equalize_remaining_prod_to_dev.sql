-- ============================================================
-- Migration 012 - Equalizacao aditiva prod -> dev
-- Objetivo: aplicar diferencas ainda pendentes depois das migrations
-- 009, 010 e 011, sem remover objetos legados de producao e sem
-- alterar nulabilidade/defaults de colunas existentes.
--
-- Ordem recomendada:
-- 1. 009_guest_views_analytics_columns.sql
-- 2. 010_admin_users.sql
-- 3. 011_platform_events.sql
-- 4. 012_equalize_remaining_prod_to_dev.sql
--
-- Esta migration e intencionalmente nao destrutiva:
-- - Nao remove public.couple_credentials.
-- - Nao remove colunas antigas de public.guest_views.
-- - Nao renomeia indices/triggers equivalentes.
-- - Nao aplica NOT NULL/defaults em public.events.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Garantir vinculo por UUID entre registros de publico e events
-- ------------------------------------------------------------

ALTER TABLE public.rsvp_confirmations
  ADD COLUMN IF NOT EXISTS event_uuid uuid REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.guest_tokens
  ADD COLUMN IF NOT EXISTS event_uuid uuid REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rsvp_event_uuid
  ON public.rsvp_confirmations USING btree (event_uuid);

CREATE INDEX IF NOT EXISTS idx_guest_tokens_event_uuid
  ON public.guest_tokens USING btree (event_uuid);

UPDATE public.rsvp_confirmations rc
SET event_uuid = e.id
FROM public.events e
WHERE rc.event_id = e.slug
  AND rc.event_uuid IS NULL;

UPDATE public.guest_tokens gt
SET event_uuid = e.id
FROM public.events e
WHERE gt.event_id = e.slug
  AND gt.event_uuid IS NULL;

-- ------------------------------------------------------------
-- 2. Indice presente em dev para filtros por evento ativo
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_events_is_active
  ON public.events USING btree (is_active);

COMMIT;
