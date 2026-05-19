# Fase 3 — Monetização e limites de plano

## Definição dos planos

| Feature | Free | Premium (R$187) |
|---|---|---|
| Tema | classic-gold fixo | Todos os temas e layouts |
| Convidados | Até 50, sem grupos | Ilimitado + grupos personalizados |
| Páginas extras | Todas | Todas |
| Foto do casal | ✓ | ✓ |
| Galeria | Até 3 fotos | Até 5 fotos |
| Áudio | ✗ | ✓ |
| Tela de entrada | Logo devazi + botão abrir | Experiência premium (ver abaixo) |
| Marca d'água | Rodapé "Criado com devazi.com.br" | ✗ |

---

## Decisões fechadas

- Fluxo de compra na landing: **cadastro/login primeiro**, checkout no dashboard.
- Preço oficial Premium: **R$ 187 (pagamento único)**.
- Estado de release: card Premium da landing **visível agora**.

---

## Tela de entrada premium

Fluxo ao abrir o convite:

1. Tela 100% preta aparece imediatamente (overlay estático, sem dependência de JS)
2. API responde e tema é aplicado
3. Se tema claro → fade da tela preta para `var(--color-background)` do tema
4. Se tema escuro → permanece escuro
5. Card aparece em fade com nomes do casal + botão "Abrir convite"
6. Botão dispara o fluxo existente de `enterInvitation()`

Tela de entrada free:

1. Overlay aparece imediatamente com logo devazi centralizada
2. Botão "Abrir convite" aparece abaixo da logo
3. Sem transição de cor — fundo neutro fixo

---

## O que precisa para desbloquear aquisição do Premium na landing

### Objetivo de negócio

Permitir que um visitante da landing inicie a compra do Premium sem fricção, seguindo o funil:

`landing -> signup/login -> dashboard -> checkout Stripe -> webhook -> plano premium ativo`

### Itens obrigatórios

1. Landing com oferta ativa
- Card Premium visível (sem flag de "em breve").
- Preço padronizado para R$ 187 em todos os pontos da landing.
- CTA "Encomendar Premium" apontando para `signup.html` (ou `dashboard.html` se já autenticado).

2. Mensageria consistente
- Remover textos que contradizem compra ativa (ex.: "plano pago em breve").
- FAQ e copy alinhadas com preço e fluxo reais.

3. Continuidade de sessão
- Se usuário já autenticado, enviar direto para dashboard e destacar CTA de upgrade.
- Se usuário não autenticado, concluir cadastro/login e cair no dashboard com caminho claro para upgrade.

4. Ativação confiável do plano
- Checkout cria sessão Stripe.
- Webhook atualiza `profiles.plan = 'premium'`.
- Dashboard sincroniza estado de plano sem depender de refresh manual.

---

## Estratégia de bloqueio Free vs Premium

### Princípio

Bloqueio em **duas camadas**:

1. **Backend (fonte da verdade)**
- Toda regra de autorização/limite deve ser validada no endpoint.
- Frontend nunca é suficiente para garantir bloqueio.

2. **Frontend (UX e conversão)**
- Feature premium aparece com estado bloqueado para plano free.
- Exibir CTA contextual de upgrade no próprio ponto de fricção.
- Mensagem de erro do backend deve ser traduzida para feedback claro na UI.

### Como bloquear cada feature

1. Tema/layout
- Backend: manter força de tema/layout free quando `plan !== 'premium'`.
- Frontend: desabilitar seleção de tema premium, exibir selo "Premium" e botão de upgrade.

2. Grupos de convidados
- Backend: negar criação de grupos para free (403 + `upgrade_required`).
- Frontend: desabilitar "Novo grupo" para free com tooltip/CTA.

3. Audio
- Backend: remover `media.tracks` no PATCH para free.
- Frontend: seção de audio bloqueada com texto de upgrade e inputs desabilitados.

4. Limite de convidados
- Backend: bloquear novas confirmações acima de 50 no free (429).
- Frontend: contador com limite visível e aviso de upgrade ao atingir teto.

5. Limite de galeria
- Backend: bloquear upload acima de 3 (free) e 5 (premium).
- Frontend: mostrar contador atual/limite e CTA quando atingir teto no free.

---

## Checklist de implementação

### 0. Landing e oferta comercial
- [x] Tornar card Premium visível em `landing.html` (sem bloco "oculto até Stripe").
- [x] Padronizar preço Premium para R$ 187 em toda landing.
- [x] Atualizar copy de "plano pago em breve" para oferta ativa.
- [x] Garantir CTA Premium para `signup.html` (ou dashboard quando autenticado).

### 1. Campo `plan` na resposta do event-config
- [x] `api/event-config.js` inclui `plan` do `profiles` na resposta JSON
- [x] Campo disponível no frontend via `config.plan`

### 2. Tela de entrada (loading screen)
- [x] Overlay estático em `index.html` cobre tudo antes do JS carregar (`loading-screen.js`)
- [x] `script.js` lê `config.plan` após bootstrap e salva em `localStorage`
- [x] Se premium: tela preta → fade para cor do tema → card com label, nomes e subtítulo do casal
- [x] Se free: logo devazi no overlay com botão "Abrir convite"
- [x] Ambos: botão dispara `enterInvitation({ skipIntro: true })`
- [x] Premium: `localStorage` esconde a brand devazi em visitas seguintes

### 3. Marca d'água no convite free
- [x] `index.html` tem `#devaziWatermark` oculto por padrão (dentro do `<footer>`)
- [x] `script.js` exibe quando `config.plan !== 'premium'`
- [x] URL corrigida para `www.devazi.app`; posicionado no rodapé (sem sobreposição mobile)

