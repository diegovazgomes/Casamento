-- ============================================================
-- Migration 010 - Usuarios administradores internos
-- Objetivo: permitir painel owner/admin sem criar nova fonte de autenticacao.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_users IS
  'Usuarios autorizados a acessar o painel administrativo interno da plataforma.';

COMMENT ON COLUMN public.admin_users.role IS
  'Nivel administrativo interno: owner, admin ou viewer.';

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_service_role_all" ON public.admin_users;

CREATE POLICY "admin_users_service_role_all"
  ON public.admin_users FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS admin_users_role_idx
  ON public.admin_users(role);

-- Inserir o primeiro admin manualmente no Supabase, substituindo pelo UUID real:
-- INSERT INTO public.admin_users (user_id, role)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'owner')
-- ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
