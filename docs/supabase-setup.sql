-- Tabela de confirmações de presença
-- Executar no Supabase Dashboard > SQL Editor

create table rsvp_confirmations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('America/Sao_Paulo', now()),
  name text not null,
  phone text not null,
  attendance text not null check (attendance in ('yes', 'no')),
  event_id text not null default 'siannah-diego-2026',
  source text default 'website',
  user_agent text,
  referrer text,
  message text,
  song_title text,
  song_artist text
);

-- Índices para consultas do dashboard
create index idx_rsvp_event_id on rsvp_confirmations(event_id);
create index idx_rsvp_attendance on rsvp_confirmations(attendance);
create index idx_rsvp_created_at on rsvp_confirmations(created_at desc);

-- Row Level Security — apenas leitura pública, escrita livre
alter table rsvp_confirmations enable row level security;

-- Política: qualquer pessoa pode inserir (convidado confirmando)
create policy "Anyone can insert rsvp"
  on rsvp_confirmations for insert
  with check (true);

-- Política: leitura apenas com chave de serviço (dashboard do casal)
create policy "Service role can read all"
  on rsvp_confirmations for select
  using (auth.role() = 'service_role');
