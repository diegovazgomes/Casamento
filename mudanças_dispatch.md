# Mudanças — Remoção de Hardcode de Casal

**Data:** 2026-04-27
**Branch:** dev
**Contexto:** Preparação para arquitetura multi-tenant. Nenhum nome de casal pode estar fixo no código-fonte — todos os dados de casal devem vir da config dinâmica (Supabase) ou da URL.

---

## Arquivos Alterados

### `assets/js/dashboard.js`
- **Linha 10:** `eventSlug` deixou de ser `'siannah-diego-2026'` fixo. Agora lê o slug dinamicamente de `window.location.pathname`. Isso permite que o dashboard funcione para qualquer casal autenticado sem alteração de código.
- **Linha 1021:** fallback `'Siannah & Diego'` em `updateMensagemPreview` substituído por `'Casal'`.

### `dashboard.html`
- **Sidebar:** removidos valores hardcoded de nome do casal e data (`sidebarCouple`, `sidebarDate`). Elementos deixados vazios para preenchimento pelo JS ao carregar os dados do evento.
- **Campo `edWaRecipient`:** placeholder `"Diego"` substituído por `"Nome da noiva/noivo"`.

### `presente.html`, `faq.html`, `historia.html`, `hospedagem.html`, `mensagem.html`, `musica.html`
- **`<title>`:** removida referência `Siannah & Diego`. Título genérico por página.
- **`<meta name="description">`:** idem.
- **`.footer-names`:** elemento esvaziado — o JS de cada página preenche via `config.couple.names` ao inicializar.

### `assets/js/script.js`
- **Linhas 784–785:** fallbacks dos nomes individuais trocados de `'Siannah'` / `'Diego'` para `'Noiva'` / `'Noivo'`.

### `assets/js/loading-screen.js`
- **Linha 57:** fallback de `'Siannah & Diego'` trocado para `'Casal'`.

### `assets/js/font-preview.js`
- **Linha 49:** texto de amostra trocado de `'Diego & Siannah'` para `'Nome & Nome'`.

### `assets/js/editor.js`
- Todas as ocorrências de `'Siannah & Diego'` como placeholder ou fallback substituídas por `'Nome & Nome'` (5 ocorrências em texto e 1 em entidade HTML `&amp;`).

### `api/dashboard/reminders.js`
- Comentário JSDoc: slug de exemplo `"siannah-diego-2026"` substituído por `"<slug-do-evento>"`.

---

## O que NÃO foi alterado

| Arquivo | Motivo |
|---------|--------|
| `assets/config/site.json` | Fonte de verdade atual — migração em andamento para o Supabase |
| `assets/config/defaults/site.json` | Template de referência do desenvolvedor |
| `docs/migrations/002_seed_siannah_diego.sql` | Seed explicitamente dedicado ao primeiro casal |
| `CLAUDE.md`, `cursorrules` | Documentação técnica e contexto do desenvolvedor |

---

## Impacto

Nenhuma mudança visual para o convidado. O comportamento do convite permanece idêntico desde que a config seja carregada corretamente. O fallback genérico (`'Noiva'`, `'Noivo'`, `'Casal'`) só aparece se a config falhar — o que não deve ocorrer em produção.
