-- ============================================================
-- Migration 007 — Conta demo por perfil (robusto)
-- Objetivo: permitir conta demo real (usuário normal) com eventos sempre read-only
-- Estratégia:
-- 1) flag em profiles: is_demo_account
-- 2) lock de config.demo.locked=true em eventos da conta demo
-- 3) trigger para manter lock automático em novos updates/inserts
-- ============================================================

-- 1) Flag da conta demo no perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo_account boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_demo_account IS
  'Quando true, todos os eventos do perfil são tratados como demonstração (read-only no dashboard).';

-- 2) Marcação automática por domínio Devazi (ajuste se necessário)
UPDATE public.profiles
SET is_demo_account = true, updated_at = NOW()
WHERE lower(email) = lower('devazioficial@gmail.com');

-- 3) Backfill: trava eventos já existentes dessa conta demo
UPDATE public.events e
SET
  config = jsonb_set(
    COALESCE(e.config, '{}'::jsonb),
    '{demo}',
    '{"locked": true}'::jsonb,
    true
  ),
  updated_at = NOW()
FROM public.profiles p
WHERE p.id = e.user_id
  AND p.is_demo_account = true;

-- 4) Trigger para manter lock automaticamente
CREATE OR REPLACE FUNCTION public.enforce_demo_event_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_demo boolean;
BEGIN
  SELECT is_demo_account
  INTO v_is_demo
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF COALESCE(v_is_demo, false) THEN
    NEW.config := jsonb_set(
      COALESCE(NEW.config, '{}'::jsonb),
      '{demo}',
      '{"locked": true}'::jsonb,
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_enforce_demo_lock ON public.events;

CREATE TRIGGER events_enforce_demo_lock
  BEFORE INSERT OR UPDATE OF user_id, config
  ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_demo_event_lock();
