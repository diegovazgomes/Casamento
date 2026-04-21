# Guia de Testes — Dashboard do Casal (Fase 1)

> Passo a passo completo para validar o funcionamento do dashboard implementado em 21 de abril de 2026.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de que você tem:

- ✅ Node.js 18+ instalado
- ✅ npm ou yarn
- ✅ Acesso ao Supabase (projeto já criado)
- ✅ Variáveis de ambiente configuradas (`.env.local`)

### Configuração de Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto (ou adicione ao Vercel se for deploy):

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...seu-token...

# Dashboard
DASHBOARD_PASSWORD=sua-senha-aqui

# Opcional: Twilio (para testes de lembretes)
TWILIO_ACCOUNT_SID=seu-account-sid
TWILIO_AUTH_TOKEN=seu-token
TWILIO_PHONE_FROM=+5511999999999
```

---

## 🚀 FASE 1: Testes Locais (Sem Servidor)

### 1.1 Validar Estrutura de Arquivos

Verifique se todos os arquivos foram criados corretamente:

```powershell
# Verificar se arquivos existem
Test-Path "C:\Users\Latitude 5490\Desktop\Casamento\dashboard.html"
Test-Path "C:\Users\Latitude 5490\Desktop\Casamento\assets\js\dashboard.js"
Test-Path "C:\Users\Latitude 5490\Desktop\Casamento\api\dashboard\auth.js"
Test-Path "C:\Users\Latitude 5490\Desktop\Casamento\api\dashboard\guest-groups.js"
Test-Path "C:\Users\Latitude 5490\Desktop\Casamento\api\dashboard\confirmations.js"
Test-Path "C:\Users\Latitude 5490\Desktop\Casamento\api\dashboard\reminders.js"

# Se todos retornarem True, estrutura está OK ✅
```

### 1.2 Validar JSON do site.json

Verifique se a configuração do dashboard foi adicionada corretamente:

```powershell
# Abrir o JSON e verificar se o bloco "dashboard" existe
$content = Get-Content "assets/config/site.json" | ConvertFrom-Json
$content.dashboard

# Deve retornar algo como:
# enabled    : True
# eventId    : siannah-diego-2026
# reminderTemplates : @{pending=...; thankyou=...; announcement=...}
```

### 1.3 Validar Schema

Verifique se o schema foi atualizado:

```powershell
# Validar que o schema contém "dashboard"
(Get-Content "assets/config/schemas/site-schema.json") -match '"dashboard"'

# Deve retornar True se encontrou a propriedade ✅
```

### 1.4 Abrir o Dashboard Localmente

Inicie um servidor local para servir os arquivos estáticos:

```powershell
# Opção 1: Python (se tiver instalado)
python -m http.server 8000

# Opção 2: Node.js com http-server
npm install -g http-server
http-server -p 8000

# Opção 3: Usar VS Code Live Server (extensão)
# Clicar com botão direito em dashboard.html → Open with Live Server
```

Depois abra no navegador:
```
http://localhost:8000/dashboard.html
```

**Validações visuais:**
- [ ] Página carrega sem erros no console
- [ ] Tela de login aparece (campo de senha)
- [ ] Botão "Entrar" está clicável
- [ ] Estilos CSS estão sendo aplicados (cores, fontes, spacing)

---

## 🔐 FASE 2: Testes de Autenticação

### 2.1 Teste com Senha Incorreta

No formulário de login:

1. Digite qualquer senha (ex: `123456`)
2. Clique em "Entrar"
3. **Esperado**: Mensagem de erro vermelha "Invalid credentials"

**Como validar no Console do navegador:**
```javascript
// F12 → Console
// Você verá logs do fetch no Network tab
// Status: 403 Unauthorized
```

### 2.2 Teste com Senha Correta (Simulado)

Como a senha é armazenada em `DASHBOARD_PASSWORD` no servidor, você precisa:

**Opção A: Testar com servidor local Node.js**

```javascript
// Em node_modules/.bin, execute:
// (Este passo requer que você implante em staging ou Vercel)
```

**Opção B: Mock local para teste**

No console do navegador, execute:

```javascript
// Simular token salvo em sessionStorage
sessionStorage.setItem('dashboardToken', 'test-token-12345');

