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
  with check (auth.role() = 'service_role');

create policy "service_update_tokens"
  on guest_tokens for update
  with check (auth.role() = 'service_role');

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
-- Tabela de mensagens e sugestões enviadas pelos convidados
-- ============================================================

create table guest_submissions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('America/Sao_Paulo', now()),
  type text not null check (type in ('message', 'song')),
  guest_name text not null default '',
  event_id text not null default 'siannah-diego-2026',
  source text default 'website',
  user_agent text,
  referrer text,
  message text,
  song_title text,
  song_artist text,
  song_notes text
);

create index idx_guest_submissions_event_id on guest_submissions(event_id);
create index idx_guest_submissions_type on guest_submissions(type);
create index idx_guest_submissions_created_at on guest_submissions(created_at desc);

alter table guest_submissions enable row level security;

create policy "Anyone can insert guest submissions"
  on guest_submissions for insert
  with check (true);

create policy "Service role can read guest submissions"
  on guest_submissions for select
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

-- ============================================================
-- Tabela de credenciais do casal (para dashboard)
-- ============================================================

create table couple_credentials (
  id uuid default gen_random_uuid() primary key,
  event_id text unique not null,
  password_hash text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS: service role only para todas as operações
alter table couple_credentials enable row level security;

create policy "Service role can read credentials"
  on couple_credentials for select
  using (auth.role() = 'service_role');

create policy "Service role can write credentials"
  on couple_credentials for insert
  with check (auth.role() = 'service_role');

create policy "Service role can update credentials"
  on couple_credentials for update
  with check (auth.role() = 'service_role');

-- ============================================================
-- Tabela de rastreamento de visualização do convite
-- ============================================================

create table guest_views (
  id uuid default gen_random_uuid() primary key,
  event_id text not null,
  token_id uuid references guest_tokens(id) on delete cascade,
  opened_at timestamp with time zone default now(),
  user_agent text,
  viewport_width int,
  viewport_height int,
  device_type varchar(20),
  country_code varchar(2),
  city text,
  created_at timestamp with time zone default now()
);

create index idx_views_token_id on guest_views(token_id);
create index idx_views_event_id on guest_views(event_id);
create index idx_views_opened_at on guest_views(opened_at desc);

-- RLS: leitura apenas com service role (dashboard)
alter table guest_views enable row level security;

create policy "Service role can read views"
  on guest_views for select
  using (auth.role() = 'service_role');

-- ============================================================
-- Tabela de auditoria de lembretes enviados
-- ============================================================

create table reminder_logs (
  id uuid default gen_random_uuid() primary key,
  event_id text not null,
  token_id uuid references guest_tokens(id) on delete cascade,
  phone text not null,
  message text not null,
  status text not null check (status in ('sent', 'failed', 'pending')),
  error_message text,
  sent_by text not null default 'system',
  sent_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create index idx_reminders_event_id on reminder_logs(event_id);
create index idx_reminders_token_id on reminder_logs(token_id);
create index idx_reminders_sent_at on reminder_logs(sent_at desc);

-- RLS: leitura apenas com service role (dashboard)
alter table reminder_logs enable row level security;

create policy "Service role can read reminders"
  on reminder_logs for select
  using (auth.role() = 'service_role');

create policy "Service role can insert reminders"
  on reminder_logs for insert
  with check (auth.role() = 'service_role');
