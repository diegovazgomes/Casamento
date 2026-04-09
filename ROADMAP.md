# ROADMAP — Convite de Casamento Siannah & Diego

> **Como usar este arquivo:**
> Após cada implementação, marque os itens concluídos com `[x]` e adicione uma nota com o que foi feito.
> O Cursor deve atualizar este arquivo automaticamente ao final de cada tarefa.

---

## STATUS GERAL

| Fase | Progresso | Status |
|------|-----------|--------|
| Fase 1 — Fundação | 2/6 | 🟡 Em andamento |
| Fase 2 — Evolução | 0/5 | ⚪ Não iniciada |
| Fase 3 — Escala | 0/4 | ⚪ Não iniciada |

---

## FASE 1 — Fundação
> Objetivo: formalizar, limpar e consolidar a base do projeto.
> Nada desta fase é visível ao convidado — é infraestrutura.

---

### 1.1 Schema formal para `site.json`
- [ ] Mapear todos os campos existentes no `site.json`
- [ ] Criar `assets/config/schemas/site.schema.json`
- [ ] Definir campos obrigatórios, tipos e formatos aceitos
- [ ] Integrar validação no `editor.html`
- [ ] Exibir erros claros para campos ausentes ou inválidos
- [ ] Testar com arquivo propositalmente quebrado

**Notas:** —
**Prioridade:** Alta
**Esforço estimado:** 2–3 dias

---

### 1.2 Schema formal para temas
- [ ] Mapear todos os campos usados nos 5 temas existentes
- [ ] Criar `assets/config/schemas/theme.schema.json`
- [ ] Validar temas existentes contra o schema
- [ ] Integrar validação no `editor.html` na aba de temas
- [ ] Documentar cada campo do schema com descrição clara

**Notas:** —
**Prioridade:** Alta
**Esforço estimado:** 1–2 dias

---

### 1.3 Limpeza do `script.js` — mover fallbacks
- [ ] Extrair `DEFAULT_THEME` para `assets/config/defaults/theme.json`
- [ ] Extrair `DEFAULT_SITE_CONTENT` para `assets/config/defaults/site.json`
- [ ] Atualizar `script.js` para carregar esses arquivos via `fetch()`
- [ ] Verificar que o comportamento de fallback continua funcionando
- [ ] Reduzir `script.js` para foco em lógica, não em dados

**Notas:** —
**Prioridade:** Média
**Esforço estimado:** 1 dia

---

### 1.4 Centralizar utilitários repetidos
- [ ] Criar `assets/js/utils.js`
- [ ] Mover `setText()` de todos os arquivos para `utils.js`
- [ ] Mover `setInputPlaceholder()` para `utils.js`
- [ ] Mover helpers de DOM compartilhados para `utils.js`
- [ ] Atualizar imports em todos os arquivos afetados
- [ ] Verificar que nenhum arquivo ficou com função duplicada

**Arquivos afetados:** `historia.js`, `faq.js`, `hospedagem.js`, `script.js`
**Notas:** —
**Prioridade:** Média
**Esforço estimado:** 1 dia

---

### 1.5 Integrar `gallery.js` ao projeto ✅ CONCLUÍDO PARCIALMENTE
- [x] Conectar `gallery.js` à página `historia.html`
- [x] Adicionar campos de galeria ao `site.json`
- [ ] Adicionar campos de galeria ao `editor.html`
- [ ] Adicionar campos de galeria ao `DEFAULT_SITE_CONTENT` em `script.js`
- [ ] Testar navegação por teclado (← →)
- [ ] Testar em mobile (swipe)
- [ ] Testar com galeria vazia (fallback visual)
- [ ] Testar com 1 foto (sem dots/navegação)
- [ ] Adicionar opção de autoplay configurável via `site.json`

**Notas:** Galeria implementada na página de história. Pendente: integração com editor e testes de edge cases.
**Prioridade:** Alta (pendências)
**Esforço estimado:** 1 dia para fechar pendências

---

### 1.6 Integrar `map.js` ao projeto ✅ CONCLUÍDO PARCIALMENTE
- [x] Conectar `map.js` à seção de detalhes do evento
- [x] Adicionar campos de coordenadas ao `site.json`
- [ ] Adicionar campos de mapa ao `editor.html`
- [ ] Adicionar campos ao `DEFAULT_SITE_CONTENT` em `script.js`
- [ ] Verificar carregamento do Leaflet via CDN
- [ ] Testar marcador customizado
- [ ] Testar botão "Abrir no Google Maps"
- [ ] Testar fallback quando coordenadas não estão definidas
- [ ] Garantir que altura do `#map` está definida no CSS

**Notas:** Mapa implementado. Pendente: integração com editor e testes de fallback.
**Prioridade:** Alta (pendências)
**Esforço estimado:** 1 dia para fechar pendências

---

## FASE 2 — Evolução
> Objetivo: melhorar operação, UX e consistência.
> Alguns itens desta fase são visíveis ao convidado.

---

### 2.1 Fortalecer o `editor.html` como mini CMS
- [ ] Adicionar aba de seleção de tema com preview visual
- [ ] Adicionar aba de tipografia com preview em tempo real
- [ ] Adicionar edição das páginas extras (história, FAQ, hospedagem)
- [ ] Adicionar edição da galeria de fotos (historia.js)
- [ ] Adicionar edição das coordenadas do mapa
- [ ] Adicionar edição do link de pagamento por cartão
- [ ] Implementar validação em tempo real (integrar schemas da Fase 1)
- [ ] Indicar campos obrigatórios visualmente
- [ ] Melhorar import/export (validar antes de exportar)
- [ ] Adicionar preview parcial das alterações

**Notas:** —
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

- **[2024]** `gallery.js` e `map.js` estavam no repositório sem integração — integrados na última implementação, mas pendências de editor e testes permanecem.
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

*Última atualização: implementação de `gallery.js` e `map.js` integrados ao projeto.*
