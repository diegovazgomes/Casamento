# DEVAZI — UI System v1

## Documento de sistema visual, interface e experiência

Este documento define os princípios práticos de UI da Devazi para orientar landing page, produto, painel, checkout, templates, fluxos internos, componentes e futuras implementações.

Ele deve ser usado junto com:

```txt
/docs/brand/DEVAZI_Brand_Architecture_v1.md
/docs/brand/DEVAZI_AI_CONTEXT.md
```

A função deste arquivo é transformar a estratégia da marca em decisões concretas de interface.

---

# 1. Princípio central de UI

A interface da Devazi deve parecer premium porque é simples.

A Devazi não deve ter aparência de dashboard pesado, SaaS genérico, marketplace de templates ou ferramenta técnica.

A experiência deve transmitir:

- respiro;
- clareza;
- sofisticação silenciosa;
- direção editorial;
- precisão;
- calma;
- confiança;
- facilidade;
- tecnologia invisível.

A interface ideal deve fazer o casal sentir:

> Estou criando uma experiência elegante para o meu casamento, não configurando um sistema.

---

# 2. Personalidade visual da interface

A UI da Devazi deve ser:

- editorial;
- minimalista;
- quente;
- refinada;
- tátil;
- mobile-first;
- silenciosa;
- organizada;
- humana;
- premium por padrão.

A UI da Devazi não deve ser:

- fria demais;
- técnica demais;
- colorida demais;
- promocional demais;
- ornamentada demais;
- infantilizada;
- densa;
- com cara de template barato;
- com cara de Canva;
- com cara de SaaS comum.

---

# 3. Direção visual

## 3.1 Território

A direção visual deve se aproximar de:

- casas editoriais contemporâneas;
- papelaria premium;
- revistas de casamento sofisticadas;
- interfaces de luxo minimalista;
- produtos digitais silenciosos;
- direção de arte europeia;
- experiências digitais refinadas.

Referências conceituais:

- Aesop;
- Apple;
- The Row;
- Vogue Weddings;
- COS;
- revistas editoriais italianas;
- luxury editorial UI;
- branding europeu minimalista.

## 3.2 Sensação

A interface deve sugerir:

- papel;
- linho;
- marfim;
- tinta;
- silêncio;
- margem;
- luz natural;
- composição;
- cuidado;
- precisão.

---

# 4. Tokens de cor

## 4.1 Paleta conceitual

A paleta da Devazi deve ser quente, editorial e sofisticada.

Cores principais:

```txt
Ivory / Marfim
Linen / Linho
Warm White / Branco quente
Off Black / Preto suave
Aged Gold / Ouro envelhecido
Warm Beige / Bege quente
Soft Taupe / Taupe suave
Warm Gray / Cinza quente
```

## 4.2 Sugestão inicial de tokens

> Ajuste os HEX conforme a paleta real do projeto, mas mantenha a lógica semântica.

```css
:root {
  --color-bg-primary: #F7F1E8;
  --color-bg-secondary: #EFE5D8;
  --color-bg-tertiary: #E7D8C7;

  --color-surface-primary: #FFFDF8;
  --color-surface-secondary: #F4EBDD;
  --color-surface-muted: #E9DED0;

  --color-text-primary: #1E1B18;
  --color-text-secondary: #5E554C;
  --color-text-muted: #8A7D70;
  --color-text-inverse: #FFFDF8;

  --color-border-soft: #DED1C3;
  --color-border-medium: #C9B9A8;
  --color-border-strong: #9F8D7A;

  --color-accent: #A8895C;
  --color-accent-hover: #8F734C;
  --color-accent-soft: #D8C3A3;

  --color-success: #66745F;
  --color-warning: #A87945;
  --color-error: #8A4D45;

  --color-overlay: rgba(30, 27, 24, 0.48);
}
```

## 4.3 Regras de uso de cor

### Fundo

Priorizar fundos claros, quentes e suaves.

Evitar branco puro excessivo quando a intenção for premium editorial. O branco pode ser usado, mas deve parecer papel, não tela vazia.

### Texto

Usar off-black no lugar de preto puro.

Preto absoluto pode parecer duro demais para a marca.

### Dourado

O dourado envelhecido deve ser usado como detalhe:

- botões pontuais;
- linhas finas;
- etiquetas;
- ícones pequenos;
- estados especiais;
- detalhes editoriais.

