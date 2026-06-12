create table public.couple_credentials (
  id uuid not null default gen_random_uuid (),
  event_id text not null,
  password_hash text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint couple_credentials_pkey primary key (id),
  constraint couple_credentials_event_id_key unique (event_id)
) TABLESPACE pg_default;

create table public.event_gifts (
  id uuid not null default gen_random_uuid (),
  event_id uuid not null,
  type text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  constraint event_gifts_pkey primary key (id),
  constraint event_gifts_event_id_fkey foreign KEY (event_id) references events (id) on delete CASCADE,
  constraint event_gifts_type_check check (
    (
      type = any (array['pix'::text, 'card'::text, 'catalog'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists event_gifts_event_id_idx on public.event_gifts using btree (event_id) TABLESPACE pg_default;

create table public.events (
  id uuid not null default gen_random_uuid (),
  slug text not null,
  user_id uuid null,
  couple_names text not null,
  bride_name text null,
  groom_name text null,
  event_date date null,
  event_time time without time zone null,
  venue_name text null,
  venue_address text null,
  venue_maps_link text null,
  active_theme text not null default 'classic-gold'::text,
  active_layout text not null default 'classic'::text,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  venue_coordinates jsonb null,
  ceremony_name text null,
  ceremony_address text null,
  ceremony_maps_link text null,
  ceremony_coordinates jsonb null,
  party_name text null,
  party_address text null,
  party_maps_link text null,
  party_coordinates jsonb null,
  constraint events_pkey primary key (id),
  constraint events_slug_key unique (slug),
  constraint events_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists events_user_id_idx on public.events using btree (user_id) TABLESPACE pg_default;

create index IF not exists events_slug_idx on public.events using btree (slug) TABLESPACE pg_default;

create trigger events_enforce_demo_lock BEFORE INSERT
or
update OF user_id,
config on events for EACH row
execute FUNCTION enforce_demo_event_lock ();

create trigger events_set_updated_at BEFORE
update on events for EACH row
execute FUNCTION set_updated_at ();

create table public.guest_submissions (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default timezone ('America/Sao_Paulo'::text, now()),
  type text not null,
  guest_name text not null default ''::text,
  event_id text not null default 'siannah-diego-2026'::text,
  source text null default 'website'::text,
  user_agent text null,
  referrer text null,
  message text null,
  song_title text null,
  song_artist text null,
  song_notes text null,
  constraint guest_submissions_pkey primary key (id),
  constraint guest_submissions_type_check check (
    (type = any (array['message'::text, 'song'::text]))
  )
) TABLESPACE pg_default;

create index IF not exists idx_guest_submissions_event_id on public.guest_submissions using btree (event_id) TABLESPACE pg_default;

create index IF not exists idx_guest_submissions_type on public.guest_submissions using btree (type) TABLESPACE pg_default;

create index IF not exists idx_guest_submissions_created_at on public.guest_submissions using btree (created_at desc) TABLESPACE pg_default;

create table public.guest_tokens (
  id uuid not null default gen_random_uuid (),
  event_id text not null,
  token text not null,
  group_name text not null,
  max_confirmations integer not null default 1,
  phone text null,
  notes text null,
  created_at timestamp with time zone null default now(),
  constraint guest_tokens_pkey primary key (id),
  constraint guest_tokens_token_key unique (token)
) TABLESPACE pg_default;

create index IF not exists idx_tokens_event on public.guest_tokens using btree (event_id) TABLESPACE pg_default;

create index IF not exists idx_tokens_token on public.guest_tokens using btree (token) TABLESPACE pg_default;

create table public.guest_views (
  id uuid not null default gen_random_uuid (),
  event_id text not null,
  token_id uuid null,
  opened_at timestamp with time zone null default now(),
  user_agent text null,
  viewport_width integer null,
  viewport_height integer null,
  device_type character varying(20) null,
  country_code character varying(2) null,
  city text null,
  created_at timestamp with time zone null default now(),
  constraint guest_views_pkey primary key (id),
  constraint guest_views_token_id_fkey foreign KEY (token_id) references guest_tokens (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_views_token_id on public.guest_views using btree (token_id) TABLESPACE pg_default;

create index IF not exists idx_views_event_id on public.guest_views using btree (event_id) TABLESPACE pg_default;

create index IF not exists idx_views_opened_at on public.guest_views using btree (opened_at desc) TABLESPACE pg_default;

create table public.payment_events (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  stripe_event_id text not null,
  event_type text not null,
  amount_total integer null,
  currency text null,
  plan text null,
  processed_at timestamp with time zone not null default now(),
  constraint payment_events_pkey primary key (id),
  constraint payment_events_stripe_event_id_key unique (stripe_event_id),
  constraint payment_events_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete set null
) TABLESPACE pg_default;

create table public.profiles (
  id uuid not null,
  couple_name text not null default 'Novo Casal'::text,
  email text not null,
  whatsapp text null,
  plan text not null default 'free'::text,
  expires_at timestamp with time zone null,
  lgpd_accepted_at timestamp with time zone null,
  lgpd_ip text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  stripe_customer_id text null,
  is_demo_account boolean not null default false,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint profiles_plan_check check (
    (
      plan = any (
        array['free'::text, 'basic'::text, 'premium'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists profiles_plan_idx on public.profiles using btree (plan) TABLESPACE pg_default;

create trigger profiles_set_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION set_updated_at ();

create table public.reminder_logs (
  id uuid not null default gen_random_uuid (),
  event_id text not null,
  token_id uuid null,
  phone text not null,
  message text not null,
  status text not null,
  error_message text null,
  sent_by text not null default 'system'::text,
  sent_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  constraint reminder_logs_pkey primary key (id),
  constraint reminder_logs_token_id_fkey foreign KEY (token_id) references guest_tokens (id) on delete CASCADE,
  constraint reminder_logs_status_check check (
    (
      status = any (
        array['sent'::text, 'failed'::text, 'pending'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_reminders_event_id on public.reminder_logs using btree (event_id) TABLESPACE pg_default;

create index IF not exists idx_reminders_token_id on public.reminder_logs using btree (token_id) TABLESPACE pg_default;

create index IF not exists idx_reminders_sent_at on public.reminder_logs using btree (sent_at desc) TABLESPACE pg_default;

create table public.rsvp_confirmations (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default timezone ('America/Sao_Paulo'::text, now()),
  name text not null default ''::text,
  phone text not null default ''::text,
  attendance text not null,
  event_id text not null default 'siannah-diego-2026'::text,
  source text null default 'website'::text,
  user_agent text null,
  referrer text null,
  message text null,
  song_title text null,
  song_artist text null,
  song_notes text null,
  token_id uuid null,
  is_child boolean null default false,
  child_age integer null,
  confirmed_by uuid null,
  marketing_consent boolean null default false,
  marketing_consent_at timestamp with time zone null,
  constraint rsvp_confirmations_pkey primary key (id),
  constraint rsvp_confirmations_confirmed_by_fkey foreign KEY (confirmed_by) references rsvp_confirmations (id),
  constraint rsvp_confirmations_token_id_fkey foreign KEY (token_id) references guest_tokens (id),
  constraint rsvp_confirmations_attendance_check check (
    (
      attendance = any (
        array[
          'yes'::text,
          'no'::text,
          'message'::text,
          'song'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_rsvp_event_id on public.rsvp_confirmations using btree (event_id) TABLESPACE pg_default;

create index IF not exists idx_rsvp_attendance on public.rsvp_confirmations using btree (attendance) TABLESPACE pg_default;

create index IF not exists idx_rsvp_created_at on public.rsvp_confirmations using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_rsvp_token_id on public.rsvp_confirmations using btree (token_id) TABLESPACE pg_default;