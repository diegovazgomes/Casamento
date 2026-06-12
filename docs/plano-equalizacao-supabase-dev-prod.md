# Plano de equalizacao Supabase: dev x prod

Objetivo: alinhar o schema de producao ao schema esperado em desenvolvimento sem perder dados, sem remover legado sem decisao explicita e com verificacoes antes/depois.

Arquivos de referencia:
- `tabelas_supabase_dev.md`
- `tabelas_supabase_prod.md`
- `docs/migrations/009_guest_views_analytics_columns.sql`
- `docs/migrations/010_admin_users.sql`
- `docs/migrations/011_platform_events.sql`

## 1. Diagnostico atual

Com base nos snapshots comparados, producao esta atrasada em alguns pontos, mas tambem possui objetos que dev nao possui.

### Existe em dev e nao existe em prod

- `admin_users`
- `platform_events`
- `guest_tokens.event_uuid`
- `rsvp_confirmations.event_uuid`
- Indices de `event_uuid`:
  - `idx_guest_tokens_event_uuid`
  - `idx_rsvp_event_uuid`
- `guest_views.duration_seconds`
- `guest_views.page_path`
- Indice:
  - `idx_views_page_path`
- Indice em `events.is_active`:
  - `idx_events_is_active`

### Existe em prod e nao existe no snapshot de dev

- `couple_credentials`
- Colunas antigas/alternativas em `guest_views`:
  - `user_agent`
  - `viewport_width`
  - `viewport_height`
  - `country_code`
  - `city`

### Divergencias estruturais que permanecem mesmo apos migrations 009, 010 e 011

- Nulabilidade/defaults em `events`:
  - Em dev, varios campos usam `NOT NULL DEFAULT ''`.
  - Em prod, varios campos aceitam `NULL` e `couple_names` nao tem default.
- Nomes diferentes de indices equivalentes:
  - `idx_event_gifts_event_id` em dev.
  - `event_gifts_event_id_idx` em prod.
  - `idx_events_slug` / `idx_events_user_id` em dev.
  - `events_slug_idx` / `events_user_id_idx` em prod.
- Nome diferente do trigger de updated_at em `events`:
  - `events_updated_at` em dev.
  - `events_set_updated_at` em prod.
- A migration `009` adiciona `left_at`, `session_id` e `referrer_page`, que nao aparecem no snapshot atual de dev.

## 2. Principio de execucao

Nao tentar "igualar" apagando objetos de producao no primeiro passo. Primeiro, garantir que producao tenha tudo que o codigo atual precisa. Depois, decidir o que fazer com legado e divergencias cosmeticas.

Prioridade:
1. Compatibilidade funcional do codigo atual.
2. Integridade dos dados existentes.
3. Consistencia futura entre ambientes.
4. Limpeza de legado apenas depois de confirmacao.

## 3. Backup e pre-checks obrigatorios

Antes de qualquer alteracao em producao:

1. Exportar backup do schema e, se possivel, dump dos dados das tabelas afetadas.
2. Confirmar qual projeto Supabase esta apontado como producao.
3. Conferir se ha dados nas tabelas antigas:
   - `couple_credentials`
   - `guest_views`
   - `rsvp_confirmations`
   - `guest_tokens`
4. Confirmar se `docs/migrations/001` a `008` ja foram aplicadas em producao.
5. Rodar consultas de inventario:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'events',
    'guest_views',
    'guest_tokens',
    'rsvp_confirmations',
    'admin_users',
    'platform_events',
    'couple_credentials'
  )
order by table_name, ordinal_position;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'events',
    'event_gifts',
    'guest_views',
    'guest_tokens',
    'rsvp_confirmations',
    'admin_users',
    'platform_events'
  )