Evitar dourado como grande área de fundo ou efeito chamativo.

### Estados

Estados de erro, sucesso e aviso devem ser discretos, legíveis e humanos.

Evitar vermelho vibrante, verde neon ou amarelo agressivo.

---

# 5. Tipografia

## 5.1 Fontes-base

Fontes atuais da marca:

```txt
Cormorant Garamond
Playfair Display
Inter
DM Mono
```

## 5.2 Sistema recomendado

### Serifas

Usar serifas para:

- headlines;
- títulos institucionais;
- seções editoriais;
- frases de impacto;
- páginas públicas;
- momentos de marca.

Serifas devem transmitir:

- elegância;
- editorialidade;
- sofisticação;
- presença;
- calma.

### Sans-serif

Usar sans-serif para:

- navegação;
- textos de interface;
- formulários;
- botões;
- cards;
- dashboards;
- mensagens;
- tabelas;
- listas.

Sans-serif deve garantir:

- clareza;
- legibilidade;
- precisão;
- funcionalidade.

### Mono

Usar mono para:

- pequenos rótulos;
- datas;
- códigos;
- planos;
- etiquetas;
- estados;
- detalhes editoriais.

Usar com moderação.

---

# 6. Escala tipográfica

## 6.1 Desktop

Sugestão de escala:

```css
--font-size-display: clamp(3.75rem, 8vw, 7.5rem);
--font-size-hero: clamp(3rem, 6vw, 5.75rem);
--font-size-h1: clamp(2.5rem, 5vw, 4.5rem);
--font-size-h2: clamp(2rem, 4vw, 3.25rem);
--font-size-h3: clamp(1.5rem, 3vw, 2.25rem);
--font-size-h4: 1.25rem;

--font-size-body-lg: 1.125rem;
--font-size-body: 1rem;
--font-size-body-sm: 0.875rem;
--font-size-caption: 0.75rem;
--font-size-label: 0.6875rem;
```

## 6.2 Mobile

No mobile, preservar elegância sem sacrificar clareza.

```css
--mobile-hero: clamp(2.5rem, 13vw, 4.25rem);
--mobile-h1: clamp(2.125rem, 10vw, 3.5rem);
--mobile-h2: clamp(1.75rem, 8vw, 2.75rem);
--mobile-h3: clamp(1.375rem, 6vw, 2rem);
--mobile-body: 1rem;
--mobile-caption: 0.8125rem;
```

## 6.3 Line-height

```css
--line-height-display: 0.92;
--line-height-heading: 1.04;
--line-height-subheading: 1.18;
--line-height-body: 1.6;
--line-height-ui: 1.4;
--line-height-caption: 1.3;
```

## 6.4 Letter-spacing

```css
--letter-spacing-tight: -0.04em;
--letter-spacing-heading: -0.025em;
--letter-spacing-body: -0.01em;
--letter-spacing-label: 0.12em;
```

Rótulos em caixa alta devem ter letter-spacing generoso.

Headlines serifadas podem ter letter-spacing negativo leve para aparência editorial.

---

# 7. Grid e layout

## 7.1 Desktop

Usar grid editorial com bastante margem.

Recomendações:

```css
--container-max: 1200px;
--container-wide: 1440px;
--container-reading: 760px;
--grid-columns: 12;
--grid-gap: 24px;
```

Princípios:

- evitar blocos muito largos de texto;
- usar assimetria com intenção;
- alternar seções densas e seções silenciosas;
- preservar margens generosas;
- usar alinhamentos editoriais;
- evitar centralização excessiva em todas as seções.

## 7.2 Mobile

Mobile é prioridade real.

Regras:

- uma coluna principal;
- margens laterais confortáveis;
- CTAs fáceis de tocar;
- formulários grandes e claros;
- textos com boa leitura;
- evitar cards muito pequenos;
- evitar tabelas complexas;
- evitar menus pesados.

Sugestão:

```css
--mobile-page-padding: 20px;
--mobile-section-padding: 72px;
--mobile-card-padding: 20px;
```

## 7.3 Larguras

```css
--width-xs: 360px;
--width-sm: 480px;
--width-md: 768px;
--width-lg: 1024px;
--width-xl: 1280px;
--width-2xl: 1440px;
```

---

# 8. Espaçamento

## 8.1 Princípio

