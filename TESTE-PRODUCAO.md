# 🚀 Teste em Produção — Guia Prático

**Data:** 21 de abril de 2026

---

## ❓ Suas Perguntas

1. ❓ Como testo o dashboard em produção?
2. ❓ Como vejo o dashboard? Por onde acesso?
3. ❓ Preciso rodar o setup.sql no Supabase?

---

## 1️⃣ Preciso rodar setup.sql no Supabase? **SIM**

### O que é o setup.sql?

É um arquivo SQL que **cria 3 tabelas novas** no seu banco de dados Supabase:

```sql
couple_credentials  → Armazena credenciais do casal
guest_views        → Rastreia aberturas do convite (Fase 2)
reminder_logs      → Audit trail de lembretes enviados
```

**Você já tem:** `guest_tokens` e `rsvp_confirmations` (existentes)  
**Você precisa adicionar:** `couple_credentials`, `guest_views`, `reminder_logs`

### Como Rodar o setup.sql (Passo a Passo)

#### Opção A: Via Supabase Console (Recomendado)

1. **Abra Supabase**
   - Acesse https://app.supabase.com
   - Clique no seu projeto

2. **Vá em SQL Editor**
   - Menu esquerdo: **SQL Editor**

3. **Crie uma nova query**
   - Clique **+ New Query**

4. **Copie o SQL**
   - Abra [`docs/supabase-setup.sql`](../../docs/supabase-setup.sql) no VS Code
   - Copie **TODO o conteúdo**

5. **Cole no SQL Editor**
   - Cole no Supabase SQL Editor
   - Clique **Run** (ou Ctrl+Enter)

6. **Confirmação**
   - Deve aparecer: ✅ "Success"
   - As 3 tabelas foram criadas

#### Opção B: Via Supabase CLI (Avançado)

```bash
# Se tiver supabase cli instalado:
supabase db push
```

### ⚠️ Cuidado

- ✅ **Seguro rodar:** As tabelas não existem ainda, então será criação pura
- ❌ **NÃO faça:** Rodá-lo 2x (vai dar erro de "table already exists")
- ✅ **Se errar:** Pode deletar manualmente as 3 tabelas e rodar novamente

---

## 2️⃣ Como Acesso o Dashboard? **Via URL direta**

### Onde Acessar

```
https://seu-projeto.vercel.app/dashboard.html
```

ou em desenvolvimento local:

```
http://localhost:3000/dashboard.html
```

### Passo a Passo para Acessar

#### Em Produção (Vercel)

1. **Vá para:**
   ```
   https://seu-projeto.vercel.app/dashboard.html
   ```
   
   > Substitua `seu-projeto` pelo nome real do seu projeto Vercel
   > 
   > Se não souber, vá em https://vercel.com e copie a URL de produção

2. **Digite a senha**
   - A senha é: `DASHBOARD_PASSWORD` que você configurou em `.env.local`
   - Exemplo: Se você setou `DASHBOARD_PASSWORD=MinhaS3nh4!`, digite isso

3. **Clique "Entrar"**

4. **Pronto!** Você entra no dashboard com 4 abas

#### Em Desenvolvimento Local

1. **Rodar servidor local**
   ```powershell
   npx serve .
   ```

2. **Abra no navegador**
   ```
   http://localhost:3000/dashboard.html
   ```

3. **Digite a senha** (mesma senha do `.env.local`)

4. **Clique "Entrar"**

---

## 3️⃣ Passo a Passo Completo de Teste em Produção

### FASE 1: Setup Supabase (5 minutos)

**Checklist:**
- [ ] 1. Abri Supabase em app.supabase.com
- [ ] 2. Copiei o SQL completo de `docs/supabase-setup.sql`
- [ ] 3. Colei no Supabase SQL Editor
- [ ] 4. Rodar script → ✅ Success

**Confirmação:** Vá em **Supabase > Table Editor** e confirme 3 tabelas aparecem:
- ✅ `couple_credentials`
- ✅ `guest_views`
- ✅ `reminder_logs`

---

### FASE 2: Configurar Vercel (10 minutos)

**Você já tem:** Código implementado em produção

**Você precisa:** Adicionar as variáveis de ambiente

#### 2.1 Adicionar Env Vars em Vercel

1. **Acesse Vercel**
   - https://vercel.com/dashboard

2. **Clique no seu projeto**
   - Procure pelo projeto "casamento" ou similar

3. **Vá em Settings > Environment Variables**

