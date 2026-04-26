# Plano de Execução — Migração Multi-Tenant SaaS

> **Princípio central:** o convite de Siannah & Diego permanece funcionando durante toda a migração.

---

## Visão Geral

Transformar o convite — atualmente configurado via `site.json` para um único casal — em uma plataforma multi-tenant escalável. Cada casal terá seu próprio espaço no Supabase, acessará o dashboard com login próprio e gerenciará seu convite de forma autônoma.

- `site.json` passa a ser configuração exclusiva do desenvolvedor (feature flags, defaults globais).
- Dados variáveis por casal migram para o Supabase — tabelas `events` e `event_gifts` + Storage.
- Autenticação via Supabase Auth (já funcional) — cada usuário vê apenas seus próprios dados.
- URLs baseadas em slug: `seusite.com.br/siannah-diego-2026` via Vercel rewrite.

---

## Resumo das Fases

| Fase | Escopo | Entregável | Impacto no site |
|------|--------|------------|-----------------|
| 1 — Banco | Tabelas `events` e `event_gifts`, RLS, Storage, migração S&D | SQL + dados migrados | Nenhum |
| 2 — API | 3 endpoints: GET config, PATCH event, POST media | Funções serverless | Backend apenas |
| 3 — Frontend | `script.js` lê slug da URL e busca config no Supabase | script.js atualizado | Convite dinâmico |
| 4 — Dashboard | Painel de edição completo para o casal (4 abas) | dashboard.html | Experiência do casal |
| 5 — Roteamento | `vercel.json` com rewrites por slug | vercel.json | Multi-casal no ar |

### Status atual (26/04/2026)

- Fase 1 concluída e validada no Supabase.
- Fase 2 implementada e validada localmente:
  - `GET /api/event-config?slug=`
  - `PATCH /api/dashboard/event`
  - `POST /api/dashboard/media`
- Fase 3 implementada e validada localmente:
  - `script.js` resolve slug pela URL e busca `/api/event-config?slug=` quando aplicável
  - fallback local para `assets/config/site.json` continua ativo em rotas estáticas/root
  - loading screen usa a mesma fonte de config e o mesmo resolve de tema
  - estado de erro explícito para slug/config inválido
- Fase 4 iniciada:
  - dashboard autentica, resolve o evento pelo `slug` atual e passa a hidratar o `id` real do registro
  - aba de edição salva no servidor via `PATCH /api/dashboard/event` sem fallback para download de `site.json`
  - `GET /api/dashboard/event` agora suporta lookup por `slug` para o painel
- Próximo passo ao retomar: continuar a Fase 4 com upload real de mídia no dashboard e migração do login do painel para o fluxo definitivo de autenticação.

---

## Fase 1 — Banco de Dados (Supabase)

Ponto de partida. Nenhuma outra fase começa antes do banco estar correto.

### 1.1 Tabela `events`

**Colunas explícitas** (filtráveis / indexáveis):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | `gen_random_uuid()` |
| `slug` | text UNIQUE NOT NULL | Define a URL (ex: `siannah-diego-2026`) |
| `user_id` | uuid → `auth.users` | Vínculo com Supabase Auth |
| `couple_names` | text | Ex: *Siannah & Diego* |
| `bride_name` / `groom_name` | text | Nomes individuais |
| `event_date` | date | Data do casamento |
| `event_time` | time | Horário |
| `venue_name` / `venue_address` / `venue_maps_link` | text | Local |
| `active_theme` | text | Ex: `classic-gold` |
| `active_layout` | text | Ex: `classic` |
| `is_active` | boolean | Default `true` — permite pausar o convite |
| `created_at` / `updated_at` | timestamptz | Timestamps automáticos |

**Campo JSONB `config`** (dados variáveis sem necessidade de filtro):
- Textos das páginas extras: história, FAQ, hospedagem, mensagem, música
- Subtítulos personalizáveis
- Configuração de áudio (contextos, volume, startTime)
- Configuração de WhatsApp (número, template de mensagem)
- Configuração de RSVP (eventId, enabled)
- Páginas habilitadas: `{ historia: true, faq: false, ... }`

### 1.2 Tabela `event_gifts`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | `gen_random_uuid()` |
| `event_id` | uuid → `events(id)` | ON DELETE CASCADE |
| `type` | text | `'pix'` \| `'card'` \| `'catalog'` |
| `enabled` | boolean | Ativa/desativa a lista |
| `sort_order` | integer | Ordem de exibição |
| `config` | jsonb | Campos específicos por tipo |

### 1.3 Políticas RLS

| Tabela | Operação | Quem | Condição |
|--------|----------|------|----------|
| `events` | SELECT | Público (anon) | `is_active = true` |
| `events` | SELECT / UPDATE | Autenticado | `user_id = auth.uid()` |
| `events` | INSERT | Autenticado | `user_id = auth.uid()` |
| `event_gifts` | SELECT | Público (anon) | via `event_id` (join com events) |
| `event_gifts` | INSERT / UPDATE / DELETE | Autenticado | dono do event |

### 1.4 Supabase Storage

Bucket: `event-media` (público para leitura, autenticado para escrita)

```
{event_id}/hero.jpg
{event_id}/gallery/001.jpg
{event_id}/gallery/002.jpg
```

### 1.5 Migração — Siannah & Diego

