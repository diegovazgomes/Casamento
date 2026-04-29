-- ============================================================
-- Migração 001 — Tabelas events e event_gifts
-- Projeto: Convite de Casamento (Multi-Tenant SaaS)
-- ============================================================

-- ── Tabela: events ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        UNIQUE NOT NULL,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  couple_names    text        NOT NULL,
  bride_name      text,
  groom_name      text,
  event_date      date,
  event_time      time,
  venue_name      text,
  venue_address   text,
  venue_maps_link text,
  active_theme    text        NOT NULL DEFAULT 'classic-gold',
  active_layout   text        NOT NULL DEFAULT 'classic',
  is_active       boolean     NOT NULL DEFAULT true,
  config          jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.events IS 'Um registro por casal/evento. Dados variáveis por casal.';
COMMENT ON COLUMN public.events.slug           IS 'Identificador único na URL. Ex: siannah-diego-2026';
COMMENT ON COLUMN public.events.user_id        IS 'Dono do evento — vinculado ao Supabase Auth';
COMMENT ON COLUMN public.events.config         IS 'Dados variáveis sem necessidade de filtro: textos de páginas, áudio, WhatsApp, RSVP, páginas habilitadas';

-- ── Tabela: event_gifts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_gifts (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid    NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type        text    NOT NULL CHECK (type IN ('pix', 'card', 'catalog')),
  enabled     boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  config      jsonb   NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE  public.event_gifts IS 'Listas de presentes do evento. Múltiplos registros por evento.';
COMMENT ON COLUMN public.event_gifts.type   IS 'pix | card | catalog';
COMMENT ON COLUMN public.event_gifts.config IS 'Campos específicos por tipo: chave Pix, link Mercado Pago, itens do catálogo etc.';

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS events_slug_idx          ON public.events(slug);
CREATE INDEX IF NOT EXISTS events_user_id_idx       ON public.events(user_id);
CREATE INDEX IF NOT EXISTS event_gifts_event_id_idx ON public.event_gifts(event_id);

-- ── Trigger: updated_at automático ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: habilitar ───────────────────────────────────────────
ALTER TABLE public.events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_gifts ENABLE ROW LEVEL SECURITY;

-- ── Políticas: events ────────────────────────────────────────

-- Qualquer um pode ler eventos ativos (convidados acessando o convite)
CREATE POLICY "events_anon_select"
  ON public.events FOR SELECT TO anon
  USING (is_active = true);

-- Dono lê seus próprios eventos (inclusive inativos)
CREATE POLICY "events_owner_select"
  ON public.events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Dono cria seus próprios eventos
CREATE POLICY "events_owner_insert"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Dono edita seus próprios eventos
CREATE POLICY "events_owner_update"
  ON public.events FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Políticas: event_gifts ───────────────────────────────────

-- Qualquer um pode ler presentes de eventos ativos
CREATE POLICY "event_gifts_anon_select"
  ON public.event_gifts FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.is_active = true
    )
  );

-- Dono faz tudo nos presentes dos seus eventos
CREATE POLICY "event_gifts_owner_all"
  ON public.event_gifts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );
