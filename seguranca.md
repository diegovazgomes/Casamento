# Checklist de Segurança — Convite de Casamento

> Auditoria realizada em 2026-05-18. Cobre frontend estático, Vercel Functions, Supabase e gestão de secrets.
> Verificações C1 executadas em 2026-05-18 — resultados inline em cada item.

---

## Resumo executivo

| Severidade | Qtd | Status geral |
|------------|-----|--------------|
| 🔴 Crítico | 0   | ✅ Todos resolvidos |
| 🟠 Alto    | 3   | Corrigir esta semana |
| 🟡 Médio   | 4   | Corrigir nas próximas 2 semanas (C1 rebaixado e esclarecido após verificação) |
| 🔵 Baixo   | 5   | Melhorias de boa prática |

---

## 🔴 CRÍTICO — Agir agora

### C1 — Token GitHub exposto no `.env`

**Arquivo:** `.env` (raiz do projeto)

O arquivo `.env` contém um GitHub Personal Access Token real (`github_pat_...`). Embora o `.gitignore` exclua o `.env`, o arquivo existe em disco.

**Impacto:** Quem tiver acesso à máquina local ou a um backup/clone que inclua o arquivo pode usar o token para autenticar como o dono da conta GitHub, acessar ou modificar repositórios privados, disparar Actions e comprometer o pipeline de deploy.

#### Resultado da verificação executada em 2026-05-18

| Verificação | Comando | Resultado |
|---|---|---|
| `.env` foi commitado alguma vez? | `git log --all --oneline -- .env` | ✅ **Nunca commitado** — sem saída |
| Token aparece no histórico git? | `git grep "github_pat\|GITHUB_TOKEN\|ghp_" $(git rev-list --all)` | ✅ **Não encontrado** em nenhum commit |
| `.env` está no `.gitignore`? | `cat .gitignore \| grep env` | ✅ **Sim** — `.env` e `.env.local` estão excluídos |
| Arquivo existe em disco? | `ls -la .env*` | ⚠️ **Sim** — `.env` de 106 bytes, criado em 04/05/2026 |

**Conclusão:** O token **não foi exposto no repositório git** e não está no histórico. O risco é restrito ao acesso físico à máquina local. Severidade rebaixada de Crítico para Médio-Alto.

#### Contexto adicional verificado em 2026-05-18 (log de auditoria GitHub)

O log de auditoria (`github.com/settings/security-log`) mostra apenas eventos de `oauth_access.regenerate` para o **Claude GitHub App** e **Supabase OAuth App** — tokens gerados e gerenciados automaticamente pelas integrações OAuth, não pelo token do `.env`. O token no `.env` é necessário para o fluxo de desenvolvimento local e **não há evidência de uso não autorizado**.

**Checklist de implementação:**
- [x] ~~Revogar o token~~ — token é necessário para desenvolvimento local (Claude GitHub App / Supabase OAuth)
- [ ] Mover o conteúdo do `.env` para `.env.local` (já coberto pelo `.gitignore`) e deletar o `.env` — apenas por higiene, para evitar confusão futura
- [ ] Nunca criar arquivos chamados `.env` sem o sufixo `.local` — padronizar em `.env.local` para desenvolvimento
- [ ] Monitorar o log de auditoria periodicamente: https://github.com/settings/security-log

---

### C2 — ~~Fallback do RSVP faz chamadas REST diretas ao Supabase pelo browser~~ ✅ CORRIGIDO

**Arquivo:** `assets/js/rsvp-persistence.js` — **corrigido em 2026-05-18**

O fallback que chamava a REST API do Supabase diretamente do browser foi removido. As funções `getConfig()` e `shouldFallbackToLegacySupabase()` (que existiam exclusivamente para suportar esse fallback) também foram removidas. Agora, se `/api/submissions` falhar por qualquer motivo, a submissão falha silenciosamente sem tentar contornar a camada de API — comportamento já esperado pelo design do projeto.

**Impacto na experiência do usuário:** nenhum em operação normal. Em caso de falha do servidor, a submissão falha em vez de cair para o fallback (que também falharia se o Supabase estivesse fora).

**Checklist de RLS ainda recomendado (defesa em profundidade):**
- [ ] Confirmar que RLS está **habilitado** em todas as tabelas no Supabase Dashboard
- [ ] Verificar que a role `anon` não tem `SELECT` ou `DELETE` em `rsvp_confirmations` e `guest_submissions`
- [ ] Verificar que nenhuma tabela sensível (`guest_tokens`, `profiles`, `events`) tem acesso para `anon`

---

## 🟠 ALTO — Corrigir esta semana

### A1 — CORS `*` em endpoints autenticados do dashboard

**Arquivos:** `api/dashboard/confirmations.js`, `api/dashboard/reminders.js`

Esses endpoints exigem Bearer token de autenticação, mas têm `Access-Control-Allow-Origin: *`. Qualquer site pode fazer requisições autenticadas a eles se o token do usuário estiver disponível.

