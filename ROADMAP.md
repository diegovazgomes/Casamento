# ROADMAP — Convite de Casamento Siannah & Diego

> **Como usar este arquivo:**
> Após cada implementação, marque os itens concluídos com `[x]` e adicione uma nota com o que foi feito.
> O Cursor deve atualizar este arquivo automaticamente ao final de cada tarefa.

---

## STATUS GERAL

| Fase | Progresso | Status |
|------|-----------|--------|
| Fase 1 — Fundação | 6/6 concluídas ✅ | ✅ Concluída |
| Fase 2 — Evolução | 5/5 concluídas ✅ | ✅ Concluída |
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

### 1.5 Integrar `gallery.js` ao projeto ✅ CONCLUÍDO
- [x] Conectar `gallery.js` à página `historia.html`
- [x] Adicionar campos de galeria ao `site.json`
- [x] Adicionar campos de galeria ao editor visual
- [x] Adicionar campos de galeria ao `assets/config/defaults/site.json`
- [x] Testar navegação por teclado (← →)
- [x] Testar em mobile (swipe)
- [x] Testar com galeria vazia (fallback visual)
- [x] Testar com 1 foto (sem dots/navegação)
- [ ] Adicionar opção de autoplay configurável via `site.json`

**Notas:** Galeria integrada com swipe mobile (testado em dispositivo real), navegação circular, reveal condicional e suporte a galeria vazia. Autoplay permanece fora de escopo.
**Prioridade:** Alta
**Esforço estimado:** ✅ Concluído

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
- [x] Adicionar edição do link de pagamento por cartão
- [x] Implementar validação em tempo real (integrar schemas da Fase 1)
- [x] Indicar campos obrigatórios visualmente
- [x] Melhorar import/export (validar antes de exportar)
- [x] Adicionar preview parcial das alterações

**Notas:** O editor já cobre conteúdo principal, tipografia, tema, mapa, galeria e agora também presentes/cartão com campos dedicados. A aba Tema passou a expor overrides de cores/tipografia isolados por tema ativo via `themeOverridesByTheme.<tema>`, evitando vazamento entre temas ao trocar a seleção. Campos obrigatórios passaram a ser marcados visualmente com base no schema e foi adicionado preview parcial por aba ativa para acelerar revisão antes da exportação.
**Prioridade:** Alta
**Esforço estimado:** 3–5 dias

---

### 2.2 Padronizar páginas extras ✅ CONCLUÍDO
- [x] Criar módulo compartilhado de renderização de páginas extras
- [x] Padronizar hero/header de todas as páginas extras
- [x] Padronizar sistema de reveal de conteúdo
- [x] Padronizar tratamento de campos ausentes (não quebrar, apenas não renderizar)
- [x] Padronizar link de retorno para `index.html?section=extras`
- [x] Testar cada página com `content` vazio no `site.json`
- [x] Documentar como adicionar nova página extra

**Páginas afetadas:** `historia.html`, `faq.html`, `hospedagem.html`
**Notas:** Módulo `extra-page.js` criado com `initExtraPage({ pageKey, idPrefix, onReady, onReveal? })`. Centraliza: listener `app:ready`, optional chaining, guard de content ausente, setText das 3 intro fields, `document.title` dinâmico, `meta[name="description"]` dinâmico, `revealElements('.reveal')`, e hook `onReveal` para seções opcionais pós-reveal (ex: galeria). `historia.js`, `faq.js` e `hospedagem.js` refatorados para consumir o módulo — lógica específica de renderização preservada em cada arquivo. Links de retorno e tratamento de campos ausentes já eram consistentes antes e foram mantidos. Para adicionar nova página extra: criar HTML com padrão `extra-page`/`extra-intro`, criar módulo JS e chamar `initExtraPage` com `pageKey` e `idPrefix` correspondentes ao ID no `site.json`.
**Prioridade:** Alta
**Esforço estimado:** ✅ Concluído

---

### 2.3 Consolidar presentes na página dedicada ✅ CONCLUÍDO
- [x] Decidir propósito do fluxo de presentes (manter somente `presente.html`)
- [x] Remover overlay de presentes do `index.html` e o fluxo `#gift`
- [x] Garantir fonte única de conteúdo em `site.json` para a página dedicada
- [x] Implementar bloco de cartão na página `presente.html`
- [x] Adicionar campo `cardPaymentEnabled` no `site.json`
- [x] Adicionar campo `cardPaymentLink` no `site.json`
- [x] Adicionar ambos os campos no `editor.html`
- [x] Testar com `cardPaymentEnabled: false` (bloco não aparece)