// Recarregar a página
location.reload();
```

**Esperado**: 
- [ ] Tela de login desaparece
- [ ] Dashboard aparece com 4 abas
- [ ] Seção de grupos carrega

---

## 🗄️ FASE 3: Testes de Interface (HTML/CSS)

### 3.1 Validar Abas

Com o dashboard aberto:

1. **Aba 1: Grupos de Convidados**
   - [ ] Botão "+ Novo Grupo" existe
   - [ ] Tabela de grupos é renderizada
   - [ ] Colunas: Grupo, Token, Confirmados, Vagas, Telefone, Ações

2. **Aba 2: Confirmações**
   - [ ] Filtros para Status, Grupo existem
   - [ ] Botão "Limpar Filtros" funciona
   - [ ] Tabela com paginação existe

3. **Aba 3: Relatórios**
   - [ ] 4 cards de estatísticas (Total, Confirmados, Recusados, Pendentes)
   - [ ] Tabela de breakdown por grupo
   - [ ] Placeholders de gráficos

4. **Aba 4: Export**
   - [ ] Botão "Baixar CSV" existe
   - [ ] Descrição menciona campos inclusos

### 3.2 Validar Responsividade

Abra DevTools (F12) e teste em diferentes viewports:

```javascript
// Alterar viewport para mobile
// DevTools → Device Toolbar (Ctrl+Shift+M)

// Testar em:
// [ ] 375px (iPhone SE)
// [ ] 768px (iPad)
// [ ] 1024px (Desktop)
// [ ] 1440px (Desktop large)

// Validar:
// [ ] Elementos não se sobrepõem
// [ ] Botões e inputs são clicáveis
// [ ] Tabelas scrollam horizontalmente se necessário
```

### 3.3 Validar Modais

Clique em "+ Novo Grupo":

- [ ] Modal "Novo Grupo" aparece com overlay
- [ ] Campos obrigatórios: Nome, Vagas
- [ ] Campos opcionais: Telefone, Notas
- [ ] Botão "Salvar Grupo" existe
- [ ] Botão X (fechar) funciona

---

## 🔌 FASE 4: Testes de Endpoints (Sem Servidor Real)

Se você NÃO tem servidor Node.js/Vercel rodando, você pode fazer testes simulados:

### 4.1 Testar Chamadas de Rede (Network Tab)

1. Abra DevTools → **Network**
2. Recarregue a página
3. Tente fazer login

**Você verá:**
- [ ] POST `/api/dashboard/auth` (vai falhar com 404 se não houver servidor, mas a estrutura aparecerá)

**No Console, você pode simular respostas:**

```javascript
// Simular resposta bem-sucedida de auth
const mockAuthResponse = {
  token: 'mock-token-' + Date.now(),
  expiresAt: Date.now() + 3600000,
  expiresIn: '1h'
};

// Armazenar manualmente
sessionStorage.setItem('dashboardToken', mockAuthResponse.token);
location.reload();
```

### 4.2 Validar Estrutura de Requisições

Os endpoints esperados são:

```bash
# Autenticação
POST /api/dashboard/auth
Body: { "password": "..." }

# Grupos
GET /api/dashboard/guest-groups?eventId=siannah-diego-2026
POST /api/dashboard/guest-groups
PATCH /api/dashboard/guest-groups?id=uuid
DELETE /api/dashboard/guest-groups?id=uuid

# Confirmações
GET /api/dashboard/confirmations?eventId=...&status=...&page=1
GET /api/dashboard/confirmations/export?eventId=...

# Lembretes
POST /api/dashboard/reminders/send-whatsapp
Body: { "eventId": "...", "tokenId": "...", "message": "..." }
```

---

## 🗄️ FASE 5: Testes com Supabase Real

### 5.1 Verificar Tabelas no Supabase

Acesse [supabase.com](https://supabase.com) e navegue até seu projeto:

**SQL Editor:**

```sql
-- Verificar se as 3 novas tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('couple_credentials', 'guest_views', 'reminder_logs');

