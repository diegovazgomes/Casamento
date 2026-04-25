# ROADMAP — Convite de Casamento

## STATUS

| Fase | Status |
|------|--------|
| Fase 1 — Fundação | ✅ Concluída |
| Fase 2 — Evolução | ✅ Concluída |
| Fase 3 — Escala | 🟡 Em andamento |

---

## FASE 1 — Fundação ✅

- [x] Schema formal para `site.json` e temas
- [x] Extrair fallbacks para `assets/config/defaults/`
- [x] Centralizar utilitários em `utils.js`
- [x] Integrar galeria de fotos (`gallery.js`)
- [x] Integrar mapa do local (`map.js`)

---

## FASE 2 — Evolução ✅

- [x] Editor visual (`editor.html`) como mini CMS
- [x] Módulo compartilhado para páginas extras (`extra-page.js`)
- [x] Página dedicada de presentes (`presente.html`)
- [x] Acessibilidade e UX (aria, focus-visible, contraste)
- [x] Testes de smoke com Vitest

---

## FASE 3 — Escala 🟡

- [x] Persistência de RSVP no Supabase
- [x] Convites personalizados por convidado
- [x] Painel de gerenciamento de convidados (`dashboard.html`)
- [ ] **Dashboard de edição do evento** ← próxima etapa
- [ ] Cache HTTP com retry logic
- [ ] Suporte a múltiplos eventos

---

### Dashboard de edição do evento

**Migração de dados (`site.json` → Supabase)**
- [ ] Criar tabela `events` (slug + couple_names + event_date + config jsonb)
- [ ] Criar tabela `event_gifts` (type: pix | card | catalog, enabled, config jsonb)
- [ ] Migrar dados do `site.json` atual para a tabela `events`
- [ ] Bucket no Supabase Storage para uploads de fotos

**API**
- [ ] `GET /api/event-config?slug=` — retorna config no formato `site.json`
- [ ] `PATCH /api/dashboard/event` — salva edições do dashboard
- [ ] `POST /api/dashboard/media` — upload de foto para o Storage

**`script.js`**
- [ ] Carregar config de `/api/event-config?slug=` em vez de `site.json`
- [ ] Slug definido por meta tag no HTML

**Dashboard — abas de edição**
- [ ] Aba "Evento": nomes, data, local, links, tema, layout
- [ ] Aba "Presentes": Pix / cartão / catálogo, cada um com `enabled` e campos próprios
- [ ] Aba "Fotos": upload de hero image e galeria do casal
- [ ] Aba "Páginas": editar conteúdo das páginas extras (história, FAQ, hospedagem, etc.)
