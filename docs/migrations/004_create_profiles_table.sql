-- ============================================================
-- Migração 004 — Tabela profiles + trigger handle_new_user
-- Projeto: Convite de Casamento (Multi-Tenant SaaS)
-- ATENÇÃO: executar após 001_create_events_tables.sql
-- ============================================================

-- ── Tabela: profiles ─────────────────────────────────────────
-- Um perfil por casal, vinculado ao usuário do Supabase Auth.
-- Criado automaticamente via trigger ao cadastrar.

CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_name     text        NOT NULL DEFAULT 'Novo Casal',
  email           text        NOT NULL,
  whatsapp        text,
  plan            text        NOT NULL DEFAULT 'free'
                              CHECK (plan IN ('free', 'basic', 'premium')),
  expires_at      timestamptz,
  lgpd_accepted_at timestamptz,
  lgpd_ip         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles IS 'Perfil público do casal. Um registro por usuário autenticado.';
COMMENT ON COLUMN public.profiles.id             IS 'Mesmo UUID do auth.users — PK e FK.';
COMMENT ON COLUMN public.profiles.couple_name    IS 'Nome do casal exibido no dashboard e no convite.';
COMMENT ON COLUMN public.profiles.whatsapp       IS 'WhatsApp do casal para contato e notificações. Formato: apenas dígitos, ex: 5511999999999.';
COMMENT ON COLUMN public.profiles.plan           IS 'Plano ativo: free | basic | premium.';
COMMENT ON COLUMN public.profiles.expires_at     IS 'Data de expiração do plano pago. NULL = free sem vencimento.';
COMMENT ON COLUMN public.profiles.lgpd_accepted_at IS 'Timestamp de aceitação dos termos de uso e política de privacidade.';
COMMENT ON COLUMN public.profiles.lgpd_ip        IS 'IP registrado no momento do aceite LGPD.';

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_plan_idx ON public.profiles(plan);

-- ── Trigger: updated_at automático ──────────────────────────
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuário lê apenas seu próprio perfil
CREATE POLICY "profiles_owner_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Usuário atualiza apenas seu próprio perfil
-- Não pode alterar id, email ou campos de auditoria LGPD
CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Service role tem acesso total (trigger, backend, webhooks de pagamento)
CREATE POLICY "profiles_service_role_all"
  ON public.profiles FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Função: handle_new_user ───────────────────────────────────
-- Cria automaticamente um profile quando um novo usuário é
-- criado no Supabase Auth. Os campos couple_name e whatsapp
-- são atualizados pelo signup endpoint logo após.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, couple_name)
  VALUES (NEW.id, NEW.email, 'Novo Casal')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── Trigger: on_auth_user_created ────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Verificação ──────────────────────────────────────────────
-- Após rodar esta migração, verifique com:
--
--   SELECT * FROM pg_policies WHERE tablename = 'profiles';
--   SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
--
-- Para testar o trigger, crie um usuário em Authentication > Users
-- e verifique se um registro foi inserido em public.profiles.