-- Deve retornar 3 linhas
```

**Table Editor:**

1. Clique em `guest_tokens` → deve listar grupos existentes
2. Clique em `rsvp_confirmations` → deve listar confirmações
3. Clique em `couple_credentials` → deve estar vazio (ainda não criado)
4. Clique em `guest_views` → deve estar vazio (rastreamento não implementado)
5. Clique em `reminder_logs` → deve estar vazio

### 5.2 Inserir Dados de Teste

**Criar um grupo de teste:**

No SQL Editor do Supabase:

```sql
INSERT INTO guest_tokens (event_id, token, group_name, max_confirmations, phone, notes)
VALUES (
  'siannah-diego-2026',
  'test-token-' || gen_random_uuid()::text,
  'Família Teste',
  3,
  '11999999999',
  'Grupo de teste para validação'
);
```

**Criar confirmações de teste:**

```sql
INSERT INTO rsvp_confirmations (name, phone, attendance, event_id, source, user_agent)
VALUES 
  ('João Silva', '11999999999', 'yes', 'siannah-diego-2026', 'website', 'Mozilla/5.0...'),
  ('Maria Santos', '11988888888', 'no', 'siannah-diego-2026', 'website', 'Mozilla/5.0...'),
  ('Pedro Costa', '11977777777', 'yes', 'siannah-diego-2026', 'website', 'Mozilla/5.0...');
```

---

## 🧪 FASE 6: Testes de Funcionalidade JavaScript

### 6.1 Testar Funções Principais

Abra o Console do navegador (F12) e execute:

```javascript
// Testar mask de telefone
maskPhone('11999999999');
// Esperado: "****9999"

maskPhone(null);
// Esperado: "N/A"

// Testar escape HTML
escapeHtml('<script>alert("xss")</script>');
// Esperado: "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"

// Testar estado de autenticação
console.log(state);
// Deve mostrar: { authToken: null, eventId: '...', grupos: [], ... }
```

### 6.2 Testar Modais

```javascript
// Abrir modal de novo grupo
openModal('modalGrupo', 'Novo Grupo');

// Fechar modal
closeModal('modalGrupo');

// Validar que o modal tem classe 'active'
document.getElementById('modalGrupo').classList.contains('active');
// Deve retornar true ou false conforme aberto/fechado
```

### 6.3 Testar Filtros

```javascript
// Simular seleção de filtro
document.getElementById('filterStatus').value = 'yes';

// Disparar evento de mudança
document.getElementById('filterStatus').dispatchEvent(new Event('change'));

// Validar que reloadConfirmacoes() foi chamado
// (você verá em Network → POST /api/dashboard/confirmations)
```

---

## 📊 FASE 7: Testes de Dados e Relatórios

### 7.1 Teste de Paginação

Com dados de teste no Supabase:

1. Vá para aba **Confirmações**
2. Verifique se paginação aparece
3. Clique em "Próxima" → deve carregar próxima página
4. Clique em "Anterior" → volta para página anterior

**Validar no Console:**

```javascript
// Verificar estado da página
state.currentPage;
// Deve retornar número atual

// Verificar dados carregados
state.confirmacoes.length;
// Deve ser > 0 se há confirmações
```

### 7.2 Teste de Filtros

1. Vá para aba **Confirmações**
2. Selecione Status = "Confirmados" (Yes)
3. Tabela deve atualizar mostrando apenas "✅ Confirmado"

**No Network:**
```
GET /api/dashboard/confirmations?eventId=siannah-diego-2026&status=yes
```

### 7.3 Teste de Relatórios

Aba **Relatórios** deve mostrar:

```
Total de Confirmações: [número]
Confirmados:          [número]
Recusados:            [número]
Pendentes:            [número]
```

Validar que os números somam corretamente.

---

## 💾 FASE 8: Teste de Export CSV

### 8.1 Gerar e Baixar CSV

1. Aba **Export**
2. Clique em "Baixar CSV"
3. Arquivo `confirmacoes-siannah-diego-2026-[timestamp].csv` deve ser baixado

### 8.2 Validar Conteúdo do CSV

Abra o arquivo baixado em editor de texto:

```csv
Nome,Telefone,Status,Grupo,Data Confirmação
"João Silva","****9999",Confirmado,"Família Teste","21/04/2026, 10:30:45"
"Maria Santos","****8888",Recusado,"Família Teste","21/04/2026, 11:00:00"
```

**Validações:**
- [ ] Header está correto
- [ ] Dados estão presentes
- [ ] Telefones são mascarados (****9999)
- [ ] Status em português (Confirmado, Recusado)
- [ ] Aspas duplas não quebram o CSV
- [ ] Abre corretamente no Excel

---

## 🚨 FASE 9: Testes de Erro e Edge Cases

### 9.1 Teste sem Conexão com Supabase

1. Abra DevTools → Network
2. Selecione **Offline** no dropdown
3. Tente fazer login
4. **Esperado**: Mensagem de erro "Erro ao conectar ao servidor"

### 9.2 Teste com Token Expirado

```javascript
// Simular token expirado
sessionStorage.setItem('dashboardToken', 'expired-token');