O espaçamento é uma das principais ferramentas de sofisticação da Devazi.

Mais respiro comunica mais valor.

Evitar telas apertadas, seções coladas, cards empilhados sem ritmo ou excesso de informação no mesmo bloco.

## 8.2 Escala de spacing

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-32: 128px;
--space-40: 160px;
```

## 8.3 Espaçamento por contexto

### Landing page

```txt
Hero: 120px a 180px vertical
Seções principais: 96px a 160px
Blocos internos: 40px a 80px
Cards: 24px a 40px
```

### Produto/painel

```txt
Page padding: 24px a 40px
Card padding: 20px a 32px
Grid gap: 16px a 24px
Form gap: 16px a 24px
```

### Mobile

```txt
Hero: 88px a 120px
Seções principais: 72px a 96px
Cards: 20px a 28px
Form gap: 16px
```

---

# 9. Radius

## 9.1 Princípio

Bordas devem ser suaves, mas não infantis.

Evitar radius exagerado em elementos sérios.

```css
--radius-xs: 4px;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 18px;
--radius-xl: 24px;
--radius-2xl: 32px;
--radius-full: 999px;
```

## 9.2 Uso recomendado

```txt
Botões: 999px ou 12px, conforme contexto
Inputs: 12px a 16px
Cards: 18px a 28px
Modais: 24px a 32px
Imagens: 16px a 28px
Badges: 999px
```

Recomendação visual:

- landing: pode usar radius mais editorial e generoso;
- painel: usar radius moderado, mais funcional;
- templates de casamento: usar conforme estética do modelo, preservando sofisticação.

---

# 10. Shadows e profundidade

## 10.1 Princípio

A Devazi deve usar pouca sombra.

Profundidade deve vir mais de:

- hierarquia;
- cor;
- borda;
- respiro;
- composição;
- sobreposição sutil.

Evitar sombras SaaS genéricas, pesadas ou azuladas.

## 10.2 Tokens

```css
--shadow-xs: 0 1px 2px rgba(30, 27, 24, 0.04);
--shadow-sm: 0 4px 12px rgba(30, 27, 24, 0.06);
--shadow-md: 0 12px 32px rgba(30, 27, 24, 0.08);
--shadow-lg: 0 24px 60px rgba(30, 27, 24, 0.10);
```

## 10.3 Uso recomendado

```txt
Cards simples: nenhuma sombra ou shadow-xs
Cards premium: shadow-sm
Modais: shadow-md
Elementos flutuantes importantes: shadow-md ou shadow-lg
Botões: geralmente sem sombra
```

---

# 11. Bordas e divisórias

## 11.1 Princípio

Bordas finas ajudam a criar estética editorial.

Usar bordas como alternativa a sombras.

```css
--border-hairline: 1px solid var(--color-border-soft);
--border-regular: 1px solid var(--color-border-medium);
--border-strong: 1px solid var(--color-border-strong);
```

## 11.2 Uso recomendado

- cards;
- listas;
- tabelas;
- seções editoriais;
- formulários;
- menu;
- planos;
- estados vazios;
- divisores horizontais.

Evitar bordas grossas demais.

---

# 12. Botões

## 12.1 Princípio

Botões devem ser claros, elegantes e discretos.

A Devazi não deve usar botões chamativos, gradientes agressivos ou efeitos exagerados.

## 12.2 Tamanhos

```css
.button-sm {
  height: 36px;
  padding: 0 16px;
  font-size: 0.875rem;
}

.button-md {
  height: 44px;
  padding: 0 22px;
  font-size: 0.9375rem;
}