**Notas:** Fluxo com overlay foi aposentado. Bloco de cartão implementado em `presente.html` controlado por `cardPaymentEnabled` e `cardPaymentLink` no `site.json`; bloco oculto quando desabilitado ou link inválido. Ambos os campos editáveis na aba Presente do editor.
**Prioridade:** Média
**Esforço estimado:** ✅ Concluído

---

### 2.4 Melhorar acessibilidade e UX ✅ CONCLUÍDO
- [x] Revisar todos os `aria-label` existentes
- [x] Verificar contraste de texto em todos os 5 temas
- [x] Melhorar mensagens de erro do RSVP (mais claras e visíveis)
- [x] Adicionar `focus-visible` estilizado em todos os elementos interativos
- [x] Testar com leitor de tela (VoiceOver ou NVDA)
- [x] Corrigir espaçamentos inconsistentes entre seções
- [x] Revisar line-height em todos os textos corridos
- [x] Testar em viewport 375px (iPhone SE)
- [x] Testar em viewport 768px (tablet)

**Notas:** Implementado e validado: labels de acessibilidade em fluxos críticos (RSVP/presente/voltar), melhoria de contraste em tokens `textFaint`/`textPlaceholder` nos 5 temas e default, estados `focus-visible` abrangentes para elementos interativos, validação do RSVP por campo com `aria-invalid` e feedback mais claro, além de validação manual com leitor de tela e em viewport 375/768.
**Prioridade:** Alta
**Esforço estimado:** 2 dias

---

### 2.5 Testes mínimos de smoke
- [x] Instalar Vitest (`npm install vitest --save-dev`)
- [x] Criar estrutura de pastas `tests/`
- [x] Escrever teste: `loadConfig()` retorna campos obrigatórios
- [x] Escrever teste: `mergeDeep()` produz resultado correto
- [x] Escrever teste: `loadTheme()` aplica cores corretamente
- [x] Escrever teste: `buildWhatsAppUrl()` gera URL válida
- [x] Escrever teste: `countdown` calcula dias corretamente
- [x] Escrever teste: `copyPix()` copia valor correto
- [x] Configurar script `npm test` no `package.json`
- [x] Documentar como rodar os testes no `README.md`

**Notas:** Vitest configurado com ambiente `happy-dom`, suite criada em `tests/unit` e `tests/integration` com 18 testes passando (`npm test`). Como o repositorio nao possui `README.md`, a documentacao de execucao foi registrada em `CLAUDE.md` na secao de execucao local.
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

- **[2026-04-09]** Sistema de layouts implementado: `style.css` dividido em base compartilhada + `assets/layouts/{layout}/layout.css`; layouts `classic` e `modern` criados; `loadLayout()` e `resolveThemePath()` adicionados ao `script.js`; campo `activeLayout` adicionado ao `site.json` e ao schema; seletor de layout adicionado ao editor visual.
- **[2026-04-09]** Decisão de nomes de arquivos de tema: mantidos iguais ao legado dentro de `assets/layouts/classic/themes/` para preservar chaves de override existentes em `themeOverridesByTheme`.
- **[2026-04-09]** `gallery.js` e `map.js` saíram do estado "adormecido" e foram integrados ao produto.
- **[2026-04-09]** A galeria foi simplificada: saiu de um arquivo externo `index.json` e passou a viver diretamente em `pages.historia.content.gallery` no `site.json`.
- **[2026-04-09]** O editor visual ganhou a aba `Mapa & Galeria`, reduzindo edição manual de JSON.
- **[2026-04-09]** Fluxo de presentes consolidado na página dedicada `presente.html`; overlay removido da home.
- Espaçamentos inconsistentes identificados entre seções em mobile — endereçar em 2.4.
- Bloco de cartão em `presente.html` ainda é placeholder — endereçar em 2.3.

---

## DECISÕES PENDENTES

| Decisão | Contexto | Urgência |
|---------|----------|----------|
| Infraestrutura de backend | Necessária para Fase 3 | Antes de iniciar Fase 3 |
| ~~Modelo visual único vs. múltiplos layouts~~ | ✅ Resolvido em 2026-04-09: sistema de layouts implementado com `classic` e `modern` | — |

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

*Última atualização: fundação praticamente consolidada; editor expandido com mapa e galeria; galeria migrada para `site.json`; presentes consolidados em `presente.html`.*
