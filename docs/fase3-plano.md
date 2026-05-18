# Fase 3 — Monetização e limites de plano

## Definição dos planos

| Feature | Free | Premium (R$197) |
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

## Checklist de implementação

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
- [ ] Dashboard bloqueia seleção de tema para usuários free (UI + CTA de upgrade) ← **próximo passo**

### 5. Bloqueio de grupos (free)
- [x] `api/dashboard/guest-groups.js` recusa `POST` com 403 quando `plan = 'free'`
- [ ] Dashboard oculta/bloqueia botão "Novo grupo" para free com CTA de upgrade ← **próximo passo**

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
- [ ] Dashboard bloqueia seção de áudio para free com CTA de upgrade ← **próximo passo**

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
- [ ] Stripe configurado em produção (produto + price + webhook + env vars no Vercel) ← **pendente MEI**

### 11. Testes end-to-end
- [ ] Fluxo completo free: cadastro → convite → marca d'água → bloqueios ativos
- [ ] Fluxo completo premium: pagamento → plano atualizado → limites removidos → tela de entrada premium
- [ ] Reenvio de webhook não duplica atualização de plano

---

## Próximos passos (por prioridade)

### A — Frontend: CTAs de bloqueio no dashboard (itens 4, 5, 8)
Usuários free conseguem ver e interagir com funcionalidades premium que são silenciosamente bloqueadas no backend. A UX fica confusa. Implementar:
- Seleção de tema: desabilitar temas non-free + botão "Disponível no Premium"
- Botão "Novo grupo": desabilitar + tooltip/CTA de upgrade
- Seção de áudio: desabilitar campos + mensagem de upgrade

### B — Stripe em produção
Depende de MEI ativo. Quando disponível:
1. Criar produto + price no Stripe Dashboard → copiar `STRIPE_PRICE_ID`
2. Criar webhook endpoint → copiar `STRIPE_WEBHOOK_SECRET`
3. Adicionar env vars no Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `APP_URL`
4. Testar com Stripe CLI: `stripe listen --forward-to localhost:3000/api/payments?action=webhook`

### C — Testes (item 10)
Após B estar configurado, realizar os testes de ponta a ponta dos dois fluxos.