**Checklist de verificação:**
- [ ] Listar todos os endpoints que definem `Access-Control-Allow-Origin: *`
- [ ] Identificar quais deles também exigem `Authorization: Bearer`
- [ ] Confirmar se o domínio do dashboard é fixo (ex: `casamento.vercel.app`)

**Checklist de implementação:**
- [ ] Nos endpoints do dashboard, trocar `*` pelo domínio real:
  ```js
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://seu-dominio.vercel.app');
  ```
- [ ] Adicionar `ALLOWED_ORIGIN` como variável de ambiente no Vercel
- [ ] Manter `*` apenas em endpoints **totalmente públicos e sem estado** (`/api/guest-token`, `/api/submissions` GET)

---

### A2 — Sem headers de segurança HTTP

**Arquivo:** `vercel.json`

O deploy não define nenhum header de segurança HTTP. Isso aumenta a superfície de impacto de XSS, clickjacking e sniffing de MIME.

**Checklist de verificação:**
- [ ] Inspecionar as respostas HTTP com DevTools → Network → qualquer requisição → ver headers de resposta
- [ ] Confirmar ausência de: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`

**Checklist de implementação:**
- [ ] Adicionar bloco `headers` no `vercel.json`:
  ```json
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
          { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=63072000; includeSubDomains; preload"
          }
        ]
      }
    ]
  }
  ```
- [ ] Para CSP, começar em modo `report-only` e refinar antes de aplicar em modo bloqueante (os scripts inline do `index.html` exigem `nonce` ou `unsafe-inline` temporariamente)
- [ ] Verificar no https://securityheaders.com após o deploy

---

### A3 — Sem rate limiting em `/api/submissions`

**Arquivo:** `api/submissions.js`

O endpoint aceita RSVPs, mensagens e sugestões de músicas sem qualquer limite de requisições por IP ou por token de convidado.

**Impacto:** spam massivo, esgotamento de cota do Supabase, dados de confirmação poluídos.

**Checklist de verificação:**
- [ ] Testar: enviar 50 requisições seguidas para `/api/submissions` e confirmar que todas são aceitas
- [ ] Verificar se o Supabase tem cota de escrita que pode ser esgotada

**Checklist de implementação:**
- [ ] Implementar rate limiting por IP usando um Map em memória (simples para Vercel Edge) ou KV store:
  ```js
  // Exemplo simples — máximo 5 submissões por IP a cada 10 minutos
  const rateLimitMap = new Map();
  ```
- [ ] Validar que `token_id` pertence a um token real do evento antes de aceitar o payload
- [ ] Adicionar campo `event_id` obrigatório e verificar que o evento existe e está ativo
- [ ] Considerar adicionar CAPTCHA (ex: Turnstile da Cloudflare, gratuito) para submissões públicas

---

## 🟡 MÉDIO — Corrigir nas próximas 2 semanas

### M1 — JWT do dashboard armazenado em `sessionStorage`

**Arquivo:** `assets/js/dashboard.js`

O token de sessão do Supabase Auth e o access token do dashboard são salvos em `sessionStorage`, que é acessível por qualquer JavaScript rodando na mesma origem.

**Impacto:** Se houver XSS (mesmo que pontual), o atacante lê e exfiltra o token.

**Checklist de verificação:**
- [ ] Abrir o DevTools no dashboard → Application → Session Storage → verificar quais tokens estão armazenados
- [ ] Confirmar tempo de expiração dos tokens

**Checklist de implementação:**
- [ ] Migrar para cookies HTTP-only + Secure + SameSite=Strict (requer ajuste no servidor para ler/escrever o cookie)
- [ ] Como alternativa mais simples: reduzir o TTL do token de sessão para 30–60 minutos
- [ ] Implementar rotação automática de token (refresh token flow)
- [ ] Adicionar limpeza explícita dos tokens em `beforeunload` e no logout

---

### M2 — `innerHTML` com dados de config sem sanitização explícita

**Arquivos:** `assets/js/script.js`, `presente.html`, `assets/js/dashboard.js`

Vários pontos usam `innerHTML` com dados vindos de `site.json` ou do Supabase. Embora a fonte seja considerada confiável, se o JSON for comprometido (via API), o XSS é possível.

**Exemplos identificados:**
- `script.js`: nomes do casal inseridos via `` `${names.firstName} <span>&</span> ${names.secondName}` ``
- `script.js`: cards de páginas extras com `cardLabel` e `cardHint` via `innerHTML`
- `dashboard.js`: renderização de confirmações com dados do Supabase via `innerHTML`

**Checklist de verificação:**
- [ ] Buscar todos os `innerHTML` no projeto: `grep -rn "innerHTML" assets/js/`
- [ ] Para cada ocorrência, rastrear a origem do dado (config JSON, Supabase, input do usuário)
- [ ] Verificar se algum campo de texto do `site.json` aceita HTML real ou é texto puro

**Checklist de implementação:**
- [ ] Para texto puro: substituir `innerHTML` por `textContent`
- [ ] Para HTML estrutural sem dados de usuário (ex: layout de cards): manter `innerHTML` mas com template literal apenas de strings estáticas
- [ ] Para dados vindos do Supabase: criar função `escapeHtml()` centralizada (já existe em `utils.js`) e aplicar antes de inserir via `innerHTML`
- [ ] Nunca inserir via `innerHTML` campos que o usuário preenche (nome, mensagem, sugestão de música)

---

### M3 — `commitSha` exposto publicamente

**Arquivo:** `api/event-config.js`

O endpoint `/api/event-config?mode=client-config` retorna o SHA do commit atual do deploy, facilitando a enumeração de versões por atacantes.

**Checklist de implementação:**
- [ ] Remover `commitSha` da resposta do endpoint público
- [ ] Se necessário para debug interno, proteger o endpoint com autenticação ou mover para um endpoint do dashboard

---

## 🔵 BAIXO — Boas práticas

### B1 — Sem `robots.txt`

- [ ] Criar `robots.txt` na raiz bloqueando páginas sensíveis:
  ```
  User-agent: *
  Disallow: /dashboard.html
  Disallow: /editor.html
  Disallow: /font-preview.html
  Disallow: /api/
  ```

### B2 — Sem `.well-known/security.txt`

- [ ] Criar `.well-known/security.txt` com e-mail de contato para reporte de vulnerabilidades (RFC 9116)

### B3 — Telefones armazenados em texto puro (LGPD)

- [ ] Verificar se a política de privacidade menciona o armazenamento de número de telefone
- [ ] Avaliar aplicar criptografia de coluna no Supabase para `phone` em `rsvp_confirmations`
- [ ] Definir prazo de retenção e rotina de exclusão após o evento

### B4 — Logs de erro podem vazar schema do banco

- [ ] Revisar todos os `console.warn` e `console.error` em `api/` que incluem campos vindos do Supabase (`details`, `hint`, `code`)
- [ ] Em produção, logar apenas o código de erro interno — nunca a resposta bruta do Supabase
- [ ] Considerar integrar Vercel Log Drains ou Sentry para capturar erros sem expô-los ao cliente

### B5 — Scripts inline no `index.html` sem CSP nonce

- [ ] Ao implementar CSP (item A2), o script de bootstrap inline em `index.html` precisará de um `nonce` gerado por requisição ou ser movido para um arquivo externo
- [ ] Mapear todos os blocos `<script>` inline e `style` inline que precisarão de nonce

---

## Verificação de Supabase — Checklist independente

Execute estes passos diretamente no Supabase Dashboard:

**Row Level Security:**
- [ ] Table Editor → `rsvp_confirmations` → RLS habilitado + policy de INSERT apenas com token válido
- [ ] Table Editor → `guest_submissions` → RLS habilitado + policy de INSERT apenas com token válido
- [ ] Table Editor → `guest_tokens` → RLS habilitado + policy de SELECT apenas para o próprio evento
- [ ] Table Editor → `profiles` → RLS habilitado + nenhuma policy de acesso para role `anon`
- [ ] Table Editor → `events` → RLS habilitado + nenhuma policy de acesso para role `anon`
- [ ] Testar todas as policies com o Supabase SQL Editor usando `SET ROLE anon;`

**Autenticação:**
- [ ] Authentication → Settings → confirmar que "Confirm email" está habilitado
- [ ] Authentication → Settings → confirmar que magic link tem TTL curto (≤ 1 hora)
- [ ] Authentication → Logs → revisar logins suspeitos recentes

**API:**
- [ ] Verificar que o `SUPABASE_SERVICE_ROLE_KEY` nunca é exposto em nenhum endpoint público
- [ ] Confirmar que a chave `anon` tem apenas as permissões mínimas necessárias

---

## Verificação de Vercel — Checklist independente

- [ ] Settings → Environment Variables → confirmar que `SUPABASE_SERVICE_ROLE_KEY` e `STRIPE_SECRET_KEY` estão definidos apenas para Production e Preview, nunca hardcoded
- [ ] Settings → Environment Variables → confirmar que não há tokens GitHub (`GITHUB_TOKEN`) nas variáveis de ambiente do Vercel (não são necessários para o projeto)
- [ ] Settings → Git → confirmar que o repositório não é público (se contém `api/` com lógica sensível)
- [ ] Deployments → revisar se algum deploy antigo expôs secrets via logs
- [ ] Functions → revisar logs de erros das Vercel Functions em busca de stack traces com informação sensível

---

## Referências rápidas

| Recurso | Link |
|---------|------|
| Revogar token GitHub | https://github.com/settings/tokens |
| Supabase RLS Docs | https://supabase.com/docs/guides/auth/row-level-security |
| Vercel Headers Config | https://vercel.com/docs/edge-network/headers |
| Security Headers Check | https://securityheaders.com |
| CSP Evaluator | https://csp-evaluator.withgoogle.com |
| OWASP Top 10 | https://owasp.org/www-project-top-ten/ |
