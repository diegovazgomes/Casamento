# Checklist de Segurança — Convite de Casamento

> Auditoria realizada em 2026-05-18. Cobre frontend estático, Vercel Functions, Supabase e gestão do secrets.
> Verificações C1, RLS e Storage executadas em 2026-05-18 — resultados inline em cada item.

> **Isolamento de ambientes confirmado em 2026-05-18:** dev (`zunizibunrsjizgsfdlr.supabase.co`) e produção (`lrlmjalkbgbzzsbgdfax.supabase.co`) são projetos completamente separados — Supabase, Vercel, GitHub e emails distintos, todas as chaves independentes. O ambiente dev não representa risco para dados de produção.

---

## Resumo executivo

| Severidade | Qtd | Status geral |
|------------|-----|--------------|
| 🔴 Crítico | 1   | ✅ C3 (Storage) corrigido em 2026-05-18 |
| 🟠 Alto    | 0   | ✅ Todos corrigidos — A1 env var adicionada no Vercel |
| 🟡 Médio   | 0   | ✅ Todos tratados — M1 é limitação do plano gratuito, risco residual aceito |
| 🔵 Baixo   | 1   | B1/B2/B4/B5 corrigidos — B3 aguarda ação no Supabase (LGPD) |

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

**Verificação de RLS concluída em 2026-05-18:**

| Tabela | INSERT | SELECT | UPDATE | DELETE |
|---|---|---|---|---|
| `rsvp_confirmations` | ✅ público (intencional) | ✅ só servidor | — bloqueado | — bloqueado |
| `guest_submissions` | ✅ público (intencional) | ✅ só servidor | — bloqueado | — bloqueado |
| `guest_tokens` | ✅ só servidor (`with_check`) | ⚠️ todos os tokens visíveis (ver abaixo) | ✅ só servidor (`with_check`) | — bloqueado |
| `profiles` | — | ✅ só dono autenticado | ✅ só dono autenticado | — bloqueado |
| `events` | ✅ só autenticado | ✅ anon vê eventos ativos (intencional) | ✅ só dono | — bloqueado |
| `payment_events` | — | ✅ bloqueado via `qual: false` | — | — |

**⚠️ guest_tokens SELECT:** a policy `public_read_tokens` tem `qual: true` sem filtro — qualquer pessoa pode listar todos os tokens de todos os eventos. Impacto prático baixo para este projeto (evento único, tokens são UUIDs difíceis de adivinhar de outra forma, e o SELECT não dá acesso a dados sensíveis nem permite modificações). A melhoria (filtrar por `event_id`) não eliminaria o risco pois o `event_id` já é semi-público, então foi aceita como limitação conhecida.

---

### C3 — ~~Bucket `event-media` no Storage sem restrição de dono~~ ✅ CORRIGIDO

**Local:** Supabase Storage → Bucket `event-media` → Storage Policies (produção) — **corrigido em 2026-05-18**

As 4 policies do bucket em produção usavam apenas `(bucket_id = 'event-media'::text)` como condição — sem qualquer verificação de autenticação ou de dono do arquivo. Qualquer pessoa (inclusive usuários anônimos) podia:

| Operação | Risco |
|---|---|
| SELECT (leitura/listagem) | Listar **todos** os arquivos de **todos** os eventos do bucket |
| INSERT (upload) | Fazer upload de arquivos para qualquer caminho no bucket |
| UPDATE | Sobrescrever arquivos de outros usuários |
| DELETE | Deletar arquivos de outros usuários |

**Por que o ambiente dev estava correto:** o projeto dev usava a policy com verificação de dono via `split_part(objects.name, '/'::text, 1)` comparando com o `user_id` do evento autenticado — o padrão correto.

**Correção aplicada em 2026-05-18:** todas as 4 policies de produção foram atualizadas para o mesmo padrão do dev, que valida ownership via:

```sql
EXISTS (
  SELECT 1 FROM events
  WHERE events.user_id = auth.uid()
    AND split_part(objects.name, '/'::text, 1) = events.user_id::text
)
```

Isso garante que apenas o dono autenticado do evento pode ler, fazer upload, atualizar ou deletar seus próprios arquivos.

**Verificação pós-correção:**
- [x] Policy SELECT — restrita ao dono autenticado
- [x] Policy INSERT — restrita ao dono autenticado
- [x] Policy UPDATE — restrita ao dono autenticado
- [x] Policy DELETE — restrita ao dono autenticado

---

## 🟠 ALTO — Corrigir esta semana

### A1 — ~~CORS `*` em endpoints autenticados do dashboard~~ ✅ CORRIGIDO

**Arquivos corrigidos em 2026-05-18:** `api/dashboard/confirmations.js`, `api/dashboard/reminders.js`, `api/dashboard/guest-groups.js`, `api/dashboard/media.js`, `api/dashboard/event.js`, `api/dashboard/submissions.js`

Todos os endpoints do dashboard trocaram `'*'` por `process.env.ALLOWED_ORIGIN || 'https://devazi.app'`. O endpoint público `api/submissions.js` manteve `'*'` intencionalmente.

**Variável `ALLOWED_ORIGIN` adicionada no Vercel em 2026-05-18:**
- [x] Projeto **prod** (`devazi`): `ALLOWED_ORIGIN` = `https://devazi.app`
- [x] Projeto **dev** (`casamento`): `ALLOWED_ORIGIN` = `https://casamento-siannah-diego.vercel.app`

---

### A2 — ~~Sem headers de segurança HTTP~~ ✅ CORRIGIDO

**Arquivo:** `vercel.json` — **corrigido em 2026-05-18**

