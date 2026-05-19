-- ============================================================
-- Migration 003 — Adicionar catálogos "Nosso Lar" e "Ajuda no Casamento"
-- Pré-requisito: 001_create_events_tables.sql já executado
-- Idempotente: usa WHERE NOT EXISTS, não altera registros existentes,
--              não toca na tabela events nem deleta nada.
-- ============================================================

DO $$
DECLARE
  v_event_id uuid;
BEGIN

  -- Busca o evento pelo slug (sem hardcoded UUID)
  SELECT id INTO v_event_id
  FROM public.events
  WHERE slug = 'siannah-diego-2026';

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Evento "siannah-diego-2026" não encontrado. Execute 002_seed_siannah_diego.sql primeiro.';
  END IF;

  -- ── Catálogo: Nosso Lar ──────────────────────────────────
  INSERT INTO public.event_gifts (event_id, type, enabled, sort_order, config)
  SELECT
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
  WHERE NOT EXISTS (
    SELECT 1 FROM public.event_gifts
    WHERE event_id = v_event_id
      AND type = 'catalog'
      AND config->>'key' = 'couple'
  );

  -- ── Catálogo: Ajuda no Casamento ─────────────────────────
  INSERT INTO public.event_gifts (event_id, type, enabled, sort_order, config)
  SELECT
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
  WHERE NOT EXISTS (
    SELECT 1 FROM public.event_gifts
    WHERE event_id = v_event_id
      AND type = 'catalog'
      AND config->>'key' = 'wedding'
  );

  RAISE NOTICE 'Migration 003 concluída. event_id = %', v_event_id;

END $$;