.button-lg {
  height: 52px;
  padding: 0 28px;
  font-size: 1rem;
}
```

## 12.3 Variantes

### Primary

Uso:

- ação principal;
- hero;
- checkout;
- salvar;
- publicar;
- upgrade.

Estética:

```txt
Fundo off-black ou accent
Texto claro
Pouca ou nenhuma sombra
Hover levemente mais claro ou mais escuro
```

### Secondary

Uso:

- ações alternativas;
- navegação;
- ver detalhes;
- cancelar sem risco.

Estética:

```txt
Fundo transparente ou surface
Borda fina
Texto escuro
Hover com fundo sutil
```

### Ghost

Uso:

- ações de baixa prioridade;
- links internos;
- menus;
- ações em cards.

Estética:

```txt
Sem borda
Sem fundo
Hover suave
```

### Editorial Link

Uso:

- links premium;
- chamadas secundárias;
- navegação editorial.

Estética:

```txt
Texto com sublinhado fino ou seta
Sem aparência de botão tradicional
```

## 12.4 CTAs alinhados

Usar:

- Criar meu site
- Começar agora
- Ver planos
- Ver exemplo
- Publicar meu site
- Personalizar site
- Adicionar convidados
- Configurar presentes
- Salvar alterações

Evitar:

- Comprar agora!!!
- Garantir oferta
- Clique aqui
- Quero bombar
- Aproveitar promoção

---

# 13. Inputs e formulários

## 13.1 Princípio

Formulários devem parecer calmos, claros e confiáveis.

O usuário deve sentir que está preenchendo algo simples, não enfrentando burocracia.

## 13.2 Estrutura

Cada campo deve ter:

- label claro;
- placeholder discreto;
- ajuda opcional quando necessário;
- erro humano;
- estado de foco visível;
- espaçamento confortável.

## 13.3 Estilo recomendado

```css
.input {
  min-height: 48px;
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-md);
  background: var(--color-surface-primary);
  color: var(--color-text-primary);
  padding: 0 16px;
  font-size: 1rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(168, 137, 92, 0.14);
}
```

## 13.4 Labels

Labels devem ser objetivos.

Exemplos:

```txt
Nome do casal
Data do casamento
Local da cerimônia
Mensagem de boas-vindas
Nome do convidado
E-mail
Telefone
Valor do presente
Chave Pix
```

## 13.5 Placeholders

Placeholders devem ajudar, não substituir labels.

Bons exemplos:

```txt
Ex: Ana & Lucas
Ex: 18 de outubro de 2026
Ex: Fazenda Boa Vista, Porto Feliz
```

Evitar placeholders vagos como:

```txt
Digite aqui
Insira uma informação
Campo obrigatório
```

## 13.6 Mensagens de erro

Evitar:

```txt
Erro 400
Campo inválido
Falha na requisição
```

Preferir:

```txt
Revise este campo antes de continuar.
Este e-mail parece incompleto.
Não conseguimos salvar agora. Tente novamente em instantes.
Informe uma data válida para o casamento.
```

---

# 14. Cards

## 14.1 Princípio

Cards devem parecer módulos editoriais, não blocos de SaaS genérico.

## 14.2 Estilo base

```css
.card {
  background: var(--color-surface-primary);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
}
```

## 14.3 Tipos de card

### Card editorial

Uso:

- recursos da landing;
- manifesto;
- benefícios;
- diferenciais.

Características:

- tipografia forte;
- texto curto;
- muito respiro;
- borda fina;
- detalhe discreto.

### Card funcional

Uso:

- painel;
- convidados;
- RSVP;
- presentes;
- status.

Características:

- informação clara;
- ações visíveis;
- pouco ornamento;
- hierarquia objetiva.

### Card de plano

Uso:

- pricing;
- upgrade;
- comparação de planos.

Características:

- preço claro;
- plano recomendado destacado com sutileza;
- lista enxuta;
- CTA elegante.

### Card de estado vazio

Uso:

- listas sem dados;
- convidados;
- presentes;
- confirmações.

Características:

- tom calmo;
- instrução clara;
- CTA simples;
- sem ilustração infantilizada.

---

# 15. Badges, etiquetas e rótulos

## 15.1 Uso

Badges devem ser usados para:

- status;
- plano;
- destaque discreto;
- datas;
- categorias;
- informação auxiliar.

## 15.2 Estilo

```css
.badge {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-soft);
  padding: 6px 10px;
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

## 15.3 Exemplos

```txt
Publicado
Rascunho
Plano Premium
Recomendado
Novo
Confirmado
Pendente
Presente recebido
```

Evitar badges chamativos demais.

---

# 16. Navegação

## 16.1 Landing

A navegação da landing deve ser leve.

Itens recomendados:

```txt
Como funciona
Recursos
Exemplos
Planos
Entrar
Criar meu site
```

O botão principal deve ficar claro, mas não agressivo.

## 16.2 Produto

A navegação interna deve ser organizada por intenção.

Itens recomendados:

```txt
Visão geral
Site
Convidados
Confirmações
Presentes
Pagamentos
Configurações
```

## 16.3 Mobile

