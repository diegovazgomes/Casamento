# ROADMAP — Convite de Casamento Siannah & Diego

> **Como usar este arquivo:**
> Após cada implementação, marque os itens concluídos com `[x]` e adicione uma nota com o que foi feito.
> O Cursor deve atualizar este arquivo automaticamente ao final de cada tarefa.

---

## STATUS GERAL

| Fase | Progresso | Status |
|------|-----------|--------|
| Fase 1 — Fundação | 4/6 concluídas + 2 em fechamento | 🟡 Em andamento |
| Fase 2 — Evolução | 1/5 em andamento | 🟡 Em andamento |
| Fase 3 — Escala | 0/4 | ⚪ Não iniciada |

---

## FASE 1 — Fundação
> Objetivo: formalizar, limpar e consolidar a base do projeto.
> Nada desta fase é visível ao convidado — é infraestrutura.

---

### 1.1 Schema formal para `site.json`
- [x] Mapear todos os campos existentes no `site.json`
- [x] Criar `assets/config/schemas/site-schema.json`
- [x] Definir campos obrigatórios, tipos e formatos aceitos
- [x] Integrar validação no editor visual
- [x] Exibir erros claros para campos ausentes ou inválidos
- [x] Testar fluxo de erro/validação no carregamento e export

**Notas:** Schema implementado e integrado ao editor via `loadSchema()` + `validateAgainstSchema()`.
**Prioridade:** Alta
**Esforço estimado:** 2–3 dias

---

### 1.2 Schema formal para temas
- [x] Mapear todos os campos usados nos 5 temas existentes
- [x] Criar `assets/config/schemas/theme-schema.json`
- [x] Validar temas existentes contra o schema
- [x] Integrar validação ao fluxo de tema e documentação
- [x] Documentar cada campo do schema com descrição clara

**Notas:** Schema de tema criado; warnings de campos críticos também existem em runtime.
**Prioridade:** Alta
**Esforço estimado:** 1–2 dias

---

### 1.3 Limpeza do `script.js` — mover fallbacks
- [x] Extrair `DEFAULT_THEME` para `assets/config/defaults/theme.json`
- [x] Extrair `DEFAULT_SITE_CONTENT` para `assets/config/defaults/site.json`
- [x] Atualizar `script.js` para carregar esses arquivos via `fetch()`
- [x] Verificar que o comportamento de fallback continua funcionando
- [x] Reduzir `script.js` para foco em lógica, não em dados

**Notas:** `loadDefaults()` implementado e bootstrap passa a carregar defaults antes do restante.
**Prioridade:** Média
**Esforço estimado:** 1 dia

---

### 1.4 Centralizar utilitários repetidos
- [x] Criar `assets/js/utils.js`
- [x] Mover `setText()` de todos os arquivos para `utils.js`
- [x] Mover `setInputPlaceholder()` para `utils.js`
- [x] Mover helpers de DOM compartilhados para `utils.js`
- [x] Atualizar imports em todos os arquivos afetados
- [x] Verificar que nenhum arquivo ficou com função duplicada

**Arquivos afetados:** `historia.js`, `faq.js`, `hospedagem.js`, `script.js`
**Notas:** Escopo ampliado para incluir helpers do `editor.js` e utilitários de merge/path.
**Prioridade:** Média
**Esforço estimado:** 1 dia

---

### 1.5 Integrar `gallery.js` ao projeto ✅ CONCLUÍDO PARCIALMENTE
- [x] Conectar `gallery.js` à página `historia.html`
- [x] Adicionar campos de galeria ao `site.json`
- [x] Adicionar campos de galeria ao editor visual
- [x] Adicionar campos de galeria ao `assets/config/defaults/site.json`
- [x] Testar navegação por teclado (← →)
- [ ] Testar em mobile (swipe)
- [x] Testar com galeria vazia (fallback visual)
- [x] Testar com 1 foto (sem dots/navegação)
- [ ] Adicionar opção de autoplay configurável via `site.json`

**Notas:** Galeria foi simplificada para usar uma única fonte de verdade em `pages.historia.content.gallery`. Pendente apenas decidir se haverá autoplay e swipe explícito.
**Prioridade:** Alta (pendências)
**Esforço estimado:** 1 dia para fechar pendências

---