4. **Adicione cada variável:**

   ```
   Nome: SUPABASE_URL
   Valor: https://seu-projeto.supabase.co
   
   Nome: SUPABASE_ANON_KEY
   Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   Nome: DASHBOARD_PASSWORD
   Valor: sua-senha-super-secreta
   ```

   > ⚠️ NUNCA compartilhe essas credenciais!

5. **Clique Save**

#### 2.2 Fazer Redeploy

1. **Volte ao dashboard principal**
2. **Clique em "Redeploy"** ao lado do seu projeto
3. **Espere ~2 minutos** (barra de progresso verde)
4. **Confirmação:** "Deployment successful"

**Checklist:**
- [ ] 1. Adicionei as 3 env vars (SUPABASE_URL, SUPABASE_ANON_KEY, DASHBOARD_PASSWORD)
- [ ] 2. Cliquei Save
- [ ] 3. Fiz redeploy
- [ ] 4. Esperei até ficar "Deployment successful"

---

### FASE 3: Acessar o Dashboard (5 minutos)

#### 3.1 Ir para o Dashboard

1. **Abra no navegador:**
   ```
   https://seu-projeto.vercel.app/dashboard.html
   ```

2. **Você vê a tela de login?**
   ```
   ┌─────────────────────────────────┐
   │ 🔐 Dashboard — Acesso do Casal  │
   │                                 │
   │ Senha: [________________]        │
   │        [Entrar]                 │
   └─────────────────────────────────┘
   ```

3. **Digite sua senha**
   - Use a senha que você setou em `DASHBOARD_PASSWORD`

4. **Clique "Entrar"**

#### 3.2 Confirmação

Se tudo funcionou, você vê:

```
┌─────────────────────────────────────────┐
│  Grupos | Confirmações | Relatórios | Export │
│                                         │
│ [Novo Grupo]                            │
│                                         │
│ Tabela de Grupos vazia (ou com dados)   │
└─────────────────────────────────────────┘
```

**Checklist:**
- [ ] 1. Acessei `/dashboard.html`
- [ ] 2. Tela de login apareceu
- [ ] 3. Digitei a senha
- [ ] 4. Entrei no dashboard (4 abas visíveis)

---

### FASE 4: Testar Funcionalidades (20 minutos)

#### Teste 1: Criar um Grupo

1. **Clique em "Novo Grupo"**
2. **Preencha:**
   ```
   Nome: Teste 01
   Max Confirmações: 5
   Telefone: (11) 99999-9999
   Notas: Grupo de teste
   ```
3. **Clique "Salvar"**

**Esperado:** Grupo aparece na tabela com um token gerado

**Verificação:** Vá em Supabase > guest_tokens e confirme a linha foi inserida

---

#### Teste 2: Listar Confirmações

1. **Clique em "Confirmações"**
2. **Você vê uma tabela vazia ou com dados?**

**Esperado:** Tabela está vazia inicialmente (nenhum convite aberto ainda)

**Verificação:** Vá em Supabase > rsvp_confirmations e confirme

---

#### Teste 3: Ver Relatórios

1. **Clique em "Relatórios"**
2. **Você vê estatísticas:**
   ```
   Total de Convidados: 5
   Confirmados: 0
   Recusados: 0
   Pendentes: 5
   ```

**Esperado:** Números aparecem (podem ser 0 no início)

---

#### Teste 4: Baixar CSV

1. **Clique em "Export"**
2. **Clique "Baixar CSV"**

**Esperado:** Arquivo `confirmacoes.csv` baixa no navegador

**Verificação:** Abra o CSV (Excel/Notepad) e confirme:
- Headers em português: Nome, Telefone, Status, Grupo, Data
- Dados das confirmações (ou vazio se nenhuma ainda)

**Checklist:**
- [ ] 1. Criei um grupo de teste
- [ ] 2. Grupo apareceu na tabela
- [ ] 3. Cliquei em "Confirmações" (tabela vazia é normal)
- [ ] 4. Cliquei em "Relatórios" (números aparecem)
- [ ] 5. Baixei CSV (arquivo foi gerado)

---

### FASE 5: Teste de Dados (10 minutos)

#### 5.1 Criar Dados de Teste no Supabase

1. **Abra Supabase Console**
   - https://app.supabase.com → Table Editor

2. **Vá em `guest_tokens`**
   - Clique o "+New row"
   - Preencha:
     ```
     token: meu-token-teste-001
     group_name: Família Teste
     max_confirmations: 10
     event_id: siannah-diego-2026
     ```
   - Salve

3. **Vá em `rsvp_confirmations`**
   - Clique "+ New row"
   - Preencha:
     ```
     name: João da Silva
     phone: 11999999999
     status: yes
     token_id: (copie o ID de guest_tokens que você criou)
     event_id: siannah-diego-2026
     ```
   - Salve