No mobile:

- menu simples;
- poucos itens;
- CTA visível;
- evitar navegação complexa;
- priorizar ações principais.

---

# 17. Modais e drawers

## 17.1 Princípio

Usar modais com moderação.

A Devazi deve evitar interromper o usuário sem necessidade.

## 17.2 Quando usar modal

Usar para:

- confirmações importantes;
- ações destrutivas;
- upgrade;
- edição curta;
- preview rápido.

## 17.3 Quando evitar modal

Evitar para:

- fluxos longos;
- formulários complexos;
- onboarding completo;
- edição principal do site;
- listas grandes.

## 17.4 Estilo

```txt
Fundo com overlay escuro suave
Card claro quente
Radius generoso
Texto curto
Botões claros
Sem excesso de elementos
```

---

# 18. Tabelas e listas

## 18.1 Princípio

Tabelas devem ser simples, claras e respiráveis.

Evitar aparência administrativa pesada.

## 18.2 Uso

Tabelas podem aparecer em:

- convidados;
- RSVP;
- pagamentos;
- presentes;
- histórico de transações.

## 18.3 Regras

- linhas com altura confortável;
- divisórias finas;
- status com badges discretos;
- ações secundárias escondidas ou bem organizadas;
- no mobile, transformar em cards;
- evitar muitas colunas.

## 18.4 Mobile

No mobile, preferir cards de lista.

Exemplo de convidado:

```txt
Marina Costa
Confirmada · 2 pessoas
Editar
```

---

# 19. Estados vazios

## 19.1 Princípio

Estados vazios são momentos de orientação e acolhimento.

Nunca devem parecer erro ou abandono.

## 19.2 Exemplos

### Convidados

```txt
Sua lista de convidados ainda está vazia.

Adicione os primeiros nomes para começar a acompanhar confirmações com clareza.

[Adicionar convidados]
```

### Presentes

```txt
Nenhum presente foi recebido ainda.

Quando seus convidados contribuírem, tudo aparecerá aqui de forma organizada.

[Configurar presentes]
```

### RSVP

```txt
Ainda não há confirmações.

Compartilhe o site com seus convidados para começar a receber respostas.

[Copiar link do site]
```

### Site em rascunho

```txt
Seu site ainda não foi publicado.

Revise as informações principais e publique quando estiver pronto para compartilhar.

[Publicar site]
```

---

# 20. Feedback, alertas e toasts

## 20.1 Princípio

Feedbacks devem ser claros, elegantes e sem ansiedade.

## 20.2 Sucesso

```txt
Alterações salvas.
Site publicado com sucesso.
Convidado adicionado.
Presente configurado.
Link copiado.
```

## 20.3 Erro

```txt
Não conseguimos salvar agora. Tente novamente em instantes.
Revise os campos destacados antes de continuar.
Não foi possível carregar as informações.
```

## 20.4 Aviso

```txt
Seu site ainda está em rascunho.
Configure os presentes antes de compartilhar esta seção.
Alguns convidados ainda estão sem contato.
```

## 20.5 Estilo visual

- fundo discreto;
- texto curto;
- ícone simples, se necessário;
- tempo de exibição confortável;
- não usar cores vibrantes;
- não usar mensagens longas.

---

# 21. Motion e microinterações

## 21.1 Princípio

Movimento deve reforçar elegância, não chamar atenção.

## 21.2 Tokens

```css
--ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out-soft: cubic-bezier(0.65, 0, 0.35, 1);

--duration-fast: 120ms;
--duration-base: 220ms;
--duration-slow: 420ms;
--duration-editorial: 700ms;
```

## 21.3 Usar

- fades suaves;
- deslocamento leve;
- hover sutil;
- expansão calma;
- loading elegante;
- transições de página discretas.

## 21.4 Evitar

- bounce exagerado;
- animações rápidas demais;
- efeitos chamativos;
- parallax pesado;
- movimento simultâneo em excesso;
- confete;
- glitter;
- microinterações infantis.

---

# 22. Loading states

## 22.1 Princípio

Carregamento deve ser discreto e calmo.

## 22.2 Usar

- skeletons suaves;
- texto curto;
- spinner minimalista apenas quando necessário;
- transições de carregamento sem ansiedade.

## 22.3 Exemplos de texto

```txt
Carregando sua experiência...
Preparando seu painel...
Salvando alterações...
Publicando seu site...
```

