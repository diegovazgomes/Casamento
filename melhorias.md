# Melhorias
## Bride/Groom
[x] - Adicionar dois novos campos de texto no signup.html (bride_name e groom_name)
[x] - Atualizar API `/api/auth/signup.js` para persistir bride_name e groom_name
[x] - Remover campos bride_name/groom_name do wizard etapa 1, manter apenas "Como aparecem no convite"
[x] - Adicionar campos bride_name e groom_name no editor do evento (aba Editar Evento)
[x] - Persistir alterações de bride_name e groom_name na API

## Layout Mobile

[x] - Corrigir grid do wizard etapa 2 para mobile (data e horário devem ficar 100% width em mobile)
[x] - Atualizar placeholder do endereço para "Av. Rainha Simone, 1971"

## Temas Free

[x] - Filtrar temas no wizard etapa 3: exibir apenas classic-gold, classic-silver, classic-gold-light, classic-silver-light
[x] - Adicionar banner: "Esses são os temas do plano free. Upgrade para acessar mais temas"

## Prévia do Convite

[x] - Remover risco/linha que passa sobre a data na prévia
[x] - Remover quadriculado de fundo em temas light

## Mensagens (Convite Criado!)

[x] - Mensagem 01: trocar "menu lateral" por "aba Editar Evento"
[x] - Mensagem 02: trocar "No topo do painel" por "na aba Editar Evento"
[x] - Mensagem 03: atualizar para mencionar "aba Convites" e "convite individual personalizado"

## Dashboard

[x] - Mover "Editar Evento" para segunda posição na sidebar (após Visão Geral)

## Próximas Melhorias (Execução + Testes)

### 1) Cadastro: corrigir autofill (web + mobile)

[x] - Reproduzir e documentar o bug de autofill em `signup.html` (email, telefone, senha e demais campos afetados)
[x] - Corrigir estilo de `autofill` para manter identidade visual (evitar campo branco após preenchimento automático)
[x] - Corrigir sincronização de valor/validação para aceitar envio sem precisar apagar e digitar novamente
[ ] - Validar comportamento em navegadores mobile e desktop (Chrome/Edge/Safari quando aplicável)
[x] - Adicionar teste de regressão (manual guiado e automatizado se viável)

### 2) Mobile: aumentar tipografia proporcionalmente

[ ] - Mapear escalas tipográficas atuais no mobile (base, títulos, labels, botões e helpers)
[ ] - Definir nova escala proporcional mantendo legibilidade e sofisticação visual
[ ] - Aplicar ajustes globais de fonte/tamanho/line-height para mobile sem quebrar layout
[ ] - Revisar telas principais no celular (`landing`, `signup`, `dashboard`, `editor`)
[ ] - Executar checklist visual de regressão (overflow, cortes de texto e hierarquia)

### 3) Editar Evento: reforçar estado de alterações não salvas por seção

[ ] - Adicionar bloco de aviso no fim de cada seção da aba Editar Evento (`Aparências`, `Página de presentes`, `Confirmação`, etc.)
[ ] - Exibir mensagem destacada de "Alterações não salvas" quando houver mudanças pendentes
[ ] - Incluir botão de salvar no rodapé de cada seção (mesma ação do botão salvar do topo)
[ ] - Após salvar com sucesso, exibir confirmação verde equivalente ao feedback do topo
[ ] - Testar fluxo completo no mobile (editar -> aviso pendente -> salvar no rodapé -> confirmação)

### 4) Upload de fotos: UX de envio e pós-envio

[ ] - Melhorar instruções visuais da área de upload (hero e galeria) antes do envio
[ ] - Adicionar estado de carregamento com feedback claro (ex.: barra/progresso ou status "carregando")
[ ] - Exibir confirmação explícita após upload concluído com orientação para salvar alterações
[ ] - Tratar estados de erro (falha de upload, arquivo inválido, limite excedido) com mensagens claras
[ ] - Validar jornada completa em mobile: selecionar foto -> upload -> confirmação -> salvar

### Sequência sugerida de entrega

[ ] - Entrega A: item 1 (autofill) + testes de regressão
[ ] - Entrega B: item 2 (tipografia mobile) + revisão visual completa
[ ] - Entrega C: item 3 (avisos/save por seção) + testes de UX no editor
[ ] - Entrega D: item 4 (upload de fotos) + testes ponta a ponta no mobile


Quando tentamos criar conta com email existente, ele não informa que esse email já esta cadastrado