# ⚡ Respostas Diretas — Suas 3 Perguntas

---

## ❓ Pergunta 1: Preciso rodar setup.sql no Supabase?

### ✅ **SIM, É OBRIGATÓRIO**

O arquivo `docs/supabase-setup.sql` **cria 3 tabelas novas** que o dashboard precisa:

```
✅ couple_credentials  → Dados do casal
✅ guest_views         → Rastreia aberturas (Fase 2)
✅ reminder_logs       → Histórico de lembretes
```

### Como Rodar (2 minutos):

```
1. Abra https://app.supabase.com
2. Clique no seu projeto
3. Menu esquerdo: SQL Editor
4. Clique: + New Query
5. Copie TODO o conteúdo de docs/supabase-setup.sql
6. Cole no editor
7. Clique: Run (ou Ctrl+Enter)
8. Espere: ✅ "Success"
```

**Pronto!** As 3 tabelas foram criadas.

---

## ❓ Pergunta 2: Como vejo o Dashboard? Por onde acesso?

### ✅ **Uma URL só**

```
https://seu-projeto.vercel.app/dashboard.html
```

Substitua `seu-projeto` pela URL real do seu projeto Vercel.

### Exemplo Real:
```
Se sua URL Vercel é: https://casamento-siannah.vercel.app
Então o dashboard fica em: https://casamento-siannah.vercel.app/dashboard.html
```

### O que você vê (Tela de Login):

```
┌─────────────────────────────────────┐
│  🔐 Dashboard — Acesso do Casal     │
│                                     │
│  Senha: [________________________]   │
│         [     Entrar    ]            │
└─────────────────────────────────────┘
```

Você digita: **DASHBOARD_PASSWORD** que setou em `.env.local`

---

## ❓ Pergunta 3: Qual o Passo a Passo Completo?

### 🎯 5 Fases (50 minutos total)

#### **FASE 1: Setup SQL** ⏱️ 5 minutos

```
1. Supabase > SQL Editor > + New Query
2. Copie docs/supabase-setup.sql (TODO)
3. Cole no editor
4. Run ✅
```

**Resultado:** 3 tabelas criadas

---

#### **FASE 2: Vercel Setup** ⏱️ 10 minutos

```
1. vercel.com > Seu projeto > Settings
2. Environment Variables
3. Adicione:
   ├─ SUPABASE_URL = https://seu-projeto.supabase.co
   ├─ SUPABASE_ANON_KEY = (copie de Supabase Settings > API)
   └─ DASHBOARD_PASSWORD = sua-senha-secreta
4. Save
5. Redeploy (botão acima)
6. Espere: "Deployment successful"
```

**Resultado:** Variáveis prontas em produção

---

#### **FASE 3: Acessar Dashboard** ⏱️ 5 minutos

```
1. Navegador: https://seu-projeto.vercel.app/dashboard.html
2. Tela de login aparece
3. Digite DASHBOARD_PASSWORD
4. Clique: Entrar
5. Você vê: 4 abas (Grupos, Confirmações, Relatórios, Export)
```

**Resultado:** Dashboard acessível

---

#### **FASE 4: Testar Funcionalidades** ⏱️ 20 minutos

```
✅ Teste 1: Novo Grupo
   └─ Clique "Novo Grupo"
   └─ Preencha: Nome, Max Confirmações, Telefone
   └─ Salve
   └─ Grupo aparece na tabela

✅ Teste 2: Confirmações
   └─ Vá na aba "Confirmações"
   └─ (Vazia no início, normal)

✅ Teste 3: Relatórios
   └─ Vá na aba "Relatórios"
   └─ Veja números (Total, Confirmados, etc)

✅ Teste 4: Export CSV
   └─ Vá na aba "Export"
   └─ Clique "Baixar CSV"
   └─ Arquivo baixa no PC
```

**Resultado:** Todas as funcionalidades funcionam

---

#### **FASE 5: Dados de Teste** ⏱️ 10 minutos

```
1. Supabase > Table Editor > guest_tokens
   └─ +New row
   └─ Preencha: token, group_name, max_confirmations, event_id
   └─ Save

2. Supabase > Table Editor > rsvp_confirmations
   └─ +New row
   └─ Preencha: name, phone, status (yes/no), token_id, event_id
   └─ Save

3. Dashboard > Recarregue (F5)
   └─ Vá em "Confirmações"
   └─ Seus dados aparecem! ✅
   └─ Vá em "Relatórios"
   └─ Números atualizam! ✅
```

**Resultado:** Dashboard com dados reais

---

## 📋 Checklist Rápido

```
FASE 1 ✅ Setup SQL
  [ ] Abri Supabase
  [ ] Copiei setup.sql
  [ ] Rodei no SQL Editor
  [ ] 3 tabelas aparecem

FASE 2 ✅ Vercel Setup
  [ ] Adicionei SUPABASE_URL
  [ ] Adicionei SUPABASE_ANON_KEY
  [ ] Adicionei DASHBOARD_PASSWORD
  [ ] Cliquei Save
  [ ] Fiz Redeploy
  [ ] "Deployment successful"

FASE 3 ✅ Acesso
  [ ] Acessei /dashboard.html
  [ ] Tela de login apareceu
  [ ] Digitei senha
  [ ] Entrei (4 abas visíveis)

FASE 4 ✅ Testes
  [ ] Criei grupo de teste
  [ ] Grupo apareceu na tabela
  [ ] Cliquei em Confirmações (vazio OK)
  [ ] Cliquei em Relatórios (números aparecem)
  [ ] Baixei CSV (arquivo gerado)

FASE 5 ✅ Dados Teste
  [ ] Criei grupo em Supabase
  [ ] Criei confirmação em Supabase
  [ ] Recarreguei dashboard (F5)
  [ ] Dados aparecem em Confirmações
  [ ] Números atualizam em Relatórios
```

---

## 🎯 Resumo Executivo

| Pergunta | Resposta Curta |
|----------|---|
| **Rodar setup.sql?** | ✅ SIM — 5 minutos no Supabase SQL Editor |
| **Como acessar?** | 🌐 `https://seu-projeto.vercel.app/dashboard.html` + senha |
| **Passo a passo?** | 5️⃣ 5 fases: SQL, Vercel, Login, Testes, Dados (50 min) |

---

## 🚨 Erro? Aqui está o que fazer:

```
❌ "Erro de autenticação"
   └─ Verificar DASHBOARD_PASSWORD em Vercel

❌ "Erro de conexão"
   └─ Verificar SUPABASE_URL e SUPABASE_ANON_KEY em Vercel

❌ "Tabelas não encontradas"
   └─ Rodar setup.sql novamente em Supabase

❌ "Nenhum dado aparece"
   └─ Criar dados manualmente em Supabase Table Editor
```

---

## 📚 Documentação Completa

Se precisar de mais detalhes:

- **[TESTE-PRODUCAO.md](TESTE-PRODUCAO.md)** ← Guia completo (este documento expandido)
- **[PROXIMOS-PASSOS-DASHBOARD.md](PROXIMOS-PASSOS-DASHBOARD.md)** ← Instruções passo a passo
- **[DASHBOARD-RESUMO-FINAL.md](DASHBOARD-RESUMO-FINAL.md)** ← Resumo técnico

---

## ✨ Pronto?

Comece pela **FASE 1** agora:

```
Abra: https://app.supabase.com
Menu: SQL Editor > + New Query
Copie: docs/supabase-setup.sql (TODO)
Cole e: Run
```

Depois volta aqui e fazemos a **FASE 2** 👍

---

**Data:** 21 de abril de 2026  
**Status:** 🟢 Pronto para teste em produção