Evitar:

```txt
Aguarde!!!
Processando...
Carregando dados do sistema...
```

---

# 23. Imagens, mockups e previews

## 23.1 Princípio

Imagens devem reforçar sofisticação.

## 23.2 Usar

- mockups mobile elegantes;
- fundos neutros;
- textura de papel;
- detalhes de casamento discretos;
- telas reais do produto;
- composições limpas;
- luz natural;
- papelaria sofisticada.

## 23.3 Evitar

- banco de imagem genérico;
- casais com poses muito clichês;
- excesso de flores;
- dourado artificial;
- mockups com sombras pesadas;
- telas distorcidas;
- estética Pinterest saturada.

---

# 24. Iconografia

## 24.1 Princípio

Ícones devem ser discretos e funcionais.

## 24.2 Estilo

- lineares;
- traço fino ou médio;
- cantos suaves;
- sem preenchimentos pesados;
- sem estilo cartoon;
- tamanho consistente.

## 24.3 Uso

Usar ícones para apoiar, não decorar.

Exemplos:

- calendário;
- convidados;
- presente;
- cartão;
- Pix;
- check;
- link;
- edição;
- publicação.

Evitar excesso de ícones por seção.

---

# 25. Landing page system

## 25.1 Estrutura ideal

Seções recomendadas:

```txt
Hero editorial
O que é a Devazi
Por que não parecer um template
Recursos principais
Experiência mobile
Gestão de convidados e RSVP
Presentes, Pix e cartão
Exemplos visuais
Planos
FAQ
CTA final
```

## 25.2 Hero

Headline recomendada:

```txt
A forma mais elegante de criar o site do seu casamento.
```

Subheadline:

```txt
Crie uma experiência digital sofisticada para sua celebração, com RSVP, convidados, presentes e pagamentos em uma plataforma simples, editorial e premium.
```

CTA primário:

```txt
Criar meu site
```

CTA secundário:

```txt
Ver como funciona
```

## 25.3 Seção de recursos

Não listar recursos de forma técnica demais.

Usar recurso + benefício.

Exemplo:

```txt
RSVP elegante
Receba confirmações de presença de forma clara, organizada e simples de acompanhar.
```

```txt
Presentes em um só lugar
Permita contribuições por Pix ou cartão com uma experiência discreta e segura.
```

```txt
Gestão de convidados
Organize nomes, confirmações e detalhes importantes sem planilhas confusas.
```

## 25.4 Pricing

A seção de planos deve parecer editorial e confiável.

Regras:

- preço claro;
- recursos essenciais;
- plano recomendado com destaque discreto;
- CTA direto;
- sem poluição;
- sem excesso de comparativos;
- sem urgência falsa.

---

# 26. Product dashboard system

## 26.1 Princípio

O painel deve ser funcional, mas não administrativo demais.

A sensação deve ser:

> Tudo está sob controle.

## 26.2 Página inicial do painel

Deve responder rapidamente:

- o site está publicado?
- quantos convidados existem?
- quantas confirmações chegaram?
- há presentes recebidos?
- qual próximo passo faz sentido?

## 26.3 Cards principais

Cards sugeridos:

```txt
Status do site
Convidados
Confirmações
Presentes
Próximo passo
```

## 26.4 Próximo passo

A plataforma deve orientar com suavidade.

Exemplos:

```txt
Adicione seus primeiros convidados.
Configure sua lista de presentes.
Revise a mensagem inicial do site.
Publique seu site para compartilhar com os convidados.
```

Evitar linguagem de cobrança agressiva.

---

# 27. RSVP system

## 27.1 Princípio

RSVP deve parecer simples para o convidado e organizado para o casal.

## 27.2 Para convidados

A experiência deve ser:

- rápida;
- mobile-first;
- clara;
- sem cadastro obrigatório;
- com linguagem gentil;
- visualmente alinhada ao casamento.

## 27.3 Para o casal

A experiência deve mostrar:

- confirmados;
- pendentes;
- recusados;
- acompanhantes;
- observações;
- restrições alimentares, se existir;
- exportação ou controle simples.

## 27.4 Textos

```txt
Confirmar presença
Não poderei comparecer
Confirmar convidados
Adicionar observação
```

Evitar:

```txt
Submeter resposta
Enviar formulário
Status do RSVP
```

