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
- [ ] `api/event-config.js` inclui `plan` do `profiles` na resposta JSON
- [ ] Campo disponível no frontend via `config.plan`

### 2. Tela de entrada (loading screen)
- [ ] Overlay estático em `index.html` cobre tudo antes do JS carregar
- [ ] `script.js` lê `config.plan` após `app:ready`
- [ ] Se premium: detecta luminância de `var(--color-background)`, anima overlay, exibe card com nomes
- [ ] Se free: exibe logo devazi no overlay com botão de abertura
- [ ] Ambos: botão dispara `enterInvitation()`

### 3. Marca d'água no convite free
- [ ] `index.html` tem elemento `#watermark` oculto por padrão
- [ ] `script.js` exibe `#watermark` quando `config.plan !== 'premium'`
- [ ] Estilo: rodapé fixo discreto com link para devazi.com.br

### 4. Tema fixo para free
- [ ] `api/event-config.js` força `activeTheme = 'classic-gold'` quando `plan = 'free'`
- [ ] Dashboard bloqueia seleção de tema para usuários free (UI + backend)

### 5. Bloqueio de grupos (free)
- [ ] `api/dashboard/guest-groups.js` recusa `POST` quando `plan = 'free'`
- [ ] Dashboard oculta/bloqueia botão "Novo grupo" para free com CTA de upgrade

### 6. Limite de 50 convidados (free)
- [ ] `api/submissions.js` conta RSVPs do evento antes de inserir
- [ ] Recusa quando `count >= 50` e `plan = 'free'`
- [ ] Retorna erro claro para o frontend

### 7. Limite de galeria
- [ ] `api/dashboard/media.js` conta imagens existentes antes do upload
- [ ] Free: recusa acima de 3 imagens na galeria
- [ ] Premium: recusa acima de 5 imagens na galeria

### 8. Áudio bloqueado no free
- [ ] `api/dashboard/event.js` ignora campos de áudio no PATCH quando `plan = 'free'`
- [ ] Dashboard bloqueia seção de áudio para free com CTA de upgrade

### 9. Página de upgrade no dashboard
- [ ] Card de upgrade visível para usuários free em pontos de bloqueio
- [ ] Botão "Fazer upgrade" chama `POST /api/payments?action=checkout`
- [ ] Após upgrade: banner de confirmação + plano atualizado na sidebar

### 10. Testes
- [ ] Fluxo completo free: cadastro → convite publicado → marca d'água visível → bloqueios ativos
- [ ] Fluxo completo premium: pagamento → plano atualizado → todos os limites removidos → tela de entrada premium
- [ ] Reenvio de webhook não duplica atualização de plano
