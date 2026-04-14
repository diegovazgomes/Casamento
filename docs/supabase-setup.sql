-- Executar no Supabase Dashboard > SQL Editor
-- Ordem: guest_tokens primeiro (rsvp_confirmations referencia ela)

-- ============================================================
-- Tabela de tokens de convite por grupo
-- ============================================================

create table guest_tokens (
  id uuid default gen_random_uuid() primary key,
  event_id text not null,
  token text unique not null,
  group_name text not null,
  max_confirmations int not null default 1,
  phone text,
  notes text,
  created_at timestamp with time zone default now()
);

create index idx_tokens_event on guest_tokens(event_id);
create index idx_tokens_token on guest_tokens(token);

-- RLS: leitura pública (o convite precisa buscar o grupo pelo token)
-- Escrita apenas via service_role (painel admin)
alter table guest_tokens enable row level security;

create policy "public_read_tokens"
  on guest_tokens for select
  using (true);

create policy "service_insert_tokens"
  on guest_tokens for insert
  using (auth.role() = 'service_role');

create policy "service_update_tokens"
  on guest_tokens for update
  using (auth.role() = 'service_role');

-- ============================================================
-- Tabela de confirmações de presença
-- ============================================================

create table rsvp_confirmations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('America/Sao_Paulo', now()),
  name text not null default '',
  phone text not null default '',
  attendance text not null check (attendance in ('yes', 'no', 'message', 'song')),
  event_id text not null default 'siannah-diego-2026',
  source text default 'website',
  user_agent text,
  referrer text,
  message text,
  song_title text,
  song_artist text,
  song_notes text,
  -- Campos do sistema de link único
  token_id uuid references guest_tokens(id),
  is_child boolean default false,
  child_age int,
  confirmed_by uuid references rsvp_confirmations(id),
  -- Consentimento LGPD
  marketing_consent boolean default false,
  marketing_consent_at timestamp with time zone
);

-- Índices para consultas do dashboard
create index idx_rsvp_event_id on rsvp_confirmations(event_id);
create index idx_rsvp_attendance on rsvp_confirmations(attendance);
create index idx_rsvp_created_at on rsvp_confirmations(created_at desc);
create index idx_rsvp_token_id on rsvp_confirmations(token_id);

-- Row Level Security
alter table rsvp_confirmations enable row level security;

-- Política: qualquer pessoa pode inserir (convidado confirmando)
create policy "Anyone can insert rsvp"
  on rsvp_confirmations for insert
  with check (true);

-- Política: leitura apenas com chave de serviço (dashboard do casal)
create policy "Service role can read all"
  on rsvp_confirmations for select
  using (auth.role() = 'service_role');

-- ============================================================
-- Se as tabelas já existem, use ALTER TABLE para adicionar colunas:
-- ============================================================

-- alter table rsvp_confirmations
--   add column if not exists token_id uuid references guest_tokens(id),
--   add column if not exists is_child boolean default false,
--   add column if not exists child_age int,
--   add column if not exists confirmed_by uuid references rsvp_confirmations(id),
--   add column if not exists marketing_consent boolean default false,
--   add column if not exists marketing_consent_at timestamp with time zone;
--
-- create index if not exists idx_rsvp_token_id on rsvp_confirmations(token_id);