---

# 28. Gifts and payments system

## 28.1 Princípio

Presentes e pagamentos devem parecer seguros, simples e elegantes.

Evitar aparência de checkout frio ou cobrança agressiva.

## 28.2 Textos recomendados

```txt
Receba presentes de forma simples e organizada.
Permita contribuições por Pix ou cartão.
Todos os presentes recebidos aparecem no seu painel.
```

## 28.3 Para convidados

A experiência deve ser:

- clara;
- segura;
- rápida;
- discreta;
- visualmente alinhada ao site do casamento.

## 28.4 Para o casal

O painel deve mostrar:

- presentes recebidos;
- valores;
- nomes;
- mensagens;
- status;
- forma de pagamento;
- data.

---

# 29. Checkout e upgrade

## 29.1 Princípio

Upgrade deve parecer continuação natural da experiência, não barreira agressiva.

## 29.2 Textos recomendados

```txt
Desbloqueie a experiência completa do seu casamento.
Publique seu site com todos os recursos premium.
Receba presentes, gerencie convidados e personalize sua experiência com mais liberdade.
```

## 29.3 Evitar

```txt
Faça upgrade agora!!!
Oferta imperdível
Última chance
Você precisa pagar para continuar
```

## 29.4 Checkout

O checkout deve transmitir:

- segurança;
- clareza;
- transparência;
- continuidade;
- ausência de surpresa.

---

# 30. Mobile-first rules

## 30.1 Princípio

A maioria dos convidados acessará pelo celular.

A versão mobile não é adaptação. É o centro da experiência.

## 30.2 Regras

- CTAs grandes e acessíveis;
- texto legível sem zoom;
- formulários simples;
- poucos campos por etapa;
- cards em uma coluna;
- navegação curta;
- imagens otimizadas;
- loading rápido;
- hierarquia clara;
- sem tabelas complexas;
- sem elementos muito pequenos.

## 30.3 Tamanho de toque

```css
--touch-target-min: 44px;
--touch-target-comfortable: 48px;
```

---

# 31. Acessibilidade

## 31.1 Princípio

Sofisticação também é clareza.

A Devazi deve ser bonita e acessível.

## 31.2 Regras

- contraste suficiente;
- foco visível;
- labels reais em formulários;
- textos legíveis;
- botões com tamanho adequado;
- navegação por teclado;
- mensagens de erro claras;
- evitar depender apenas de cor para status;
- imagens com alt text quando necessário.

## 31.3 Foco

Foco deve ser visível, mas elegante.

```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
```

---

# 32. Design tokens completos sugeridos

```css
:root {
  /* Colors */
  --color-bg-primary: #F7F1E8;
  --color-bg-secondary: #EFE5D8;
  --color-bg-tertiary: #E7D8C7;

  --color-surface-primary: #FFFDF8;
  --color-surface-secondary: #F4EBDD;
  --color-surface-muted: #E9DED0;

  --color-text-primary: #1E1B18;
  --color-text-secondary: #5E554C;
  --color-text-muted: #8A7D70;
  --color-text-inverse: #FFFDF8;

  --color-border-soft: #DED1C3;
  --color-border-medium: #C9B9A8;
  --color-border-strong: #9F8D7A;

  --color-accent: #A8895C;
  --color-accent-hover: #8F734C;
  --color-accent-soft: #D8C3A3;

  --color-success: #66745F;
  --color-warning: #A87945;
  --color-error: #8A4D45;

  /* Typography */
  --font-serif-primary: 'Cormorant Garamond', serif;
  --font-serif-secondary: 'Playfair Display', serif;
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'DM Mono', monospace;

  --font-size-display: clamp(3.75rem, 8vw, 7.5rem);
  --font-size-hero: clamp(3rem, 6vw, 5.75rem);
  --font-size-h1: clamp(2.5rem, 5vw, 4.5rem);
  --font-size-h2: clamp(2rem, 4vw, 3.25rem);
  --font-size-h3: clamp(1.5rem, 3vw, 2.25rem);
  --font-size-h4: 1.25rem;
  --font-size-body-lg: 1.125rem;
  --font-size-body: 1rem;
  --font-size-body-sm: 0.875rem;
  --font-size-caption: 0.75rem;
  --font-size-label: 0.6875rem;

  --line-height-display: 0.92;
  --line-height-heading: 1.04;
  --line-height-subheading: 1.18;
  --line-height-body: 1.6;
  --line-height-ui: 1.4;
  --line-height-caption: 1.3;

  --letter-spacing-tight: -0.04em;
  --letter-spacing-heading: -0.025em;
  --letter-spacing-body: -0.01em;
  --letter-spacing-label: 0.12em;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
  --space-40: 160px;

  /* Layout */
  --container-max: 1200px;
  --container-wide: 1440px;
  --container-reading: 760px;
  --grid-gap: 24px;

  /* Radius */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --radius-full: 999px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(30, 27, 24, 0.04);
  --shadow-sm: 0 4px 12px rgba(30, 27, 24, 0.06);
  --shadow-md: 0 12px 32px rgba(30, 27, 24, 0.08);
  --shadow-lg: 0 24px 60px rgba(30, 27, 24, 0.10);

  /* Motion */
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-soft: cubic-bezier(0.65, 0, 0.35, 1);

  --duration-fast: 120ms;
  --duration-base: 220ms;
  --duration-slow: 420ms;
  --duration-editorial: 700ms;

  /* Touch */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;
}
```