// Recarregar página
location.reload();

// Tente carregar grupos
// Esperado: Erro 401 Unauthorized
// Dashboard volta para tela de login
```

### 9.3 Teste com Dados Vazios

1. Se não houver grupos no Supabase:
   - [ ] Aba Grupos mostra "Nenhum grupo criado ainda"
   - Botão "+ Novo Grupo" continua funcional

2. Se não houver confirmações:
   - [ ] Aba Confirmações mostra "Nenhuma confirmação encontrada"

### 9.4 Teste com Campos Obrigatórios Vazios

Modal "Novo Grupo":

1. Deixe "Nome do Grupo" em branco
2. Clique "Salvar Grupo"
3. **Esperado**: Campo fica marcado como required (HTML5 validation)

---

## ✅ Checklist de Conclusão

Marque conforme você completa cada teste:

### Arquivos e Estrutura
- [ ] Todos os 7 arquivos novos existem
- [ ] `site.json` contém bloco `dashboard`
- [ ] Schema foi atualizado
- [ ] `.env.local` está configurado

### Interface
- [ ] Dashboard abre sem erros
- [ ] 4 abas visíveis
- [ ] Modais funcionam
- [ ] Layout é responsivo

### Autenticação
- [ ] Rejeita senha errada
- [ ] Aceita senha correta (em staging)
- [ ] Token é armazenado em sessionStorage
- [ ] Logout limpa token

### Dados e API
- [ ] Supabase contém 3 tabelas novas
- [ ] Dados de teste foram inseridos
- [ ] Endpoints estrutura está correta
- [ ] Network tab mostra chamadas

### Funcionalidades
- [ ] Grupos listam/criam/editam/deletam
- [ ] Confirmações filtram por status
- [ ] Paginação funciona
- [ ] Relatórios calculam números
- [ ] Export CSV baixa arquivo válido

### Edge Cases
- [ ] Trata erro de conexão
- [ ] Trata token expirado
- [ ] Trata dados vazios
- [ ] Valida campos obrigatórios

---

## 🚀 Próximas Etapas

Após completar todos os testes locais:

1. **Deploy para Staging (Vercel)**
   - Adicionar variáveis de ambiente
   - Fazer deploy
   - Testar em URL pública

2. **Configurar Twilio** (opcional)
   - Adicionar credenciais ao Vercel
   - Testar envio de lembrete

3. **Iniciar Fase 2**
   - Implementar rastreamento de aberturas
   - Integrar `/api/guest-view`

---

## 📞 Troubleshooting

**Problema**: "POST /api/dashboard/auth 404"
- **Causa**: Servidor não está rodando (Vercel não deployado ou servidor local não inicializado)
- **Solução**: Fazer deploy ou iniciar servidor local com `npm run dev`

**Problema**: "CORS error"
- **Causa**: Servidor local não tem CORS habilitado
- **Solução**: Endpoints incluem headers CORS, mas pode precisar ajuste em production

**Problema**: "Supabase connection refused"
- **Causa**: `SUPABASE_URL` ou `SUPABASE_ANON_KEY` incorretos
- **Solução**: Verificar variáveis em `.env.local` ou Vercel Settings

**Problema**: "CSS/JS não carrega"
- **Causa**: Caminhos relativos incorretos
- **Solução**: Verificar que servidor HTTP está servindo arquivos estáticos corretamente

---

## 📚 Referências

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Deployment](https://vercel.com/docs)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [CSV RFC 4180](https://tools.ietf.org/html/rfc4180)

---

**Última atualização**: 21 de abril de 2026
**Status**: Pronto para testes