### 1.6 Integrar `map.js` ao projeto ✅ CONCLUÍDO PARCIALMENTE
- [x] Conectar `map.js` à página `hospedagem.html`
- [x] Adicionar campos de coordenadas ao `site.json`
- [x] Adicionar campos de mapa ao editor visual
- [x] Adicionar campos ao `assets/config/defaults/site.json`
- [x] Verificar carregamento do Leaflet via CDN
- [x] Testar marcador customizado
- [x] Testar botão "Abrir no Google Maps"
- [x] Testar fallback quando Leaflet falha / embed é necessário
- [x] Garantir que altura do `#map` está definida no CSS

**Notas:** Mapa implementado com fallback automático para Google Maps embed. Item tecnicamente concluído; manter apenas monitoramento de UX/mobile.
**Prioridade:** Alta (pendências)
**Esforço estimado:** 1 dia para fechar pendências

---

## FASE 2 — Evolução
> Objetivo: melhorar operação, UX e consistência.
> Alguns itens desta fase são visíveis ao convidado.

---

### 2.1 Fortalecer o `editor.html` como mini CMS
- [x] Adicionar aba de seleção de tema com preview visual
- [x] Adicionar aba de tipografia com preview em tempo real
- [x] Adicionar edição das páginas extras (história, FAQ, hospedagem)
- [x] Adicionar edição da galeria de fotos
- [x] Adicionar edição das coordenadas do mapa
- [ ] Adicionar edição do link de pagamento por cartão
- [x] Implementar validação em tempo real (integrar schemas da Fase 1)
- [ ] Indicar campos obrigatórios visualmente
- [x] Melhorar import/export (validar antes de exportar)
- [ ] Adicionar preview parcial das alterações

**Notas:** O editor já cobre boa parte do conteúdo principal, tipografia, tema, mapa e galeria. Pendências agora são refinamento de UX e presentes/cartão.
**Prioridade:** Alta
**Esforço estimado:** 3–5 dias

---

### 2.2 Padronizar páginas extras
- [ ] Criar módulo compartilhado de renderização de páginas extras
- [ ] Padronizar hero/header de todas as páginas extras
- [ ] Padronizar sistema de reveal de conteúdo
- [ ] Padronizar tratamento de campos ausentes (não quebrar, apenas não renderizar)
- [ ] Padronizar link de retorno para `index.html?section=extras`
- [ ] Testar cada página com `content` vazio no `site.json`
- [ ] Documentar como adicionar nova página extra

**Páginas afetadas:** `historia.html`, `faq.html`, `hospedagem.html`
**Notas:** —
**Prioridade:** Alta
**Esforço estimado:** 2 dias

---

### 2.3 Resolver duplicidade de presentes
- [ ] Decidir propósito de cada caminho (overlay vs. página dedicada)
- [ ] Documentar decisão no código
- [ ] Garantir que ambos leem de uma única fonte (`site.json`)
- [ ] Implementar bloco de cartão na página `presente.html`
- [ ] Implementar bloco de cartão no overlay do `index.html`
- [ ] Adicionar campo `cardPaymentEnabled` no `site.json`
- [ ] Adicionar campo `cardPaymentLink` no `site.json`
- [ ] Adicionar ambos os campos no `editor.html`
- [ ] Testar com `cardPaymentEnabled: false` (bloco não aparece)

**Notas:** —
**Prioridade:** Média
**Esforço estimado:** 1 dia

---

### 2.4 Melhorar acessibilidade e UX
- [ ] Revisar todos os `aria-label` existentes
- [ ] Garantir navegação completa por teclado (Tab, Enter, Escape)
- [ ] Verificar contraste de texto em todos os 5 temas
- [ ] Melhorar mensagens de erro do RSVP (mais claras e visíveis)
- [ ] Adicionar `focus-visible` estilizado em todos os elementos interativos
- [ ] Testar com leitor de tela (VoiceOver ou NVDA)
- [ ] Corrigir espaçamentos inconsistentes entre seções
- [ ] Revisar line-height em todos os textos corridos
- [ ] Testar em viewport 375px (iPhone SE)
- [ ] Testar em viewport 768px (tablet)

**Notas:** —
**Prioridade:** Alta
**Esforço estimado:** 2 dias

---

### 2.5 Testes mínimos de smoke
- [ ] Instalar Vitest (`npm install vitest --save-dev`)
- [ ] Criar estrutura de pastas `tests/`
- [ ] Escrever teste: `loadConfig()` retorna campos obrigatórios
- [ ] Escrever teste: `mergeDeep()` produz resultado correto
- [ ] Escrever teste: `loadTheme()` aplica cores corretamente
- [ ] Escrever teste: `buildWhatsAppUrl()` gera URL válida
- [ ] Escrever teste: `countdown` calcula dias corretamente
- [ ] Escrever teste: `copyPix()` copia valor correto
- [ ] Configurar script `npm test` no `package.json`
- [ ] Documentar como rodar os testes no `README.md`