---

# 33. Tailwind guidance

Se o projeto usar Tailwind, mapear os tokens para:

```txt
colors
fontFamily
fontSize
spacing
borderRadius
boxShadow
maxWidth
transitionTimingFunction
transitionDuration
```

Classes visuais devem seguir a lógica da marca.

Evitar:

```txt
bg-white puro em excesso
text-black puro em excesso
shadow-xl genérico
rounded gigantes em tudo
gradientes chamativos
cores vibrantes
```

Priorizar:

```txt
bg-[warm tones]
text-[off black]
border fina
shadow sutil
rounded controlado
tracking para labels
font-serif em headlines
font-sans em UI
```

---

# 34. Prompt para Claude Code implementar UI System

Use este prompt quando for transformar este documento em código:

```txt
Você está trabalhando no projeto Devazi.

Antes de alterar qualquer arquivo, leia:

/docs/brand/DEVAZI_Brand_Architecture_v1.md
/docs/brand/DEVAZI_AI_CONTEXT.md
/docs/brand/DEVAZI_UI_SYSTEM_v1.md

Objetivo:
Transformar o UI System v1 da Devazi em tokens e padrões reutilizáveis no código do projeto.

Regras:
- Não quebrar funcionalidades existentes.
- Não alterar integração com Stripe.
- Não alterar autenticação, banco de dados ou lógica de pagamentos.
- Preservar responsividade.
- Priorizar mobile-first.
- Manter a estética premium, editorial, minimalista e sofisticada.
- Evitar aparência SaaS genérica, cara de Canva, excesso de ornamentos ou visual de template barato.
- Implementar em etapas pequenas e revisáveis.

Tarefas:
1. Identifique onde ficam os estilos globais, tema, Tailwind config ou tokens atuais.
2. Mapeie o que já existe e o que conflita com este UI System.
3. Proponha um plano de implementação antes de alterar arquivos.
4. Depois de aprovado, implemente os tokens de cor, tipografia, spacing, radius, shadows e motion.
5. Em seguida, aplique os padrões em botões, cards, inputs, badges, alerts e layout.
6. Preserve o comportamento atual do produto.
```

---

# 35. Checklist de revisão visual

Antes de aprovar qualquer tela, verificar:

```txt
A tela tem respiro suficiente?
A hierarquia tipográfica está clara?
A interface parece editorial?
O mobile está realmente bom?
Os botões estão discretos e claros?
As cores parecem quentes e premium?
Há excesso de sombras?
Há excesso de ícones?
Há excesso de informações?
A linguagem está alinhada à marca?
A tela parece SaaS genérico?
A tela parece Canva?
A tela parece template barato?
O casal entenderia o próximo passo?
A experiência parece simples?
```

---

# 36. Norte final

A Devazi deve ter uma interface que pareça desenhada com direção de arte, mas funcione com extrema clareza.

O objetivo não é impressionar por complexidade.

O objetivo é criar uma experiência onde cada detalhe pareça no lugar certo.

A UI da Devazi deve ser:

> Editorial na aparência.
> Simples no uso.
> Premium na percepção.
> Clara na função.
> Silenciosa na tecnologia.

Devazi — a forma mais elegante de criar o site do seu casamento.