order by tablename, indexname;
```

## 4. Fase 1: aplicar migrations necessarias ao codigo atual

Aplicar em producao, nesta ordem:

1. `docs/migrations/009_guest_views_analytics_columns.sql`
2. `docs/migrations/010_admin_users.sql`
3. `docs/migrations/011_platform_events.sql`

Resultado esperado:

- `guest_views` passa a aceitar `duration_seconds` e `page_path`.
- Dashboard de audiencia passa a ter dados melhores.
- Painel admin consegue consultar `admin_users`.
- Analytics da plataforma consegue gravar em `platform_events`.

Observacao: esta fase nao deixa dev e prod identicos. Ela apenas resolve as lacunas mais urgentes para o codigo atual.

## 5. Fase 2: aplicar vinculo UUID entre convites e eventos

Se producao ainda nao tiver `event_uuid`, aplicar:

```sql
alter table public.rsvp_confirmations
  add column if not exists event_uuid uuid references public.events(id) on delete set null;

create index if not exists idx_rsvp_event_uuid
  on public.rsvp_confirmations(event_uuid);

alter table public.guest_tokens
  add column if not exists event_uuid uuid references public.events(id) on delete set null;

create index if not exists idx_guest_tokens_event_uuid
  on public.guest_tokens(event_uuid);
```

Depois, preencher os dados existentes usando o slug/event_id textual:

```sql
update public.rsvp_confirmations rc
set event_uuid = e.id
from public.events e
where rc.event_id = e.slug
  and rc.event_uuid is null;

update public.guest_tokens gt
set event_uuid = e.id
from public.events e
where gt.event_id = e.slug
  and gt.event_uuid is null;
```

Verificacao:

```sql
select event_id, count(*) as total, count(event_uuid) as com_event_uuid
from public.rsvp_confirmations
group by event_id
order by event_id;

select event_id, count(*) as total, count(event_uuid) as com_event_uuid
from public.guest_tokens
group by event_id
order by event_id;
```

## 6. Fase 3: equalizar defaults e nulabilidade de `events`

Esta fase deve ser feita com cuidado porque pode alterar comportamento de inserts futuros.

Campos a alinhar ao snapshot de dev:

- `couple_names text not null default ''`
- `bride_name text not null default ''`
- `groom_name text not null default ''`
- `venue_name text not null default ''`
- `venue_address text not null default ''`
- `venue_maps_link text not null default ''`

Antes de aplicar `NOT NULL`, normalizar valores nulos:

```sql
update public.events
set
  couple_names = coalesce(couple_names, ''),
  bride_name = coalesce(bride_name, ''),
  groom_name = coalesce(groom_name, ''),
  venue_name = coalesce(venue_name, ''),
  venue_address = coalesce(venue_address, ''),
  venue_maps_link = coalesce(venue_maps_link, '');
```

Aplicar defaults e constraints:

```sql
alter table public.events
  alter column couple_names set default '',
  alter column bride_name set default '',
  alter column groom_name set default '',
  alter column venue_name set default '',
  alter column venue_address set default '',
  alter column venue_maps_link set default '';

alter table public.events
  alter column couple_names set not null,
  alter column bride_name set not null,
  alter column groom_name set not null,
  alter column venue_name set not null,
  alter column venue_address set not null,
  alter column venue_maps_link set not null;
```

Verificacao:

```sql
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'events'
  and column_name in (
    'couple_names',
    'bride_name',
    'groom_name',
    'venue_name',
    'venue_address',
    'venue_maps_link'
  )
order by ordinal_position;
```

## 7. Fase 4: indices ausentes

Adicionar os indices que dev possui e prod nao possui:

```sql
create index if not exists idx_events_is_active
  on public.events using btree (is_active);