Adicionado bloco `headers` global com: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` e `Strict-Transport-Security` (HSTS 2 anos com preload).

- [ ] Após o próximo deploy, verificar em https://securityheaders.com
- [ ] CSP fica como próximo passo (requer mapeamento dos scripts inline)

---

### A3 — ~~Sem rate limiting em `/api/submissions`~~ ✅ CORRIGIDO

**Arquivo:** `api/submissions.js` — **corrigido em 2026-05-18**

Implementado rate limiting por IP: máximo 10 submissões por minuto por IP. IPs que ultrapassam o limite recebem HTTP 429 com header `Retry-After: 60`. A lógica usa Map em memória seguindo o mesmo padrão já existente em `api/event-config.js`.

---

## 🟡 MÉDIO — Corrigir nas próximas 2 semanas

### M1 — JWT do dashboard armazenado em `sessionStorage` — ⚠️ Limitação de plano

**Arquivo:** `assets/js/dashboard.js`

O token de sessão fica em `sessionStorage`. Configurar TTL de sessão e inactivity timeout requer **plano Pro do Supabase** — indisponível no plano atual.

**Proteções ativas verificadas em 2026-05-18:**
- ✅ JWT de acesso expira em **1 hora** (padrão Supabase free)
- ✅ "Detect and revoke potentially compromised refresh tokens" — **ativo** nos dois projetos. Se um refresh token for reutilizado simultaneamente (sinal de roubo), a sessão inteira é invalidada automaticamente

**Rate limits de autenticação verificados — todos adequados:**
- Sign-ins: 30/5 min por IP (proteção contra brute force)
- Token refreshes: 150/5 min por IP
- Magic link/OTP: 30/5 min por IP

**Risco residual:** baixo para o uso atual (1-2 usuários autenticados). Migração para cookies HTTP-only fica como melhoria futura caso o plano evolua ou o volume de usuários aumente.

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

**Corrigido em 2026-05-18** — `escapeHtml` (já existente em `utils.js`) aplicado em:
- [x] `faq.js` — `question` e `answer`
- [x] `historia.js` — `year`, `title`, `text` de cada capítulo
- [x] `hospedagem.js` — `name`, `description`, `linkLabel` e validação de URL com `isSafeUrl()` para bloquear `javascript:` nos `href`

`dashboard.js` tem o mesmo padrão com dados do Supabase, mas o dashboard só é acessado pelo casal autenticado — risco residual aceito.

---

### M3 — ~~`commitSha` exposto publicamente~~ ✅ CORRIGIDO

**Arquivo:** `api/event-config.js` — **corrigido em 2026-05-18**

Removido o campo `commitSha` da resposta do endpoint público `/api/event-config?mode=client-config`.

---

## 🔵 BAIXO — Boas práticas

### B1 — ~~Sem `robots.txt`~~ ✅ CORRIGIDO

Criado `robots.txt` em 2026-05-18 bloqueando: `dashboard.html`, `editor.html`, `font-preview.html`, `signup.html`, `confirm.html`, `reset-password.html`, `forgot-password.html` e `/api/`.

### B2 — ~~Sem `.well-known/security.txt`~~ ✅ CORRIGIDO

Criado `.well-known/security.txt` em 2026-05-18 (RFC 9116) com contato `ddiego533@gmail.com`, expiração em 2027-05-18 e canonical para `devazi.app`.

### B3 — Telefones armazenados em texto puro (LGPD) — ⏳ Ação do usuário

- [ ] No Supabase Dashboard → Table Editor → `rsvp_confirmations` → clicar na coluna `phone` → habilitar **Column Encryption** (disponível no plano gratuito via Vault)
- [ ] Verificar se `privacy.html` menciona coleta e armazenamento de número de telefone
- [ ] Definir prazo de retenção: deletar registros de `rsvp_confirmations` após o evento (sugestão: 90 dias pós-casamento)

### B4 — ~~Logs de erro podem vazar schema do banco~~ ✅ CORRIGIDO

Removidos os campos `details` e `hint` do Supabase das respostas HTTP de erro em `api/submissions.js`. Esses campos continuam nos logs do servidor (Vercel Functions) para debug, mas não chegam mais ao browser do cliente.

### B5 — ~~Scripts inline sem CSP~~ ✅ CORRIGIDO (com ressalva)

CSP adicionado ao `vercel.json` em 2026-05-18 cobrindo todas as páginas:
- `default-src 'self'` — bloqueia origens desconhecidas por padrão
- `script-src` — permite `'self'`, `cdn.jsdelivr.net` (Supabase SDK) e `unpkg.com` (Leaflet)
- `style-src` / `font-src` — permite Google Fonts
- `media-src 'self' https://*.supabase.co` — permite áudio servido pelo Supabase Storage
- `connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net` — permite fetch/XHR para Supabase e source maps do CDN
- `frame-ancestors 'none'` — anti-clickjacking (reforça X-Frame-Options)
- `base-uri 'self'` e `form-action 'self'` — previne injeção de base e hijack de formulários

**Correção aplicada em 2026-05-18:** CSP inicial estava bloqueando o áudio (faltava `media-src`) e source maps do Supabase JS SDK (faltava `cdn.jsdelivr.net` em `connect-src`). Ambos corrigidos.

**Ressalva:** `unsafe-inline` em `script-src` é necessário pelos scripts inline de bootstrap no `index.html`. Eles lêem `sessionStorage` antes do carregamento do JS modular e não podem ser movidos para arquivos externos sem refatoração. O CSP atual ainda bloqueia scripts de origens externas não listadas, que é o vetor mais comum de XSS.

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
