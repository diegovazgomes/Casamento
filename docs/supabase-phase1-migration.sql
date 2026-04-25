-- ============================================================
-- FASE 1 — MIGRAÇÃO MULTI-TENANT (Supabase)
-- Projeto: Convite de Casamento — Siannah & Diego
-- Data: 2026-04-25
-- ============================================================
-- ORDEM DE EXECUÇÃO OBRIGATÓRIA:
--   1. Seção 1 — Tabela events
--   2. Seção 2 — Tabela event_gifts
--   3. Seção 3 — RLS policies
--   4. Seção 4 — FK nas tabelas existentes
--   5. Seção 5 — Supabase Storage
--   6. Seção 6 — INSERT dos dados de Siannah & Diego
--      ⚠ ANTES de executar a Seção 6:
--        • Acesse Supabase Dashboard → Authentication → Users
--        • Localize ddiego533@gmail.com e copie o UUID (coluna "User UID")
--        • Se o usuário não existir, crie via "Invite User" e confirme o e-mail
--        • Substitua '<USER_UUID_AQUI>' pelo UUID real neste arquivo
-- ============================================================


-- ============================================================
-- SEÇÃO 1 — Tabela events
-- ============================================================

create table if not exists events (
  id                  uuid        primary key default gen_random_uuid(),
  slug                text        unique not null,
  user_id             uuid        references auth.users(id) on delete set null,

  -- Dados do casal
  couple_names        text        not null default '',
  bride_name          text        not null default '',
  groom_name          text        not null default '',

  -- Dados do evento
  event_date          date,
  event_time          time,
  venue_name          text        not null default '',
  venue_address       text        not null default '',
  venue_maps_link     text        not null default '',
  venue_coordinates   jsonb,                         -- { "lat": -23.8545, "lng": -46.5797 }

  -- Configuração visual
  active_theme        text        not null default 'classic-gold',
  active_layout       text        not null default 'classic',

  -- Estado
  is_active           boolean     not null default true,

  -- Configurações variáveis (não filtráveis) em JSONB
  -- Inclui: subtitle, hero_image_url, pages (enabled flags + content),
  --         audio tracks, whatsapp config, rsvp config, texts customizados,
  --         themeOverrides, gallery, map settings
  config              jsonb       not null default '{}',

  -- Timestamps
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Índices
create index if not exists idx_events_slug       on events(slug);
create index if not exists idx_events_user_id    on events(user_id);
create index if not exists idx_events_is_active  on events(is_active);

-- Trigger updated_at automático
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_updated_at on events;
create trigger events_updated_at
  before update on events
  for each row execute function set_updated_at();


-- ============================================================
-- SEÇÃO 2 — Tabela event_gifts
-- ============================================================

create table if not exists event_gifts (
  id          uuid    primary key default gen_random_uuid(),
  event_id    uuid    not null references events(id) on delete cascade,
  type        text    not null check (type in ('pix', 'card', 'catalog')),
  enabled     boolean not null default true,
  sort_order  integer not null default 0,
  -- Campos específicos por tipo no JSONB:
  -- pix:     { pix_key, pix_qr_image, bank_name, account_name }
  -- card:    { payment_link, provider }
  -- catalog: { active_key, lists: { key: { title, subtitle, items[] } } }
  config      jsonb   not null default '{}'
);

create index if not exists idx_event_gifts_event_id on event_gifts(event_id);


-- ============================================================
-- SEÇÃO 3 — Row Level Security
-- ============================================================

-- events
alter table events enable row level security;

-- Leitura pública: apenas convites ativos
create policy "public_read_active_events"
  on events for select
  using (is_active = true);

-- Leitura própria autenticada (inclui inativos)
create policy "owner_read_own_events"
  on events for select
  using (auth.uid() = user_id);

-- Update próprio
create policy "owner_update_own_events"
  on events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Insert próprio
create policy "owner_insert_own_events"
  on events for insert
  with check (auth.uid() = user_id);

-- service_role tem acesso irrestrito por padrão (bypass RLS)


-- event_gifts
alter table event_gifts enable row level security;

-- Leitura pública: presentes de eventos ativos
create policy "public_read_active_event_gifts"
  on event_gifts for select
  using (
    exists (
      select 1 from events
      where events.id = event_gifts.event_id
        and events.is_active = true
    )
  );

-- Leitura própria autenticada
create policy "owner_read_own_gifts"
  on event_gifts for select
  using (
    exists (
      select 1 from events
      where events.id = event_gifts.event_id
        and events.user_id = auth.uid()
    )
  );

-- Insert/Update/Delete: somente dono do evento
create policy "owner_insert_own_gifts"
  on event_gifts for insert
  with check (
    exists (
      select 1 from events
      where events.id = event_gifts.event_id
        and events.user_id = auth.uid()
    )
  );

create policy "owner_update_own_gifts"
  on event_gifts for update
  using (
    exists (
      select 1 from events
      where events.id = event_gifts.event_id
        and events.user_id = auth.uid()
    )
  );

create policy "owner_delete_own_gifts"
  on event_gifts for delete
  using (
    exists (
      select 1 from events
      where events.id = event_gifts.event_id
        and events.user_id = auth.uid()
    )
  );


-- ============================================================
-- SEÇÃO 4 — FK uuid nas tabelas existentes
-- (Mantém backward compat: event_id text NÃO é removido)
-- ============================================================

alter table rsvp_confirmations
  add column if not exists event_uuid uuid references events(id) on delete set null;

create index if not exists idx_rsvp_event_uuid
  on rsvp_confirmations(event_uuid);

alter table guest_tokens
  add column if not exists event_uuid uuid references events(id) on delete set null;

create index if not exists idx_guest_tokens_event_uuid
  on guest_tokens(event_uuid);


-- ============================================================
-- SEÇÃO 5 — Supabase Storage (bucket event-media)
-- ============================================================

-- Criar bucket público para leitura
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-media',
  'event-media',
  true,
  10485760,   -- 10 MB por arquivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Política: leitura pública irrestrita
create policy "public_read_event_media"
  on storage.objects for select
  using (bucket_id = 'event-media');

-- Política: upload autenticado restrito ao path do próprio evento
-- O path esperado é: {event_id}/{type}/{filename}
-- onde event_id é o UUID do evento pertencente ao usuário autenticado
create policy "owner_upload_own_event_media"
  on storage.objects for insert
  with check (
    bucket_id = 'event-media'
    and auth.uid() is not null
    and exists (
      select 1 from events
      where events.id::text = split_part(name, '/', 1)
        and events.user_id = auth.uid()
    )
  );

-- Política: deleção autenticada restrita ao path do próprio evento
create policy "owner_delete_own_event_media"
  on storage.objects for delete
  using (
    bucket_id = 'event-media'
    and auth.uid() is not null
    and exists (
      select 1 from events
      where events.id::text = split_part(name, '/', 1)
        and events.user_id = auth.uid()
    )
  );


-- ============================================================
-- SEÇÃO 6 — INSERT: dados de Siannah & Diego
-- ============================================================
-- ⚠ PRÉ-REQUISITO: substitua '<USER_UUID_AQUI>' pelo UUID real
--   do usuário ddiego533@gmail.com encontrado em:
--   Supabase Dashboard → Authentication → Users
-- ============================================================

-- 6.1 Evento principal
insert into events (
  slug,
  user_id,
  couple_names,
  bride_name,
  groom_name,
  event_date,
  event_time,
  venue_name,
  venue_address,
  venue_maps_link,
  venue_coordinates,
  active_theme,
  active_layout,
  is_active,
  config
)
values (
  'siannah-diego-2026',
  '8c6b001f-de2f-45b9-be39-9768dba6c672'::uuid,
  'Siannah & Diego',
  'Siannah',
  'Diego',
  '2026-09-06',
  '17:00:00',
  'Mansão Ilha de Capri',
  'Rodovia Anchieta, SP-150, km 28, São Bernardo do Campo - SP',
  'https://www.google.com/maps/dir//Ilha+de+Capri+Buffet+Eventos,+Rodovia+Anchieta,+SP-150,+km+28+-+Vila+Balnearia,+S%C3%A3o+Bernardo+do+Campo+-+SP,+09822-250/@-23.6611535,-46.6029821,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x94ce41794f164f17:0x93eaef9188424c1b!2m2!1d-46.535788!2d-23.767335?entry=ttu&g_ep=EgoyMDI2MDQwMS4wIKXMDSoASAFQAw%3D%3D',
  '{"lat": -23.8545, "lng": -46.5797}',
  'classic-gold',
  'classic',
  true,
  jsonb_build_object(
    -- Dados de exibição do evento
    'subtitle',       'Seguimos escolhendo um ao outro para sempre.',
    'display_date',   '06 de setembro de 2026',
    'hero_date',      '06 . 09 . 2026',
    'detail_date',    '06 Set 2026',
    'weekday',        'Domingo',
    'timezone',       'Horário de Brasília',
    'location_city',  'São Bernardo do Campo',
    'map_enabled',    true,

    -- Imagem do casal (será atualizado com URL do Storage após upload)
    'hero_image_url', 'assets/images/couple/casal.png',

    -- Áudio
    'audio', jsonb_build_object(
      'main', jsonb_build_object('src', 'assets/audio/main-theme.mp3', 'volume', 0, 'startTime', 8),
      'gift', jsonb_build_object('src', 'assets/audio/gift-theme.mp3', 'volume', 0, 'startTime', 78)
    ),

    -- WhatsApp
    'whatsapp', jsonb_build_object(
      'destination_phone',  '5511949606377',
      'recipient_name',     'Siannah',
      'redirect_delay_ms',  5000,
      'messages', jsonb_build_object(
        'attending',
          'Olá, {recipientName}!\n\nAqui é {name}.\nMeu WhatsApp para contato é {phone}.\nEstou passando para confirmar minha presença no casamento.\n\nNos vemos em breve.',
        'notAttending',
          'Olá, {recipientName}!\n\nAqui é {name}.\nMeu WhatsApp para contato é {phone}.\nInfelizmente, não poderei estar presente no casamento.\n\nAgradeço muito pelo convite e desejo um dia lindo para vocês.'
      ),
      'feedback', jsonb_build_object(
        'attending',    jsonb_build_object('title', 'Presença confirmada, {firstName}.', 'subtitle', 'Sua confirmação foi registrada com carinho. Estamos muito felizes em celebrar esse momento com você.', 'note', ''),
        'notAttending', jsonb_build_object('title', 'Obrigada pelo aviso, {firstName}.', 'subtitle', 'Seu retorno foi registrado com carinho. Agradecemos por nos avisar.', 'note', ''),
        'error',        jsonb_build_object('title', 'Faltam alguns dados para continuar.', 'subtitle', 'Revise os campos destacados e tente novamente.', 'note', '')
      )
    ),

    -- RSVP
    'rsvp', jsonb_build_object(
      'event_id',        'siannah-diego-2026',
      'supabase_enabled', true
    ),

    -- Dashboard
    'dashboard', jsonb_build_object(
      'enabled',  true,
      'event_id', 'siannah-diego-2026',
      'reminder_templates', jsonb_build_object(
        'pending',      'Olá! Ainda não recebemos sua confirmação para o casamento de Siannah & Diego. Por favor, confirme sua presença através do link que recebeu.',
        'thankyou',     'Obrigado por confirmar sua presença no casamento de Siannah & Diego! Fique atento para mais informações nos próximos dias.',
        'announcement', 'Oi! Temos uma informação importante sobre o casamento de Siannah & Diego. Verifique seu email ou o convite online.'
      )
    ),

    -- Páginas habilitadas e conteúdo
    'pages', jsonb_build_object(
      'historia', jsonb_build_object(
        'enabled',    true,
        'cardLabel',  'Nossa História',
        'cardHint',   'Ler nossa história',
        'content', jsonb_build_object(
          'tag',   'Nossa História',
          'title', 'Como tudo começou',
          'intro', 'Uma história que é nossa, e que a partir de setembro passa a ser de vocês também.',
          'gallery', jsonb_build_array(
            jsonb_build_object('src', 'assets/images/gallery/foto1.png', 'alt', 'Foto 1'),
            jsonb_build_object('src', 'assets/images/gallery/foto2.png', 'alt', 'Foto 2'),
            jsonb_build_object('src', 'assets/images/gallery/foto3.png', 'alt', 'Foto 3')
          ),
          'chapters', jsonb_build_array(
            jsonb_build_object('year', '2013', 'title', 'O primeiro encontro', 'text', 'Essa história começou em junho de 2013, quando passaram a trabalhar juntos em uma empresa de telemarketing. Para Diego, foi paixão à primeira vista. Para Siannah, nem tanto… rs. Mas, aos poucos, ele foi conquistando o coração dela, e assim começou essa linda história de amor.'),
            jsonb_build_object('year', '2023', 'title', 'O pedido',            'text', 'Descreva aqui como foi o pedido de namoro ou noivado.'),
            jsonb_build_object('year', '2026', 'title', 'O grande dia',        'text', 'E agora, queremos compartilhar este momento com você.')
          )
        )
      ),
      'faq', jsonb_build_object(
        'enabled',   true,
        'cardLabel', 'Dúvidas Frequentes',
        'cardHint',  'Ver perguntas',
        'content', jsonb_build_object(
          'tag',   'FAQ',
          'title', 'Tudo que você precisa saber',
          'intro', 'Reunimos as perguntas mais frequentes para facilitar o seu preparo.',
          'items', jsonb_build_array(
            jsonb_build_object('question', 'Qual valor do convite avulço?',       'answer', 'R$100,00 por pessoa'),
            jsonb_build_object('question', 'Qual o dresscode da festa?',          'answer', 'Apenas roupas da lacoste'),
            jsonb_build_object('question', 'Tem estacionamento no local?',        'answer', 'Sim. O estacionamento é cobrado R$40,00 por veículo')
          )
        )
      ),
      'hospedagem', jsonb_build_object(
        'enabled',   true,
        'cardLabel', 'Para Quem Vem de Fora',
        'cardHint',  'Ver opções',
        'content', jsonb_build_object(
          'tag',             'Para Quem Vem de Fora',
          'title',           'Fique à vontade para explorar',
          'intro',           'Selecionamos algumas opções próximas ao local da festa para tornar sua estadia mais fácil.',
          'hotelsTitle',     'Hospedagem',
          'restaurantsTitle','Restaurantes',
          'hotels', jsonb_build_array(
            jsonb_build_object('name', 'Pampas Palace Hotel', 'description', 'A 10 minutos do local. Café da manhã incluído.', 'link', 'https://www.pampaspalacehotel.com.br/', 'linkLabel', 'Ver hotel'),
            jsonb_build_object('name', '',                    'description', '',                                                'link', '',                                     'linkLabel', 'Ver hotel')
          ),
          'restaurants', jsonb_build_array(
            jsonb_build_object('name', 'Raphaela Bolos', 'description', 'Melhor ovo de Páscoa da América Latina', 'link', 'https://raphaconfeitaria.menudino.com/', 'linkLabel', 'Ver na web'),
            jsonb_build_object('name', '',               'description', '',                                       'link', '',                                       'linkLabel', 'Ver no Maps')
          )
        )
      ),
      'mensagem', jsonb_build_object(
        'enabled',   true,
        'cardLabel', 'Mensagem ao Casal',
        'cardHint',  'Deixar recado',
        'content', jsonb_build_object(
          'tag',              'Mensagem ao Casal',
          'title',            'Deixe uma mensagem de carinho',
          'intro',            'Seu recado vai deixar esse momento ainda mais especial para nós.',
          'formTitle',        'Escreva para nós',
          'formSubtitle',     'Você pode deixar seu nome e uma mensagem que prepararemos para guardar com carinho.',
          'nameLabel',        'Seu nome (opcional)',
          'messageLabel',     'Sua mensagem',
          'namePlaceholder',  'Como podemos te chamar?',
          'messagePlaceholder','Escreva aqui sua mensagem de carinho...',
          'submitLabel',      'Enviar mensagem aos noivos',
          'successMessage',   'Mensagem enviada com carinho. Obrigado por deixar seu recado para nós.',
          'errorMessage',     'Não foi possível enviar sua mensagem agora. Tente novamente.'
        )
      ),
      'musica', jsonb_build_object(
        'enabled',   true,
        'cardLabel', 'Sugerir Música',
        'cardHint',  'Para a festa',
        'content', jsonb_build_object(
          'tag',               'Sugestão de Música',
          'title',             'Qual música não pode faltar?',
          'intro',             'Sugira uma música para tocar na nossa festa e ajudar a montar a trilha desse dia.',
          'formTitle',         'Envie sua sugestão',
          'formSubtitle',      'Compartilhe ao menos o nome da música. Se quiser, inclua artista e observações.',
          'nameLabel',         'Seu nome (opcional)',
          'songLabel',         'Nome da música',
          'artistLabel',       'Artista (opcional)',
          'notesLabel',        'Observações (opcional)',
          'namePlaceholder',   'Como podemos te chamar?',
          'songPlaceholder',   'Ex: Velha Infância',
          'artistPlaceholder', 'Ex: Tribalistas',
          'notesPlaceholder',  'Diga por que essa música é especial...',
          'submitLabel',       'Enviar sugestão aos noivos',
          'successMessage',    'Sugestão enviada com sucesso. Obrigado por ajudar a montar a trilha da nossa festa.',
          'errorMessage',      'Não foi possível enviar sua sugestão agora. Tente novamente.'
        )
      ),
      'presente', jsonb_build_object(
        'enabled',   true,
        'cardLabel', 'Lista de Presentes',
        'cardHint',  'Ver opções'
      )
    )
  )
);


-- 6.2 Presentes — Pix
insert into event_gifts (event_id, type, enabled, sort_order, config)
values (
  (select id from events where slug = 'siannah-diego-2026'),
  'pix',
  true,
  1,
  jsonb_build_object(
    'pix_key',      'c7806bc8-831c-4a41-8bd5-80862fe13584',
    'pix_qr_image', 'assets/images/icons/IMG_8732.jpeg',
    'account_name', 'Siannah & Diego'
  )
);

-- 6.3 Presentes — Cartão
insert into event_gifts (event_id, type, enabled, sort_order, config)
values (
  (select id from events where slug = 'siannah-diego-2026'),
  'card',
  true,
  2,
  jsonb_build_object(
    'payment_link', 'https://link.mercadopago.com.br/diegovaz',
    'provider',     'Mercado Pago'
  )
);

-- 6.4 Presentes — Catálogo (Lua de Mel + Casa)
insert into event_gifts (event_id, type, enabled, sort_order, config)
values (
  (select id from events where slug = 'siannah-diego-2026'),
  'catalog',
  true,
  3,
  jsonb_build_object(
    'active_key', 'honeymoon',
    'lists', jsonb_build_object(
      'honeymoon', jsonb_build_object(
        'enabled',  true,
        'title',    'Lista de Lua de Mel',
        'subtitle', 'Sugestões para celebrar nossa primeira viagem como casados.',
        'items', jsonb_build_array(
          jsonb_build_object('id','taxas-embarque',        'name','Taxas de Embarque',           'description','Ajuda com taxas e bagagens da viagem.',            'amount',140,  'category','Lua de Mel','icon','🧳', 'enabled',true),
          jsonb_build_object('id','traslado-aeroporto',    'name','Traslado Aeroporto-Hotel',     'description','Transporte seguro na chegada e saída.',            'amount',200,  'category','Lua de Mel','icon','🚕', 'enabled',true),
          jsonb_build_object('id','jantar-romantico',      'name','Jantar Romântico',             'description','Um jantar especial a dois na viagem.',             'amount',299,  'category','Lua de Mel','icon','🍽️','enabled',true),
          jsonb_build_object('id','passeio-barco',         'name','Passeio de Barco',             'description','Experiência inesquecível em alto-mar.',            'amount',317,  'category','Lua de Mel','icon','⛵', 'enabled',true),
          jsonb_build_object('id','jantar-celebracao',     'name','Jantar de Celebração',         'description','Noite especial para celebrar esse momento.',       'amount',390,  'category','Lua de Mel','icon','🥂', 'enabled',true),
          jsonb_build_object('id','spa-casal',             'name','Spa para o Casal',             'description','Momento de relaxamento durante a lua de mel.',    'amount',470,  'category','Lua de Mel','icon','🧖', 'enabled',true),
          jsonb_build_object('id','hospedagem-1-noite',    'name','Hospedagem de 1 Noite',        'description','Contribuição para uma noite no hotel.',            'amount',560,  'category','Lua de Mel','icon','🏨', 'enabled',true),
          jsonb_build_object('id','tour-privativo',        'name','Tour Privativo',               'description','Um dia de passeio com guia local.',                'amount',650,  'category','Lua de Mel','icon','🗺️','enabled',true),
          jsonb_build_object('id','ensaio-fotografico',    'name','Ensaio Fotográfico',           'description','Registro do nosso começo em viagem.',              'amount',740,  'category','Lua de Mel','icon','📸', 'enabled',true),
          jsonb_build_object('id','experiencia-premium',   'name','Experiência Premium',          'description','Uma experiência única na viagem.',                 'amount',820,  'category','Lua de Mel','icon','✨', 'enabled',true),
          jsonb_build_object('id','passagem-aerea-casal',  'name','Passagem Aérea do Casal',      'description','Contribuição para nossas passagens de ida.',       'amount',849,  'category','Lua de Mel','icon','✈️','enabled',true),
          jsonb_build_object('id','cota-lua-de-mel-completa','name','Cota Lua de Mel Completa',   'description','Contribuição para tornar essa viagem perfeita.',   'amount',999,  'category','Lua de Mel','icon','💛', 'enabled',true)
        )
      ),
      'home', jsonb_build_object(
        'enabled',  true,
        'title',    'Lista para Casa',
        'subtitle', 'Itens para construir o nosso lar juntos.',
        'items', jsonb_build_array(
          jsonb_build_object('id','jogo-cama',         'name','Jogo de Cama',          'description','Conforto para noites ainda mais especiais.',            'amount',210,  'category','Casa','icon','🛏️','enabled',true),
          jsonb_build_object('id','jogo-toalhas',      'name','Jogo de Toalhas',       'description','Um mimo útil para o enxoval.',                         'amount',130,  'category','Casa','icon','🧺', 'enabled',true),
          jsonb_build_object('id','faqueiro',          'name','Faqueiro',              'description','Para receber visitas com elegância.',                   'amount',170,  'category','Casa','icon','🍴', 'enabled',true),
          jsonb_build_object('id','aparelho-jantar',   'name','Aparelho de Jantar',    'description','Para celebrar refeições em família.',                   'amount',320,  'category','Casa','icon','🍽️','enabled',true),
          jsonb_build_object('id','aspirador',         'name','Aspirador de Pó',       'description','Mais praticidade na rotina da limpeza.',                'amount',450,  'category','Casa','icon','🧹', 'enabled',true),
          jsonb_build_object('id','microondas',        'name','Micro-ondas',           'description','Agilidade para refeições e aquecimentos.',              'amount',590,  'category','Casa','icon','🔥', 'enabled',true),
          jsonb_build_object('id','rack-sala',         'name','Rack para Sala',        'description','Um toque especial para o cantinho da sala.',            'amount',720,  'category','Casa','icon','🛋️','enabled',true),
          jsonb_build_object('id','geladeira',         'name','Cota Geladeira',        'description','Contribuição para um item essencial da casa.',          'amount',990,  'category','Casa','icon','🧊', 'enabled',true)
        )
      )
    )
  )
);


-- ============================================================
-- SEÇÃO 7 — Atualizar tabelas existentes com a FK uuid
-- (Executar APÓS a Seção 6 — o evento precisa existir)
-- ============================================================

update rsvp_confirmations
set event_uuid = (select id from events where slug = 'siannah-diego-2026')
where event_id = 'siannah-diego-2026'
  and event_uuid is null;

update guest_tokens
set event_uuid = (select id from events where slug = 'siannah-diego-2026')
where event_id = 'siannah-diego-2026'
  and event_uuid is null;


-- ============================================================
-- VALIDAÇÃO — Executar após tudo para confirmar integridade
-- ============================================================

-- 1. Evento criado com os dados corretos
select id, slug, couple_names, event_date, is_active
from events
where slug = 'siannah-diego-2026';

-- 2. Três registros de presentes
select type, enabled, sort_order
from event_gifts
where event_id = (select id from events where slug = 'siannah-diego-2026')
order by sort_order;

-- 3. Contagem de rsvp_confirmations atualizados com UUID
select count(*) as total_with_uuid
from rsvp_confirmations
where event_uuid = (select id from events where slug = 'siannah-diego-2026');

-- 4. Contagem de guest_tokens atualizados com UUID
select count(*) as total_with_uuid
from guest_tokens
where event_uuid = (select id from events where slug = 'siannah-diego-2026');

-- 5. Bucket de Storage criado
select id, name, public
from storage.buckets
where id = 'event-media';


-- ============================================================
-- LEMBRETE PÓS-EXECUÇÃO
-- ============================================================
-- 1. Faça upload manual das fotos no Supabase Dashboard → Storage:
--    - Criar pasta: {event_uuid}/hero/
--    - Upload: assets/images/couple/casal.png  →  {event_uuid}/hero/casal.png
--    - Criar pasta: {event_uuid}/gallery/
--    - Upload: assets/images/gallery/foto1.png, foto2.png, foto3.png
--
-- 2. Após o upload, copie a URL pública de cada arquivo e execute:
--    update events
--    set config = jsonb_set(
--      config,
--      '{hero_image_url}',
--      to_jsonb('<URL_PUBLICA_AQUI>'::text),
--      true
--    )
--    where slug = 'siannah-diego-2026';
--
-- 3. Verifique no Supabase Dashboard → Authentication → Users que
--    ddiego533@gmail.com tem status "Confirmed". Se necessário, reenvie
--    o e-mail de confirmação ou confirme manualmente.
-- ============================================================
