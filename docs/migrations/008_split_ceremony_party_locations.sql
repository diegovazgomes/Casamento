-- 008_split_ceremony_party_locations.sql
-- Separa local de cerimonia e local da festa no modelo de dados.

begin;

alter table public.events
  add column if not exists ceremony_name text,
  add column if not exists ceremony_address text,
  add column if not exists ceremony_maps_link text,
  add column if not exists ceremony_coordinates jsonb,
  add column if not exists party_name text,
  add column if not exists party_address text,
  add column if not exists party_maps_link text,
  add column if not exists party_coordinates jsonb;

-- Backfill de festa com legado venue_*.
update public.events
set
  party_name = coalesce(nullif(trim(party_name), ''), venue_name),
  party_address = coalesce(nullif(trim(party_address), ''), venue_address),
  party_maps_link = coalesce(nullif(trim(party_maps_link), ''), venue_maps_link),
  party_coordinates = coalesce(party_coordinates, venue_coordinates)
where
  party_name is null
  or party_address is null
  or party_maps_link is null
  or party_coordinates is null;

-- Backfill de cerimonia: se nao houver dados dedicados, replica festa.
update public.events
set
  ceremony_name = coalesce(nullif(trim(ceremony_name), ''), party_name),
  ceremony_address = coalesce(nullif(trim(ceremony_address), ''), party_address),
  ceremony_maps_link = coalesce(nullif(trim(ceremony_maps_link), ''), party_maps_link),
  ceremony_coordinates = coalesce(ceremony_coordinates, party_coordinates)
where
  ceremony_name is null
  or ceremony_address is null
  or ceremony_maps_link is null
  or ceremony_coordinates is null;

-- Sincroniza JSONB config.event com o novo contrato.
update public.events
set config =
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  coalesce(config, '{}'::jsonb),
                  '{event,partyLocationName}',
                  to_jsonb(coalesce(nullif(trim(party_name), ''), venue_name, '')),
                  true
                ),
                '{event,partyAddress}',
                to_jsonb(coalesce(nullif(trim(party_address), ''), venue_address, '')),
                true
              ),
              '{event,partyMapsLink}',
              to_jsonb(coalesce(nullif(trim(party_maps_link), ''), venue_maps_link, '')),
              true
            ),
            '{event,partyCoordinates}',
            coalesce(party_coordinates, venue_coordinates, '{}'::jsonb),
            true
          ),
          '{event,ceremonyLocationName}',
          to_jsonb(coalesce(nullif(trim(ceremony_name), ''), nullif(trim(party_name), ''), venue_name, '')),
          true
        ),
        '{event,ceremonyAddress}',
        to_jsonb(coalesce(nullif(trim(ceremony_address), ''), nullif(trim(party_address), ''), venue_address, '')),
        true
      ),
      '{event,ceremonyMapsLink}',
      to_jsonb(coalesce(nullif(trim(ceremony_maps_link), ''), nullif(trim(party_maps_link), ''), venue_maps_link, '')),
      true
    ),
    '{event,ceremonyCoordinates}',
    coalesce(ceremony_coordinates, party_coordinates, venue_coordinates, '{}'::jsonb),
    true
  )
where true;

commit;