### 4. Tema fixo para free
- [x] `api/event-config.js` força `activeTheme = FREE_THEME` e `activeLayout = FREE_LAYOUT` quando `plan !== 'premium'`
- [ ] Dashboard bloqueia seleção de tema para usuários free (UI + CTA de upgrade)

### 5. Bloqueio de grupos (free)
- [x] `api/dashboard/guest-groups.js` recusa `POST` com 403 quando `plan = 'free'`
- [ ] Dashboard oculta/bloqueia botão "Novo grupo" para free com CTA de upgrade

### 6. Limite de 50 convidados (free)
- [x] `api/submissions.js` conta RSVPs via `checkRsvpLimit()` antes de inserir
- [x] Recusa com 429 quando `count >= 50` e `plan = 'free'`
- [x] Retorna erro claro para o frontend

### 7. Limite de galeria
- [x] `api/dashboard/media.js` conta imagens existentes antes do upload
- [x] Free: recusa acima de 3 imagens (`GALLERY_LIMIT_FREE = 3`)
- [x] Premium: recusa acima de 5 imagens (`GALLERY_LIMIT_PREMIUM = 5`)

### 8. Áudio bloqueado no free
- [x] `api/dashboard/event.js` remove `media.tracks` no PATCH quando `plan !== 'premium'`
- [ ] Dashboard bloqueia seção de áudio para free com CTA de upgrade

### 9. Correções de UI/UX do dashboard e convite
- [x] Layout "modern" oculto do `<select>` de layout no dashboard (`dashboard.html`) — estava quebrado e visível para o usuário
- [x] Layout "modern" removido da renderização de cards no editor (`editor.js` → `layoutSelectorHtml()`)
- [x] Cards de preview de tema no wizard passaram a exibir borda colorida semitransparente (cor primária do tema) em todos os estados — temas claros deixavam de aparecer como caixas brancas vazias no desktop
- [x] Laterais da hero (letterboxing no desktop) corrigidas para usar `var(--color-bg, #0e0d0b)` em vez de preto fixo (`layout.css`) — agora refletem o fundo do tema ativo
- [x] Overlay escuro da hero no desktop (`hero--full-photo`) corrigido de gradiente hardcoded (20%→40%→88%) para `var(--hero-overlay-gradient)` (10%→18%→78%→100%) — alinhado com o comportamento mobile, removendo a máscara excessivamente escura sobre a foto do casal
- [x] `<option>` dos `<select>` do dashboard passaram a herdar o fundo escuro do tema (`background: var(--surface); color: var(--text)`) — dropdown de seleção de tema não exibe mais fundo branco
- [x] Bug de auto-scroll corrigido em `script.js` (`enterInvitation`): `navigateWithinInvitation()` movido para antes dos `await` de áudio, eliminando o retorno involuntário ao topo da página durante a primeira rolagem

### 10. Integração de pagamento (Stripe)
- [x] `api/payments.js` existe com `?action=checkout` e `?action=webhook`
- [x] Checkout cria sessão Stripe com `mode: 'payment'`
- [x] Webhook atualiza `profiles.plan = 'premium'` e `expires_at = now() + 1 ano`
- [x] Dashboard: `renderPlanBadge()` exibe plano atual na sidebar e no drawer mobile
- [x] Dashboard: botão "Upgrade para Premium" visível apenas para free (sidebar desktop + drawer mobile)
- [x] Dashboard: `handleUpgrade()` chama `POST /api/payments?action=checkout`
- [x] Dashboard: `maybeShowPaymentBanner()` exibe banner após `?payment=success`
- [x] Dashboard sincroniza estado de plano após retorno do checkout (sem refresh manual)
- [ ] Stripe configurado em produção (produto + price + webhook + env vars no Vercel)

### 11. Testes end-to-end
- [ ] Fluxo completo free: landing -> cadastro -> convite -> marca d'água -> bloqueios ativos
- [ ] Fluxo completo premium: landing -> cadastro/login -> checkout -> webhook -> plano atualizado -> limites removidos
- [ ] Reenvio de webhook não duplica atualização de plano

---

## Próximos passos (por prioridade)

### A — Landing (desbloqueio comercial)
1. Exibir Premium e padronizar preço para R$ 187.
2. Remover textos de "em breve" e manter copy de compra ativa.
3. Revisar CTA para fluxo cadastro/login -> dashboard upgrade.

### B — Frontend: CTAs de bloqueio no dashboard (itens 4, 5, 8)
Usuários free ainda têm fricção confusa em recursos premium. Implementar:
1. Seleção de tema: desabilitar temas non-free + botão "Disponível no Premium".
2. Botão "Novo grupo": desabilitar + tooltip/CTA de upgrade.
3. Seção de áudio: desabilitar campos + mensagem de upgrade.

### C — Stripe em produção
Depende de MEI ativo. Quando disponível:
1. Criar produto + price no Stripe Dashboard → copiar `STRIPE_PRICE_ID`
2. Criar webhook endpoint → copiar `STRIPE_WEBHOOK_SECRET`
3. Adicionar env vars no Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `APP_URL`
4. Testar com Stripe CLI: `stripe listen --forward-to localhost:3000/api/payments?action=webhook`

### D — Testes e observabilidade
1. Rodar E2E de free e premium ponta a ponta.
2. Validar idempotência do webhook.
3. Registrar eventos de conversão: clique no CTA Premium, início de checkout, sucesso e falha.