```

Sobre indices equivalentes com nomes diferentes, existem duas opcoes:

- Manter como esta, se o objetivo for apenas compatibilidade funcional.
- Padronizar nomes depois, em uma janela controlada, porque isso envolve `DROP INDEX` e recriacao.

Recomendacao: manter os indices equivalentes por enquanto. A diferenca de nome nao deve quebrar o codigo da aplicacao.

## 8. Fase 5: decidir legado de producao

### `couple_credentials`

Estado atual:

- Existe em producao.
- Nao existe no snapshot de dev.
- Aparece em documentacao e testes antigos/pulados.
- Nao foi encontrado uso direto no fluxo atual principal da API.

Decisao pendente:

- Manter por compatibilidade historica.
- Migrar dados para outro modelo de autenticacao, se ainda houver uso real.
- Remover somente depois de confirmar que nao ha dependencia externa.

Consulta sugerida:

```sql
select count(*) as total from public.couple_credentials;
select event_id, created_at, updated_at from public.couple_credentials order by created_at desc limit 20;
```

Recomendacao inicial: nao remover nesta rodada.

### Colunas antigas em `guest_views`

Estado atual em producao:

- `user_agent`
- `viewport_width`
- `viewport_height`
- `country_code`
- `city`

Decisao pendente:

- Manter, pois sao dados analiticos potencialmente uteis e nao quebram o codigo.
- Remover apenas se houver decisao clara de reduzir schema.

Recomendacao inicial: manter nesta rodada.

## 9. Fase 6: verificar RLS e policies

As migrations `010` e `011` habilitam RLS e criam policies para `service_role`.

Verificar:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('admin_users', 'platform_events');

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('admin_users', 'platform_events')
order by tablename, policyname;
```

Confirmar tambem que as APIs que escrevem nessas tabelas usam service role no servidor, nao anon key no cliente.

## 10. Fase 7: smoke tests apos migracao

Executar os fluxos principais:

1. Abrir convite publico e confirmar que `guest_views` grava visualizacao.
2. Navegar entre paginas e confirmar `page_path`.
3. Aguardar ou simular saida da pagina e confirmar `duration_seconds`.
4. Enviar RSVP.
5. Enviar mensagem/musica.
6. Abrir dashboard do casal.
7. Abrir painel admin/owner.
8. Verificar metricas de landing/funil que dependem de `platform_events`.

Consultas rapidas:

```sql
select page_path, duration_seconds, created_at
from public.guest_views
order by created_at desc
limit 20;

select event_name, page_path, created_at
from public.platform_events
order by created_at desc
limit 20;

select user_id, role, created_at
from public.admin_users
order by created_at desc;
```

## 11. Criterio de sucesso

A equalizacao sera considerada concluida quando:

- Producao tiver todas as tabelas e colunas exigidas pelo codigo atual.
- `admin_users` existir e conter ao menos o usuario owner necessario.
- `platform_events` estiver recebendo eventos.
- `guest_views` estiver gravando `page_path` e `duration_seconds`.
- `guest_tokens` e `rsvp_confirmations` tiverem `event_uuid` populado quando houver evento correspondente.
- `events` estiver com defaults/nulabilidade alinhados, se a Fase 3 for aprovada.
- Nenhum fluxo principal apresentar erro no dashboard ou no convite publico.

## 12. Pontos que exigem decisao antes de apagar algo

Nao executar automaticamente:

- `DROP TABLE public.couple_credentials`
- `ALTER TABLE public.guest_views DROP COLUMN ...`
- `DROP INDEX ...` para renomear indices equivalentes
- Remocao ou recriacao de triggers em `events`

Essas acoes devem ser tratadas como limpeza posterior, com backup e confirmacao explicita.

## 13. Ordem recomendada resumida

1. Backup e inventario.
2. Aplicar migrations `009`, `010`, `011`.
3. Inserir primeiro admin em `admin_users`.
4. Adicionar `event_uuid` em `guest_tokens` e `rsvp_confirmations`.
5. Popular `event_uuid` com base em `events.slug`.
6. Adicionar `idx_events_is_active`.
7. Equalizar defaults/nulabilidade de `events`, se aprovado.
8. Manter `couple_credentials` e colunas antigas de `guest_views` ate decisao posterior.
9. Rodar smoke tests.
10. Gerar novo snapshot de prod e comparar novamente com dev.

