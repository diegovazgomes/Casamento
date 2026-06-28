-- Migration 005: Stripe payment support
-- Adiciona stripe_customer_id em profiles e cria tabela de auditoria de pagamentos.

-- 1. Coluna para mapear usuário ao Stripe Customer
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- 2. Tabela de auditoria de pagamentos (idempotente via UNIQUE em stripe_event_id)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_event_id  text        UNIQUE NOT NULL,
  event_type       text        NOT NULL,
  amount_total     integer,
  currency         text,
  plan             text,
  processed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Apenas service role acessa esta tabela (nunca exposto ao frontend diretamente)
CREATE POLICY "service_role_only" ON public.payment_events
  USING (false);
