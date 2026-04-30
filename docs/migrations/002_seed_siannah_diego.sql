-- ============================================================
-- Seed 002 — Dados iniciais: Siannah & Diego
-- ATENÇÃO: executar após 001_create_events_tables.sql
-- Substitua <USER_ID_DO_SUPABASE_AUTH> pelo UUID real do usuário
--   ddiego533@gmail.com no Supabase Auth Dashboard
-- ============================================================

DO $$
DECLARE
  v_event_id uuid;
BEGIN

  -- ── 1. Inserir evento principal ────────────────────────────
  INSERT INTO public.events (
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
    active_theme,
    active_layout,
    is_active,
    config
  ) VALUES (
    'siannah-diego-2026',
    '<USER_ID_DO_SUPABASE_AUTH>'::uuid,
    'Siannah & Diego',
    'Siannah',
    'Diego',
    '2026-09-06',
    '17:00:00',
    'Mansão Ilha de Capri',
    'Rodovia Anchieta, SP-150, km 28, São Bernardo do Campo - SP',
    'https://www.google.com/maps/dir//Ilha+de+Capri+Buffet+Eventos,+Rodovia+Anchieta,+SP-150,+km+28+-+Vila+Balnearia,+S%C3%A3o+Bernardo+do+Campo+-+SP,+09822-250/@-23.6611535,-46.6029821,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x94ce41794f164f17:0x93eaef9188424c1b!2m2!1d-46.535788!2d-23.767335?entry=ttu&g_ep=EgoyMDI2MDQwMS4wIKXMDSoASAFQAw%3D%3D',
    'classic-gold',
    'classic',
    true,
    '{
  "event": {
    "heroDate": "06 . 09 . 2026",
    "detailDate": "06 Set 2026",
    "weekday": "Domingo",
    "displayDate": "06 de setembro de 2026",
    "timezone": "Horário de Brasília",
    "locationCity": "São Bernardo do Campo",
    "mapEnabled": true,
    "venueCoordinates": {
      "lat": -23.8545,
      "lng": -46.5797
    }
  },
  "texts": {
    "metaTitle": "Siannah & Diego - Casamento",
    "metaDescription": "Siannah e Diego convidam você para celebrar o casamento em uma noite elegante e inesquecível.",
    "themeColor": "#1a1714",
    "introLabel": "Convite",
    "intro": "Um momento pensado para viver ao lado de quem faz parte da nossa vida.",
    "heroLabel": "Você foi convidado para o casamento de",
    "heroPhotoAlt": "Siannah e Diego em retrato do casal",
    "countdownTag": "Contagem Regressiva",
    "countdownTitle": "O grande dia se aproxima!",
    "countdownFinished": "O grande dia chegou.",
    "detailsTag": "Detalhes da Cerimônia",
    "detailsTitle": "O início de tudo o que queremos viver juntos.",
    "detailsIntro": "Uma celebração íntima, pensada para compartilhar esse momento com quem faz parte da nossa história.",
    "detailsDateLabel": "Data",
    "detailsTimeLabel": "Horário",
    "detailsLocationLabel": "Local",
    "detailsOccasionLabel": "Ocasião",
    "detailsOccasionValue": "Cerimônia & Recepção",
    "detailsOccasionSub": "Traje esporte fino",
    "detailsLocationHint": "📍 Abrir no mapa",
    "detailsGiftTitle": "Presente",
    "detailsGiftValue": "Para nos presentear",
    "detailsGiftSub": "Abrir opções",
    "rsvpTag": "Confirmação de Presença",
    "rsvpTitle": "Esperamos você.",
    "rsvpSubtitle": "Pedimos, por gentileza, que confirme sua presença o quanto antes. Sua presença tornará este momento ainda mais especial para nós.",
    "rsvpFormTitle": "Confirmar Presença",
    "rsvpFormSubtitle": "Preencha os dados para registrar sua confirmação com a gente.",
    "rsvpPlaceholderName": "Seu nome completo",
    "rsvpPlaceholderPhone": "Seu WhatsApp",
    "rsvpYesLabel": "Confirmo presença",
    "rsvpNoLabel": "Não poderei ir",
    "rsvpSubmit": "Enviar confirmação aos noivos",
    "rsvpSuccessFaqHint": "Se ainda tiver dúvidas, a área de FAQ acima pode te ajudar. Se preferir falar diretamente com a gente, use o botão abaixo.",
    "rsvpSuccessContactButton": "Falar com os noivos no WhatsApp",
    "giftTag": "Presente",
    "giftTitle": "Para nos presentear",
    "giftIntro": "Sua presença já é o nosso maior presente. Mas, se desejar nos presentear de outra forma, deixamos abaixo algumas opções com carinho.",
    "giftPixTag": "Pix",
    "giftPixTitle": "Pix do casal",
    "giftPixDescription": "Se preferir, você pode nos presentear por Pix usando o QR Code ou o código abaixo.",
    "giftPixCopyLabel": "Pix copia e cola",
    "giftPixCopyButton": "Copiar código Pix",
    "giftCardTag": "Pagamento por cartão",
    "giftCardTitle": "Pagamento por cartão 💳",
    "giftCardBody": "Se preferir, você pode nos presentear através do Cartão de crédito (possibilidade de parcelamento).",
    "giftCardPlaceholder": "Ir para link de pagamento",
    "backToHomeButton": "Voltar para o início",
    "backToExtrasButton": "Voltar para página principal",
    "giftOverlayCloseButton": "Fechar",
    "giftOverlayBackButton": "Voltar para confirmação",
    "footerNote": "06 . 09 . 2026 | São Bernardo do Campo"
  },
  "media": {
    "heroImage": "assets/images/couple/casal.png",
    "tracks": {
      "main": {
        "src": "assets/audio/main-theme.mp3",
        "volume": 0,
        "startTime": 8
      },
      "gift": {
        "src": "assets/audio/gift-theme.mp3",
        "volume": 0,
        "startTime": 78
      }
    }
  },
  "rsvp": {
    "eventId": "siannah-diego-2026",
    "supabaseEnabled": true
  },
  "whatsapp": {
    "destinationPhone": "5511949606377",
    "recipientName": "Siannah",
    "redirectDelayMs": 5000,
    "messages": {
      "attending": "Olá, {recipientName}!\n\nAqui é {name}.\nMeu WhatsApp para contato é {phone}.\nEstou passando para confirmar minha presença no casamento.\n\nNos vemos em breve.",
      "notAttending": "Olá, {recipientName}!\n\nAqui é {name}.\nMeu WhatsApp para contato é {phone}.\nInfelizmente, não poderei estar presente no casamento.\n\nAgradeço muito pelo convite e desejo um dia lindo para vocês."
    },
    "feedback": {
      "attending": {
        "title": "Presença confirmada, {firstName}.",
        "subtitle": "Sua confirmação foi registrada com carinho. Estamos muito felizes em celebrar esse momento com você.",
        "note": ""
      },
      "notAttending": {
        "title": "Obrigada pelo aviso, {firstName}.",
        "subtitle": "Seu retorno foi registrado com carinho. Agradecemos por nos avisar.",
        "note": ""
      },
      "error": {
        "title": "Faltam alguns dados para continuar.",
        "subtitle": "Revise os campos destacados e tente novamente.",
        "note": ""
      }
    }
  },
  "pages": {
    "historia": {
      "enabled": true,
      "cardLabel": "Nossa História",
      "cardHint": "Ler nossa história",
      "content": {
        "tag": "Nossa História",
        "title": "Como tudo começou",
        "intro": "Uma história que é nossa, e que a partir de setembro passa a ser de vocês também.",
        "gallery": [
          {
            "src": "assets/images/gallery/foto1.png",
            "alt": "Foto 1"
          },
          {
            "src": "assets/images/gallery/foto2.png",
            "alt": "Foto 2"
          },
          {
            "src": "assets/images/gallery/foto3.png",
            "alt": "Foto 3"
          }
        ],
        "chapters": [
          {
            "year": "2013",
            "title": "O primeiro encontro",
            "text": "Essa história começou em junho de 2013, quando passaram a trabalhar juntos em uma empresa de telemarketing. Para Diego, foi paixão à primeira vista. Para Siannah, nem tanto… rs. Mas, aos poucos, ele foi conquistando o coração dela, e assim começou essa linda história de amor."
          },
          {
            "year": "2023",
            "title": "O pedido",
            "text": "Descreva aqui como foi o pedido de namoro ou noivado."
          },
          {
            "year": "2026",
            "title": "O grande dia",
            "text": "E agora, queremos compartilhar este momento com você."
          }
        ]
      }
    },
    "faq": {
      "enabled": true,
      "cardLabel": "Dúvidas Frequentes",
      "cardHint": "Ver perguntas",
      "content": {
        "tag": "FAQ",
        "title": "Tudo que você precisa saber",
        "intro": "Reunimos as perguntas mais frequentes para facilitar o seu preparo.",
        "items": [
          {
            "question": "Qual valor do convite avulço?",
            "answer": "R$100,00 por pessoa"
          },
          {
            "question": "Qual o dresscode da festa?",
            "answer": "Apenas roupas da lacoste"
          },
          {
            "question": "Tem estacionamento no local?",
            "answer": "Sim. O estacionamento é cobrado R$40,00 por veículo"
          }
        ]
      }
    },
    "hospedagem": {
      "enabled": true,
      "cardLabel": "Para Quem Vem de Fora",
      "cardHint": "Ver opções",
      "content": {
        "tag": "Para Quem Vem de Fora",
        "title": "Fique à vontade para explorar",
        "intro": "Selecionamos algumas opções próximas ao local da festa para tornar sua estadia mais fácil.",
        "hotelsTitle": "Hospedagem",
        "hotels": [
          {
            "name": "Pampas Palace Hotel",
            "description": "A 10 minutos do local. Café da manhã incluído.",
            "link": "https://www.pampaspalacehotel.com.br/",
            "linkLabel": "Ver hotel"
          },
          {
            "name": "",
            "description": "",
            "link": "",
            "linkLabel": "Ver hotel"
          }
        ],
        "restaurantsTitle": "Restaurantes",
        "restaurants": [
          {
            "name": "Raphaela Bolos",
            "description": "Melhor ovo de Páscoa da América Latina",
            "link": "https://raphaconfeitaria.menudino.com/",
            "linkLabel": "Ver na web"
          },
          {
            "name": "",
            "description": "",
            "link": "",
            "linkLabel": "Ver no Maps"
          }
        ]
      }
    },
    "mensagem": {
      "enabled": true,
      "cardLabel": "Mensagem ao Casal",
      "cardHint": "Deixar recado",
      "content": {
        "tag": "Mensagem ao Casal",
        "title": "Deixe uma mensagem de carinho",
        "intro": "Seu recado vai deixar esse momento ainda mais especial para nós.",
        "formTitle": "Escreva para nós",
        "formSubtitle": "Você pode deixar seu nome e uma mensagem que prepararemos para guardar com carinho.",
        "nameLabel": "Seu nome (opcional)",
        "messageLabel": "Sua mensagem",
        "namePlaceholder": "Como podemos te chamar?",
        "messagePlaceholder": "Escreva aqui sua mensagem de carinho...",
        "submitLabel": "Enviar mensagem aos noivos",
        "successMessage": "Mensagem enviada com carinho. Obrigado por deixar seu recado para nós.",
        "errorMessage": "Não foi possível enviar sua mensagem agora. Tente novamente."
      }
    },
    "musica": {
      "enabled": true,
      "cardLabel": "Sugerir Música",
      "cardHint": "Para a festa",
      "content": {
        "tag": "Sugestão de Música",
        "title": "Qual música não pode faltar?",
        "intro": "Sugira uma música para tocar na nossa festa e ajudar a montar a trilha desse dia.",
        "formTitle": "Envie sua sugestão",
        "formSubtitle": "Compartilhe ao menos o nome da música. Se quiser, inclua artista e observações.",
        "nameLabel": "Seu nome (opcional)",
        "songLabel": "Nome da música",
        "artistLabel": "Artista (opcional)",
        "notesLabel": "Observações (opcional)",
        "namePlaceholder": "Como podemos te chamar?",
        "songPlaceholder": "Ex: Velha Infância",
        "artistPlaceholder": "Ex: Tribalistas",
        "notesPlaceholder": "Diga por que essa música é especial...",
        "submitLabel": "Enviar sugestão aos noivos",
        "successMessage": "Sugestão enviada com sucesso. Obrigado por ajudar a montar a trilha da nossa festa.",
        "errorMessage": "Não foi possível enviar sua sugestão agora. Tente novamente."
      }
    },
    "presente": {
      "enabled": true,
      "cardLabel": "Lista de Presentes",
      "cardHint": "Ver opções"
    }
  },
  "dashboard": {
    "enabled": true,
    "eventId": "siannah-diego-2026",
    "reminderTemplates": {
      "pending": "Olá! Ainda não recebemos sua confirmação para o casamento de Siannah & Diego. Por favor, confirme sua presença através do link que recebeu.",
      "thankyou": "Obrigado por confirmar sua presença no casamento de Siannah & Diego! Fique atento para mais informações nos próximos dias.",
      "announcement": "Oi! Temos uma informação importante sobre o casamento de Siannah & Diego. Verifique seu email ou o convite online."
    }
  }
}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    couple_names    = EXCLUDED.couple_names,
    bride_name      = EXCLUDED.bride_name,
    groom_name      = EXCLUDED.groom_name,
    event_date      = EXCLUDED.event_date,
    event_time      = EXCLUDED.event_time,
    venue_name      = EXCLUDED.venue_name,
    venue_address   = EXCLUDED.venue_address,
    venue_maps_link = EXCLUDED.venue_maps_link,
    active_theme    = EXCLUDED.active_theme,
    active_layout   = EXCLUDED.active_layout,
    config          = EXCLUDED.config,
    updated_at      = now()
  RETURNING id INTO v_event_id;

  -- ── 2. Remover presentes anteriores (idempotência) ─────────
  DELETE FROM public.event_gifts
  WHERE event_id = v_event_id;

  -- ── 3. Inserir lista de presentes ──────────────────────────

  -- 3a. Pix
  INSERT INTO public.event_gifts (event_id, type, enabled, sort_order, config)
  VALUES (
    v_event_id,
    'pix',
    true,
    1,
    '{
  "pixKey": "c7806bc8-831c-4a41-8bd5-80862fe13584",
  "pixQrImage": "assets/images/icons/IMG_8732.jpeg",
  "name": "Pix do casal",
  "bank": ""
}'::jsonb
  );

  -- 3b. Cartão (Mercado Pago)
  INSERT INTO public.event_gifts (event_id, type, enabled, sort_order, config)
  VALUES (
    v_event_id,
    'card',
    true,
    2,
    '{
  "cardPaymentLink": "https://link.mercadopago.com.br/diegovaz",
  "cardPaymentLabel": "Ir para link de pagamento"
}'::jsonb
  );

  -- 3c. Catálogo — Lua de Mel (12 itens)
  INSERT INTO public.event_gifts (event_id, type, enabled, sort_order, config)
  VALUES (
    v_event_id,
    'catalog',
    true,
    3,
    '{
  "key": "honeymoon",
  "title": "Lista de Lua de Mel",
  "subtitle": "Sugestões para celebrar nossa primeira viagem como casados.",
  "items": [
    {
      "id": "taxas-embarque",
      "name": "Taxas de Embarque",
      "description": "Ajuda com taxas e bagagens da viagem.",
      "amount": 140,
      "category": "Lua de Mel",
      "icon": "🧳",
      "enabled": true
    },
    {
      "id": "traslado-aeroporto",
      "name": "Traslado Aeroporto-Hotel",
      "description": "Transporte seguro na chegada e saída.",
      "amount": 200,
      "category": "Lua de Mel",
      "icon": "🚕",
      "enabled": true
    },
    {
      "id": "jantar-romantico",
      "name": "Jantar Romântico",
      "description": "Um jantar especial a dois na viagem.",
      "amount": 299,
      "category": "Lua de Mel",
      "icon": "🍽️",
      "enabled": true
    },
    {
      "id": "passeio-barco",
      "name": "Passeio de Barco",
      "description": "Experiência inesquecível em alto-mar.",
      "amount": 317,
      "category": "Lua de Mel",
      "icon": "⛵",
      "enabled": true
    },
    {
      "id": "jantar-celebracao",
      "name": "Jantar de Celebração",
      "description": "Noite especial para celebrar esse momento.",
      "amount": 390,
      "category": "Lua de Mel",
      "icon": "🥂",
      "enabled": true
    },
    {
      "id": "spa-casal",
      "name": "Spa para o Casal",
      "description": "Momento de relaxamento durante a lua de mel.",
      "amount": 470,
      "category": "Lua de Mel",
      "icon": "🧖",
      "enabled": true
    },
    {
      "id": "hospedagem-1-noite",
      "name": "Hospedagem de 1 Noite",
      "description": "Contribuição para uma noite no hotel.",
      "amount": 560,
      "category": "Lua de Mel",
      "icon": "🏨",
      "enabled": true
    },
    {
      "id": "tour-privativo",
      "name": "Tour Privativo",
      "description": "Um dia de passeio com guia local.",
      "amount": 650,
      "category": "Lua de Mel",
      "icon": "🗺️",
      "enabled": true
    },
    {
      "id": "ensaio-fotografico",
      "name": "Ensaio Fotográfico",
      "description": "Registro do nosso começo em viagem.",
      "amount": 740,
      "category": "Lua de Mel",
      "icon": "📸",
      "enabled": true
    },
    {
      "id": "experiencia-premium",
      "name": "Experiência Premium",
      "description": "Uma experiência única na viagem.",
      "amount": 820,
      "category": "Lua de Mel",
      "icon": "✨",
      "enabled": true
    },
    {
      "id": "passagem-aerea-casal",
      "name": "Passagem Aérea do Casal",
      "description": "Contribuição para nossas passagens de ida.",
      "amount": 849,
      "category": "Lua de Mel",
      "icon": "✈️",
      "enabled": true
    },
    {
      "id": "cota-lua-de-mel-completa",
      "name": "Cota Lua de Mel Completa",
      "description": "Contribuição para tornar essa viagem perfeita.",
      "amount": 999,
      "category": "Lua de Mel",
      "icon": "💛",
      "enabled": true
    }
  ]
}'::jsonb
  );

  -- 3d. Catálogo — Lista para Casa (12 itens)
  INSERT INTO public.event_gifts (event_id, type, enabled, sort_order, config)
  VALUES (
    v_event_id,
    'catalog',
    true,
    4,
    '{
  "key": "home",
  "title": "Lista para Casa",
  "subtitle": "Sugestões para montar e deixar nosso novo lar ainda mais especial.",
  "items": [
    {
      "id": "jogo-panelas",
      "name": "Jogo de Panelas",
      "description": "Para preparar muitas receitas no novo lar.",
      "amount": 220,
      "category": "Casa",
      "icon": "🍳",
      "enabled": true
    },
    {
      "id": "airfryer",
      "name": "Airfryer",
      "description": "Praticidade para o dia a dia da casa.",
      "amount": 380,
      "category": "Casa",
      "icon": "🍟",
      "enabled": true
    },
    {
      "id": "liquidificador",
      "name": "Liquidificador",
      "description": "Essencial para sucos, vitaminas e receitas.",
      "amount": 190,
      "category": "Casa",
      "icon": "🥤",
      "enabled": true
    },
    {
      "id": "cafeteira",
      "name": "Cafeteira",
      "description": "Para começar o dia com energia e carinho.",
      "amount": 260,
      "category": "Casa",
      "icon": "☕",
      "enabled": true
    },
    {
      "id": "jogo-cama",
      "name": "Jogo de Cama",
      "description": "Conforto para noites ainda mais especiais.",
      "amount": 210,
      "category": "Casa",
      "icon": "🛏️",
      "enabled": true
    },
    {
      "id": "jogo-toalhas",
      "name": "Jogo de Toalhas",
      "description": "Um mimo útil para o enxoval.",
      "amount": 130,
      "category": "Casa",
      "icon": "🧺",
      "enabled": true
    },
    {
      "id": "faqueiro",
      "name": "Faqueiro",
      "description": "Para receber visitas com elegância.",
      "amount": 170,
      "category": "Casa",
      "icon": "🍴",
      "enabled": true
    },
    {
      "id": "aparelho-jantar",
      "name": "Aparelho de Jantar",
      "description": "Para celebrar refeições em família.",
      "amount": 320,
      "category": "Casa",
      "icon": "🍽️",
      "enabled": true
    },
    {
      "id": "aspirador",
      "name": "Aspirador de Pó",
      "description": "Mais praticidade na rotina da limpeza.",
      "amount": 450,
      "category": "Casa",
      "icon": "🧹",
      "enabled": true
    },
    {
      "id": "microondas",
      "name": "Micro-ondas",
      "description": "Agilidade para refeições e aquecimentos.",
      "amount": 590,
      "category": "Casa",
      "icon": "🔥",
      "enabled": true
    },
    {
      "id": "rack-sala",
      "name": "Rack para Sala",
      "description": "Um toque especial para o cantinho da sala.",
      "amount": 720,
      "category": "Casa",
      "icon": "🛋️",
      "enabled": true
    },
    {
      "id": "geladeira",
      "name": "Cota Geladeira",
      "description": "Contribuição para um item essencial da casa.",
      "amount": 990,
      "category": "Casa",
      "icon": "🧊",
      "enabled": true
    }
  ]
}'::jsonb
  );

  -- 3e. Catálogo — Nosso Lar (12 itens)
  INSERT INTO public.event_gifts (event_id, type, enabled, sort_order, config)
  VALUES (
    v_event_id,
    'catalog',
    true,
    5,
    '{
  "key": "couple",
  "title": "Nosso Lar",
  "subtitle": "Itens especiais para elevar o dia a dia de quem já divide o mesmo espaço.",
  "items": [
    { "id": "c1",  "name": "Jogo de Panelas Premium",     "description": "Linha profissional antiaderente.",       "amount": 890,  "icon": "🍳", "category": "Nosso Lar", "enabled": true },
    { "id": "c2",  "name": "Máquina de Café Espresso",    "description": "Café de barista em casa.",               "amount": 1200, "icon": "☕", "category": "Nosso Lar", "enabled": true },
    { "id": "c3",  "name": "Robô Aspirador",              "description": "Limpeza automática e inteligente.",      "amount": 1500, "icon": "🤖", "category": "Nosso Lar", "enabled": true },
    { "id": "c4",  "name": "Adega Climatizada",           "description": "Para os momentos especiais a dois.",     "amount": 1800, "icon": "🍷", "category": "Nosso Lar", "enabled": true },
    { "id": "c5",  "name": "Smart TV 55",                 "description": "Experiência cinematográfica em casa.",   "amount": 2500, "icon": "📺", "category": "Nosso Lar", "enabled": true },
    { "id": "c6",  "name": "Jogo de Cama King Premium",   "description": "Algodão egípcio 400 fios.",             "amount": 650,  "icon": "🛏️", "category": "Nosso Lar", "enabled": true },
    { "id": "c7",  "name": "Fritadeira Airfryer XL",      "description": "Cozinhar saudável e prático.",          "amount": 480,  "icon": "🥘", "category": "Nosso Lar", "enabled": true },
    { "id": "c8",  "name": "Purificador de Água",         "description": "Água gelada e filtrada sempre.",        "amount": 720,  "icon": "💧", "category": "Nosso Lar", "enabled": true },
    { "id": "c9",  "name": "Conjunto de Toalhas Finas",   "description": "Coleção hoteleira de linho.",           "amount": 380,  "icon": "🛁", "category": "Nosso Lar", "enabled": true },
    { "id": "c10", "name": "Liquidificador de Alta Pot.", "description": "Vitaminas e smoothies perfeitos.",      "amount": 560,  "icon": "🥤", "category": "Nosso Lar", "enabled": true },
    { "id": "c11", "name": "Jogo de Facas Profissional",  "description": "Aço alemão com estojo.",                "amount": 420,  "icon": "🔪", "category": "Nosso Lar", "enabled": true },
    { "id": "c12", "name": "Caixa de Som Premium",        "description": "Som ambiente para todo o lar.",         "amount": 900,  "icon": "🔊", "category": "Nosso Lar", "enabled": true }
  ]
}'::jsonb
  );

  -- 3f. Catálogo — Ajuda no Casamento (12 itens)
  INSERT INTO public.event_gifts (event_id, type, enabled, sort_order, config)
  VALUES (
    v_event_id,
    'catalog',
    true,
    6,
    '{
  "key": "wedding",
  "title": "Ajuda no Casamento",
  "subtitle": "Contribua para tornar esse dia ainda mais especial e inesquecível.",
  "items": [
    { "id": "w1",  "name": "Decoração Floral",            "description": "Flores e arranjos para o grande dia.",  "amount": 1500, "icon": "💐", "category": "Casamento", "enabled": true },
    { "id": "w2",  "name": "Bolo de Casamento",           "description": "Bolo personalizado para a festa.",      "amount": 1200, "icon": "🎂", "category": "Casamento", "enabled": true },
    { "id": "w3",  "name": "Fotografia",                  "description": "Registro profissional da cerimônia.",   "amount": 3500, "icon": "📷", "category": "Casamento", "enabled": true },
    { "id": "w4",  "name": "Filmagem",                    "description": "Vídeo cinematográfico do casamento.",   "amount": 3000, "icon": "🎥", "category": "Casamento", "enabled": true },
    { "id": "w5",  "name": "DJ e Sonorização",            "description": "Música para animar a festa toda.",      "amount": 2500, "icon": "🎧", "category": "Casamento", "enabled": true },
    { "id": "w6",  "name": "Bem-casados",                 "description": "Lembrancinhas para os convidados.",     "amount": 800,  "icon": "🍬", "category": "Casamento", "enabled": true },
    { "id": "w7",  "name": "Convites Impressos",          "description": "Arte e impressão dos convites.",        "amount": 600,  "icon": "✉️", "category": "Casamento", "enabled": true },
    { "id": "w8",  "name": "Maquiagem da Noiva",          "description": "Make profissional para a noiva.",       "amount": 900,  "icon": "💄", "category": "Casamento", "enabled": true },
    { "id": "w9",  "name": "Aluguel do Espaço",           "description": "Contribuição para o local da festa.",   "amount": 5000, "icon": "🏛️", "category": "Casamento", "enabled": true },
    { "id": "w10", "name": "Doces e Mesa de Guloseimas",  "description": "Candy bar para a festa.",               "amount": 1000, "icon": "🍭", "category": "Casamento", "enabled": true },
    { "id": "w11", "name": "Cerimonialista",              "description": "Coordenação profissional do evento.",   "amount": 2000, "icon": "📋", "category": "Casamento", "enabled": true },
    { "id": "w12", "name": "Contribuição Livre",          "description": "Qualquer valor é bem-vindo e amado.",   "amount": 200,  "icon": "💛", "category": "Casamento", "enabled": true }
  ]
}'::jsonb
  );

  RAISE NOTICE 'Seed concluído. event_id = %', v_event_id;

END $$;