**Notas:** —
**Prioridade:** Média
**Esforço estimado:** 2 dias

---

## FASE 3 — Escala
> Objetivo: persistência, painel e produto.
> Só iniciar após decisão de infraestrutura (Supabase, Firebase, etc.)

---

### 3.1 Persistência real de RSVP
- [ ] Decidir infraestrutura de backend
- [ ] Criar tabela de confirmações no banco
- [ ] Integrar envio de dados no `rsvp.js`
- [ ] Manter redirecionamento WhatsApp como confirmação ao usuário
- [ ] Criar endpoint de listagem de confirmados
- [ ] Testar com múltiplas confirmações simultâneas
- [ ] Testar fallback quando backend está indisponível

**Notas:** Requer decisão de infraestrutura antes de iniciar.
**Prioridade:** Alta (quando escalar)
**Esforço estimado:** 3–5 dias

---

### 3.2 Convite personalizado por convidado
- [ ] Criar sistema de geração de links únicos
- [ ] Criar tabela de convidados no banco
- [ ] Ler identificador do convidado via query param (`?guest=abc123`)
- [ ] Personalizar saudação e conteúdo por convidado
- [ ] Rastrear abertura do convite por convidado
- [ ] Criar interface para o casal gerenciar lista de convidados

**Notas:** Depende de 3.1.
**Prioridade:** Alta (quando escalar)
**Esforço estimado:** 5–7 dias

---

### 3.3 Painel administrativo para o casal
- [ ] Definir autenticação (senha simples ou OAuth)
- [ ] Criar página de login protegida
- [ ] Criar dashboard com lista de confirmados
- [ ] Adicionar filtros (confirmados, recusados, pendentes)
- [ ] Adicionar export da lista para Excel/CSV
- [ ] Integrar editor.html como parte do painel
- [ ] Adicionar envio de lembretes para não respondidos

**Notas:** Depende de 3.1 e 3.2.
**Prioridade:** Alta (quando escalar)
**Esforço estimado:** 7–10 dias

---

### 3.4 Suporte a múltiplos eventos (multi-evento)
- [ ] Separar formalmente engine / config / instance no código
- [ ] Criar script de geração de novo evento
- [ ] Testar criação de segundo convite sem afetar o primeiro
- [ ] Painel administrativo com visão de todos os eventos
- [ ] Documentar processo de onboarding de novo casal

**Notas:** Depende de 3.3.
**Prioridade:** Alta (quando virar produto)
**Esforço estimado:** 5–7 dias

---

## DESCOBERTAS
> Itens identificados durante implementações que não estavam no plano original.

- **[2026-04-09]** `gallery.js` e `map.js` saíram do estado "adormecido" e foram integrados ao produto.
- **[2026-04-09]** A galeria foi simplificada: saiu de um arquivo externo `index.json` e passou a viver diretamente em `pages.historia.content.gallery` no `site.json`.
- **[2026-04-09]** O editor visual ganhou a aba `Mapa & Galeria`, reduzindo edição manual de JSON.
- Espaçamentos inconsistentes identificados entre seções em mobile — endereçar em 2.4.
- Bloco de cartão em `presente.html` ainda é placeholder — endereçar em 2.3.

---

## DECISÕES PENDENTES

| Decisão | Contexto | Urgência |
|---------|----------|----------|
| Infraestrutura de backend | Necessária para Fase 3 | Antes de iniciar Fase 3 |
| Overlay vs. página de presentes | Dois caminhos sem propósito claro | Fase 2 item 2.3 |
| Modelo visual único vs. múltiplos layouts | Hoje só existe 1 layout HTML | Antes de criar novos modelos |

---

## CONVENÇÕES DESTE ARQUIVO

- `[ ]` → não iniciado
- `[~]` → em andamento
- `[x]` → concluído
- ✅ → item totalmente concluído
- 🟡 → em andamento
- ⚪ → não iniciado
- 🔴 → bloqueado

---

*Última atualização: fundação praticamente consolidada; editor expandido com mapa e galeria; galeria migrada para `site.json` como fonte única de verdade.*