#### 5.2 Volte ao Dashboard

1. **Recarregue a página** (F5)
2. **Vá em "Confirmações"**

**Esperado:** João da Silva apareça na tabela!

3. **Vá em "Relatórios"**

**Esperado:** "Confirmados: 1" aparece!

**Checklist:**
- [ ] 1. Criei dados de teste em Supabase
- [ ] 2. Recarreguei o dashboard
- [ ] 3. Dados aparecem em "Confirmações"
- [ ] 4. Estatísticas atualizam em "Relatórios"

---

## ✅ Resumo de Testes (45 minutos total)

| Fase | O que fazer | Tempo | Status |
|------|------------|-------|--------|
| 1 | Rodar setup.sql no Supabase | 5 min | ⏳ |
| 2 | Configurar env vars em Vercel | 10 min | ⏳ |
| 3 | Acessar /dashboard.html | 5 min | ⏳ |
| 4 | Testar CRUD e export | 20 min | ⏳ |
| 5 | Criar dados de teste | 10 min | ⏳ |

**Total:** ~50 minutos até estar 100% pronto

---

## 🎯 Checklist Final

### Antes de Começar
- [ ] Tenho acesso a Supabase (app.supabase.com)
- [ ] Tenho acesso a Vercel (vercel.com)
- [ ] Tenho a URL de produção do projeto Vercel

### Supabase Setup
- [ ] Copiei docs/supabase-setup.sql
- [ ] Rodei no Supabase SQL Editor
- [ ] 3 tabelas aparecem em Table Editor

### Vercel Setup
- [ ] Adicionei SUPABASE_URL
- [ ] Adicionei SUPABASE_ANON_KEY
- [ ] Adicionei DASHBOARD_PASSWORD
- [ ] Fiz redeploy
- [ ] "Deployment successful" apareceu

### Teste do Dashboard
- [ ] Acessei /dashboard.html
- [ ] Login funcionou (tela de 4 abas)
- [ ] Criei grupo de teste
- [ ] Grupo apareceu na tabela
- [ ] CSV foi baixado
- [ ] Dados de teste aparecem em "Confirmações"
- [ ] "Relatórios" mostra números

---

## 🆘 Problemas Comuns

### Problema: "Erro 404" ao acessar /dashboard.html
**Causa:** Arquivo não foi deployado  
**Solução:**
1. Confirme que `dashboard.html` existe no repositório
2. Faça redeploy em Vercel
3. Espere 2 minutos

### Problema: "Erro de autenticação" no login
**Causa:** DASHBOARD_PASSWORD errado ou não configurado  
**Solução:**
1. Vá em Vercel > Settings > Environment Variables
2. Confirme `DASHBOARD_PASSWORD` está exato
3. Faça redeploy

### Problema: "Erro de conexão" ao entrar
**Causa:** SUPABASE_URL ou SUPABASE_ANON_KEY errado  
**Solução:**
1. Vá em https://app.supabase.com > Settings > API
2. Copie SUPABASE_URL e ANON_KEY novamente
3. Atualize em Vercel
4. Redeploy

### Problema: Tabelas não aparecem em Supabase
**Causa:** setup.sql não foi rodado  
**Solução:**
1. Abra SQL Editor em Supabase
2. Cole o conteúdo completo de `docs/supabase-setup.sql`
3. Clique "Run"
4. Confirme ✅ "Success"

### Problema: CSV está vazio ou com dados errados
**Causa:** Supabase ainda não tem confirmações ou token_id errado  
**Solução:**
1. Vá em Supabase > rsvp_confirmations
2. Crie alguns registros de teste manualmente
3. Volta ao dashboard e recarregue (F5)
4. Baixe CSV novamente

---

## 📞 Próximos Passos

### Depois que os testes passarem:

1. **Fase 2 (Rastreamento)** - Implementar rastreamento de aberturas
2. **Testes de Carga** - Simular múltiplos grupos
3. **Configuração Final** - Trocar senha, adicionar Twilio se quiser

---

## 🎓 Referência Rápida

| Recurso | Link |
|---------|------|
| Dashboard em Produção | `https://seu-projeto.vercel.app/dashboard.html` |
| Supabase Console | https://app.supabase.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| Setup SQL | `docs/supabase-setup.sql` |
| Documentação Técnica | `CLAUDE.md` |

---

**Status:** 🟢 Pronto para teste em produção  
**Próximo:** Execute a FASE 1 (rodar setup.sql)
