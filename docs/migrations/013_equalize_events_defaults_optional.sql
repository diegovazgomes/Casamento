-- ============================================================
-- Migration 013 - Equalizacao opcional de defaults em events
-- Objetivo: alinhar defaults e nulabilidade de public.events ao
-- snapshot de desenvolvimento.
--
-- Esta migration e opcional porque muda o contrato da tabela:
-- apos aplica-la, inserts/updates que tentarem gravar NULL nos
-- campos abaixo passarao a falhar.
--
-- Rodar apenas depois de validar que nenhum processo externo grava
-- NULL nesses campos.
-- ============================================================

BEGIN;

UPDATE public.events
SET
  couple_names = COALESCE(couple_names, ''),
  bride_name = COALESCE(bride_name, ''),
  groom_name = COALESCE(groom_name, ''),
  venue_name = COALESCE(venue_name, ''),
  venue_address = COALESCE(venue_address, ''),
  venue_maps_link = COALESCE(venue_maps_link, '');

ALTER TABLE public.events
  ALTER COLUMN couple_names SET DEFAULT '',
  ALTER COLUMN bride_name SET DEFAULT '',
  ALTER COLUMN groom_name SET DEFAULT '',
  ALTER COLUMN venue_name SET DEFAULT '',
  ALTER COLUMN venue_address SET DEFAULT '',
  ALTER COLUMN venue_maps_link SET DEFAULT '';

ALTER TABLE public.events
  ALTER COLUMN couple_names SET NOT NULL,
  ALTER COLUMN bride_name SET NOT NULL,
  ALTER COLUMN groom_name SET NOT NULL,
  ALTER COLUMN venue_name SET NOT NULL,
  ALTER COLUMN venue_address SET NOT NULL,
  ALTER COLUMN venue_maps_link SET NOT NULL;

COMMIT;