- [x] Confirmar usuário no Supabase Auth (`ddiego533@gmail.com`)
- [x] Inserir linha em `events` com `slug = 'siannah-diego-2026'` e `user_id` correto
- [x] Inserir registros em `event_gifts` (Lua de Mel + Lista para Casa)
- [x] Fazer upload das fotos para `event-media/{event_id}/`
- [x] Validar integridade da migração via queries SQL (evento, presentes, vínculos `event_uuid`, bucket, `hero_image_url`)

Resultado da validação executada:
- `events`: 1 evento ativo com slug `siannah-diego-2026`
- `event_gifts`: 3 tipos (`pix`, `card`, `catalog`)
- `rsvp_confirmations`: 8 registros vinculados em `event_uuid`
- `guest_tokens`: 6 registros vinculados em `event_uuid`
- `storage.buckets`: `event-media` público
- Auth: usuário `ddiego533@gmail.com` confirmado e com login

---

## Fase 2 — API Endpoints

Três endpoints serverless (Vercel Functions). Nenhuma alteração no frontend ainda.

### GET `/api/event-config?slug=`

Substitui o fetch do `site.json`. Retorna o config no mesmo formato para não quebrar o frontend.

- Busca em `events` WHERE `slug = $1` AND `is_active = true`
- JOIN com `event_gifts` para montar o objeto de presentes
- Cache: `s-maxage=60, stale-while-revalidate=300`
- Retorna 404 se slug não encontrado

### PATCH `/api/dashboard/event`

Salva edições do dashboard. Requer token JWT no header `Authorization`.

- Valida JWT com Supabase Auth
- Verifica que o `event_id` pertence ao usuário autenticado
- Aceita campos parciais — atualiza apenas o que foi enviado
- Atualiza `updated_at` automaticamente

### POST `/api/dashboard/media`

Upload de imagem para o Supabase Storage. Requer autenticação.

- Aceita `multipart/form-data` com campos `file` e `type` (`hero` | `gallery`)
- Valida tipo MIME: jpeg, png, webp
- Upload para `{event_id}/{type}/` no bucket `event-media`
- Retorna URL pública do arquivo

---

## Fase 3 — Frontend (script.js)

Única mudança no frontend: de onde vêm os dados. O HTML, CSS e comportamento do convite não mudam.

### Leitura do slug

```js
// Extrai slug de: seusite.com.br/siannah-diego-2026
const slug = window.location.pathname.replace('/', '').split('/')[0];
```

### Substituição do fetch

- **Hoje:** `fetch('assets/config/site.json')`
- **Novo:** `fetch('/api/event-config?slug=' + slug)`
- A resposta tem o mesmo shape do `site.json` — zero refatoração no restante do código
- Adicionar loading state (spinner) enquanto a API responde
- Adicionar página de erro para slug não encontrado

### Compatibilidade local

Se não há slug na URL (localhost na raiz), usa `site.json` como fallback para desenvolvimento local.

---

## Fase 4 — Dashboard do Casal

Baseado no `dashboard.html` e `editor.html` existentes. Quatro abas, cada uma salva via `PATCH /api/dashboard/event`.

### Aba Evento
- Nomes dos noivos (`bride_name`, `groom_name`, `couple_names`)
- Data e hora do casamento
- Nome do local, endereço, link do Google Maps
- Tema visual (dropdown com os 7 temas disponíveis)
- Layout: `classic` | `modern`
- Páginas habilitadas (checkboxes)

### Aba Presentes
- Ativar/desativar cada tipo: Pix, Cartão, Catálogo
- Pix: nome, chave, banco, QR code
- Cartão: link do Mercado Pago ou similar
- Catálogo: adicionar/remover itens (nome, valor, link, imagem)

### Aba Fotos
- Upload da foto principal do casal (hero image)
- Upload de fotos para a galeria (múltiplos arquivos)
- Preview em tempo real antes de salvar
- Reordenar e remover fotos

### Aba Páginas
- Editores de texto para cada página extra habilitada
- História do casal (texto + fotos)
- FAQ (pares pergunta/resposta)
- Hospedagem (texto livre + links)
- Subtítulos personalizáveis

---

## Fase 5 — Roteamento no Vercel

### vercel.json

```json
{
  "rewrites": [
    { "source": "/dashboard",    "destination": "/dashboard.html" },
    { "source": "/:slug",        "destination": "/index.html" },
    { "source": "/:slug/:page",  "destination": "/:page.html" }
  ]
}
```

- `/:slug` reescreve para `index.html`, que lê o slug via `window.location.pathname`
- `/:slug/:page` permite `/siannah-diego/presente` → `presente.html`
- Rotas `/api/*` são tratadas automaticamente pelo Vercel Functions

### Validação final
- [ ] Deploy no Vercel com as novas configurações
- [ ] Testar `/siannah-diego-2026` — convite deve carregar
- [ ] Testar `/outro-casal` — deve exibir erro 404
- [ ] Testar dashboard: login → edição → salvamento → reflexo no convite

---

## Regras Gerais de Execução

- Cada fase é concluída e validada antes de iniciar a próxima
- O convite de Siannah & Diego permanece acessível durante toda a migração
- Commits pequenos e descritivos — um commit por entregável de sub-fase
- Testes existentes (Vitest) devem continuar passando após cada fase
- Nenhuma credencial vai para o repositório — apenas variáveis de ambiente
- `site.json` não é deletado — apenas deixa de ser a fonte de verdade para dados de casal
