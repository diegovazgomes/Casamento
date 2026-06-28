# Devazi — Diretriz Interna de Analytics, LGPD e Privacidade dos Convidados

**Status:** diretriz interna de produto e desenvolvimento  
**Projeto:** Devazi — convites/sites digitais de casamento  
**Última atualização:** 2026-06-01  
**Uso recomendado:** manter este arquivo no repositório em `/docs/legal/analytics-privacidade-convidados.md`

> Este documento é uma diretriz interna para orientar decisões de produto, implementação técnica e revisão jurídica futura.  
> Não substitui análise individual de advogado, contador, DPO/encarregado ou especialista em proteção de dados.

---

## 1. Objetivo deste documento

A Devazi pode utilizar métricas internas para entender o funcionamento dos convites digitais, melhorar a experiência dos usuários, detectar falhas técnicas e acompanhar confirmações de presença.

Como os convites podem ser acessados por links únicos ou slugs associados a convidados, determinadas métricas podem se tornar **dados pessoais** ou **dados comportamentais**, especialmente quando for possível identificar direta ou indiretamente uma pessoa.

Este documento define:

- quais dados de analytics podem ser coletados;
- quais dados devem ser evitados;
- quais métricas podem aparecer para os noivos;
- quais métricas não devem ser exibidas aos noivos;
- como tratar links/slugs de convidados;
- como reduzir riscos de LGPD, reclamações e percepção de invasão de privacidade;
- como manter a experiência visual premium dos convites sem banners invasivos;
- quais cuidados tomar com cookies, pixels e ferramentas de terceiros.

---

## 2. Decisão de produto

A Devazi deve priorizar uma abordagem de **privacidade elegante**:

> Transparente, discreta, proporcional e sem prejudicar a experiência premium do convite.

Isso significa que a plataforma pode usar métricas básicas de acesso para funcionamento, segurança, estatísticas agregadas e melhoria do serviço, mas não deve transformar o convite em um painel de vigilância sobre o comportamento individual dos convidados.

A Devazi não deve vender, compartilhar, reaproveitar ou utilizar dados de convidados para marketing próprio, prospecção, remarketing, anúncios ou qualquer finalidade comercial alheia ao evento do casal.

---

## 3. Princípio central

A pergunta principal antes de coletar ou exibir qualquer dado deve ser:

> Este dado é realmente necessário para entregar o serviço, melhorar a experiência, proteger a plataforma ou apoiar uma métrica agregada útil?

Se a resposta for “não”, o dado não deve ser coletado.

Se a resposta for “sim, mas pode constranger o convidado se for exibido”, o dado não deve ser mostrado de forma individualizada para os noivos.

---

## 4. Conceitos importantes

### 4.1 Dados pessoais

São informações relacionadas a uma pessoa natural identificada ou identificável.

Na Devazi, podem ser dados pessoais:

- nome do convidado;
- telefone;
- e-mail;
- resposta de RSVP;
- acompanhante informado;
- restrição alimentar, se coletada;
- link único associado a um convidado;
- página acessada por um link individual;
- data e hora de acesso vinculadas a um convidado;
- tempo de permanência vinculado a um convidado;
- IP ou identificador técnico, quando associado a uma pessoa ou link individual.

### 4.2 Dados comportamentais

São informações que revelam como alguém navegou, interagiu ou se comportou dentro do convite.

Exemplos:

- páginas visualizadas;
- tempo de permanência;
- cliques em botões;
- clique em localização;
- clique em presentes ou Pix;
- número de acessos;
- horário de navegação;
- caminho percorrido dentro do convite.

### 4.3 Analytics agregado

Métricas consolidadas, sem exposição individual.

Exemplos:

- total de acessos ao convite;
- páginas mais acessadas;
- tempo médio de navegação;
- taxa de confirmação de presença;
- quantidade de acessos por dispositivo;
- quantidade de convidados que já responderam ao RSVP.

### 4.4 Rastreamento individual

Métricas ligadas a uma pessoa ou link identificado.

Exemplos:

- João acessou a página de presentes;
- Maria ficou 4 minutos na página da história;
- Carlos abriu o convite 8 vezes;
- Ana clicou no botão do Pix;
- Pedro visualizou a hospedagem, mas não confirmou presença.

A Devazi deve evitar expor esse tipo de informação aos noivos.

---

## 5. Dados que podem ser coletados

A Devazi pode coletar, de forma proporcional e documentada, dados como:

### 5.1 Métricas de acesso

- identificador do convite;
- identificador técnico da sessão;
- página acessada;
- data e horário aproximado do acesso;
- duração aproximada da navegação;
- origem interna da navegação;
- status básico da sessão.

### 5.2 Métricas técnicas

- tipo de dispositivo;
- navegador;
- sistema operacional;
- resolução aproximada da tela;
- erros de carregamento;
- falhas de formulário;
- eventos de performance;
- páginas com maior abandono.

### 5.3 Métricas de RSVP

- status de resposta;
- quantidade de confirmações;
- quantidade de recusas;
- quantidade de pendentes;
- quantidade de acompanhantes, quando aplicável;
- observações fornecidas voluntariamente pelo convidado.

### 5.4 Métricas agregadas para produto

- taxa média de abertura dos convites;
- seções mais visualizadas;
- tempo médio por página;
- conversão de acesso em RSVP;
- principais dispositivos usados;
- falhas técnicas recorrentes;
- desempenho de modelos/templates.

---

## 6. Dados que devem ser evitados

A Devazi deve evitar coletar ou armazenar:

- localização precisa do convidado;
- fingerprint avançado do dispositivo;
- IP completo por prazo longo sem necessidade;
- gravação de sessão;
- mapas de calor individualizados;
- histórico individual detalhado de navegação;
- rastreamento entre sites;
- dados de navegação fora do convite;
- informações sensíveis sem necessidade;
- dados excessivos de crianças e adolescentes;
- cliques sensíveis associados ao nome do convidado;
- ranking individual de engajamento;
- dados para remarketing de convidados.

---

## 7. Dados que não devem ser usados para marketing da Devazi

A Devazi não deve usar dados de convidados para:

- prospecção comercial;
- campanhas de e-mail;
- campanhas de WhatsApp;
- anúncios personalizados;
- remarketing;
- públicos semelhantes;
- venda ou cessão de base;
- contato comercial futuro;
- oferta de serviços da Devazi;
- oferta de serviços de parceiros;
- enriquecimento de base de leads.

Exemplo proibido:

> Convidado acessou o casamento de um cliente e depois recebeu anúncio ou mensagem comercial da Devazi.

Exemplo permitido:

> Convidado recebe mensagem operacional relacionada ao próprio evento, se essa funcionalidade tiver sido contratada e estiver clara para ele.

---

## 8. Links, slugs e tokens

### 8.1 Evitar slugs com nome

Não usar URLs com nome do convidado.

Evitar:

```text
/devazi/siannah-diego/convidado/joao-silva
/devazi/siannah-diego/rsvp/maria-souza
```

Preferir:

```text
/devazi/siannah-diego/i/8f7a2kq91
/devazi/siannah-diego/rsvp/tk_4Kp91Xa
```

### 8.2 Usar tokens aleatórios

Os links individuais devem usar tokens:

- aleatórios;
- não sequenciais;
- não previsíveis;
- difíceis de adivinhar;
- sem nome, telefone ou identificador visível.

### 8.3 Não confiar totalmente no link individual

Um link pode ser encaminhado para outra pessoa.

Portanto, a Devazi deve evitar afirmar com certeza que uma navegação foi feita por determinado convidado.

Preferir linguagem interna como:

- “link acessado”;
- “convite acessado por este link”;
- “possível acesso do convidado associado ao link”.

Evitar:

- “João visualizou”;
- “Maria clicou”;
- “Carlos não quis confirmar”.

---

## 9. O que pode aparecer no painel dos noivos

O painel dos noivos deve priorizar métricas agregadas e úteis.

Pode exibir:

- total de acessos ao convite;
- total de visitantes ou sessões;
- páginas mais visualizadas;
- tempo médio de navegação;
- taxa de RSVP;
- quantidade de convidados confirmados;
- quantidade de convidados pendentes;
- quantidade de convidados que recusaram;
- dispositivos mais usados;
- horários de maior acesso em formato agregado;
- evolução de confirmações ao longo do tempo;
- erros técnicos relevantes, se houver.

Também pode exibir dados operacionais do RSVP:

- nome do convidado;
- status da confirmação;
- quantidade de acompanhantes;
- observação enviada pelo próprio convidado;
- restrição alimentar, se coletada e necessária para organização.

---

## 10. O que não deve aparecer no painel dos noivos

Evitar exibir:

- quais páginas cada convidado viu;
- quanto tempo cada convidado ficou em cada página;
- quem clicou em presentes;
- quem clicou no Pix;
- quem abriu várias vezes;
- ranking dos convidados mais engajados;
- horários exatos de navegação por convidado;
- histórico completo individual;
- mapas de comportamento por pessoa;
- alertas do tipo “fulano viu mas não confirmou”.

Essas informações podem gerar constrangimento, cobrança social, reclamações e percepção de invasão de privacidade.

---

## 11. Tratamento específico da página de presentes/Pix

A página de presentes ou Pix exige cuidado extra, porque pode envolver comportamento sensível.

A Devazi deve evitar vincular ao nome do convidado:

- clique em botão de Pix;
- clique em copiar chave Pix;
- visualização da seção de presentes;
- tempo de permanência na página de presentes;
- intenção presumida de presentear.

Pode medir de forma agregada:

- total de acessos à página de presentes;
- total de cliques no botão de copiar Pix;
- total de cliques em lista externa;
- taxa agregada de acesso à página de presentes.

Não exibir aos noivos:

- “quem clicou no Pix”;
- “quem viu a lista de presentes”;
- “quem acessou presentes mas não confirmou”.

---

## 12. Cookies, localStorage e analytics interno

### 12.1 Preferência da Devazi

Para os convites digitais, a preferência deve ser:

> Analytics interno server-side, com o mínimo possível de cookies, sem pixel de marketing e sem rastreamento de terceiros.

Isso preserva a experiência elegante do convite e reduz a necessidade de banners invasivos.

### 12.2 Quando pode não haver banner invasivo

Se o convite usar apenas métricas essenciais, analytics interno proporcional e nenhum cookie/pixel de marketing, a Devazi pode optar por um aviso discreto de privacidade no rodapé, em vez de um banner grande.

Exemplo:

> Usamos métricas básicas de acesso para manter o convite funcionando com segurança e melhorar a experiência. Não usamos dados dos convidados para marketing.

### 12.3 Quando o cuidado deve aumentar

O cuidado aumenta se forem usados:

- Meta Pixel;
- Google Ads;
- Google Analytics;
- TikTok Pixel;
- Hotjar;
- Microsoft Clarity;
- ferramentas de gravação de sessão;
- cookies persistentes;
- localStorage para identificação;
- remarketing;
- públicos personalizados.

Nesses casos, a Devazi deve avaliar política de cookies, consentimento, banner, opt-out e transparência mais robusta.

---

## 13. Texto sugerido para aviso discreto no convite

### Versão curta

> Usamos métricas básicas de acesso para funcionamento, segurança e melhoria da experiência. Os dados dos convidados não são usados para marketing da Devazi.

### Versão com link

> Este convite utiliza métricas básicas de acesso para funcionamento, segurança e melhoria da experiência. Os dados dos convidados não são usados para marketing da Devazi. [Privacidade]

### Texto para modal ou página de privacidade

> Podemos registrar páginas acessadas, data e horário de acesso, duração aproximada da navegação, tipo de dispositivo e identificador do convite ou link. Essas informações são usadas para funcionamento, segurança, estatísticas agregadas e melhoria do serviço. A Devazi não utiliza dados dos convidados para marketing próprio, prospecção, remarketing ou venda a terceiros.

---

## 14. Política de Privacidade — pontos que devem constar

A Política de Privacidade pública da Devazi deve mencionar:

- dados coletados dos noivos;
- dados coletados dos convidados;
- dados de RSVP;
- dados de navegação;
- dados técnicos;
- finalidade de cada tratamento;
- bases legais;
- compartilhamento com fornecedores;
- uso de provedores como hospedagem, banco de dados, pagamento, e-mail e analytics;
- eventual transferência internacional;
- prazo de retenção;
- direitos dos titulares;
- canal de contato;
- regra de não uso dos dados dos convidados para marketing;
- regra de cookies e tecnologias similares;
- procedimento de exclusão.

---

## 15. Bases legais prováveis

A análise final deve ser jurídica, mas, como diretriz interna, as bases prováveis são:

### 15.1 Execução de contrato

Para dados necessários à criação, publicação e manutenção do convite/site contratado pelo casal.

Exemplos:

- nomes dos noivos;
- data do casamento;
- local do evento;
- conteúdo do convite;
- plano contratado;
- status de pagamento.

### 15.2 Legítimo interesse

Para segurança, prevenção de fraude, melhoria da plataforma, métricas proporcionais e analytics interno.

Exemplos:

- logs técnicos;
- erros de carregamento;
- métricas agregadas;
- prevenção de abuso;
- performance do convite.

O legítimo interesse exige cuidado com necessidade, proporcionalidade, transparência e não violação das expectativas do titular.

### 15.3 Consentimento

Pode ser necessário quando houver:

- marketing para convidados;
- cookies de marketing;
- pixels de terceiros;
- uso de imagem em portfólio;
- dados sensíveis;
- uso de depoimentos;
- comunicações promocionais fora do contexto do evento.

### 15.4 Obrigação legal ou regulatória

Para dados exigidos por lei, fiscalização, contabilidade, tributação, antifraude e registros necessários.

---

## 16. Retenção de dados

A Devazi deve aplicar retenção curta e proporcional.

Sugestão inicial:

### 16.1 Dados individualizados de analytics

- manter até 90 ou 180 dias após o casamento;
- depois anonimizar ou excluir.

### 16.2 Dados de RSVP

- manter até 180 dias após o casamento;
- permitir exclusão mediante solicitação;
- manter apenas o necessário para defesa ou obrigação legal, se aplicável.

### 16.3 Dados do cliente/casal

- manter enquanto houver conta, contrato ou serviço ativo;
- após encerramento, manter apenas dados necessários para obrigações legais, defesa de direitos ou histórico mínimo de contratação.

### 16.4 Métricas agregadas

- podem ser mantidas por mais tempo, desde que não permitam identificar convidados individualmente.

---

## 17. Segurança e acesso interno

A Devazi deve implementar medidas como:

- autenticação forte no painel administrativo;
- MFA em contas críticas;
- controle de acesso por perfil;
- isolamento entre clientes;
- logs de ações administrativas;
- restrição de acesso aos dados de convidados;
- proteção de variáveis de ambiente;
- não exposição de chaves secretas no frontend;
- revisão de permissões no banco;
- backup seguro;
- exclusão segura quando aplicável;
- política de menor privilégio;
- auditoria periódica de buckets públicos, banco e endpoints.

---

## 18. Regras para fornecedores e terceiros

Antes de integrar ferramentas externas, verificar se elas tratam dados dos convidados.

Ferramentas que podem envolver dados pessoais:

- hospedagem;
- banco de dados;
- e-mail transacional;
- gateways de pagamento;
- analytics;
- pixels de anúncio;
- ferramentas de atendimento;
- ferramentas de CRM;
- automações;
- provedores de imagem/CDN.

Checklist:

- o fornecedor é necessário?
- quais dados recebe?
- recebe dados de convidados?
- recebe IP, cookies ou identificadores?
- há transferência internacional?
- existe política de privacidade pública?
- existe contrato, DPA ou termos de tratamento de dados?
- o fornecedor usa os dados para fins próprios?
- há opção de anonimização?
- há opção de desligar cookies/pixels?

---

## 19. Crianças e adolescentes

Quando houver crianças na lista de convidados, pajens, daminhas ou familiares menores de idade, a Devazi deve reduzir a coleta ao mínimo.

Recomendações:

- evitar coletar dados individualizados de crianças quando não for necessário;
- permitir informar apenas quantidade de crianças, quando bastar;
- evitar exposição pública de nome completo de menor;
- evitar foto de menor sem autorização adequada dos responsáveis;
- incluir nos Termos que o casal é responsável por possuir autorização para conteúdos envolvendo menores;
- tratar qualquer solicitação de remoção com prioridade.

---

## 20. Conteúdo enviado pelo casal

O casal deve ser responsável por garantir que possui direitos e autorizações sobre:

- fotos;
- vídeos;
- textos;
- músicas;
- nomes;
- imagens de familiares;
- imagens de convidados;
- imagens de crianças;
- brasões;
- logotipos;
- materiais de fornecedores;
- informações sobre locais, hospedagem e programação.

A Devazi deve poder remover ou suspender conteúdo que viole direitos de terceiros, contenha conteúdo ilegal, ofensivo, discriminatório ou gere risco jurídico.

---

## 21. Uso de dados para portfólio

A Devazi não deve usar automaticamente convites reais, fotos, nomes dos noivos, depoimentos ou histórias em portfólio, Instagram, landing page ou anúncios.

Recomendação:

- pedir autorização separada;
- registrar data e escopo da autorização;
- permitir revogação para usos futuros;
- permitir anonimizar ou ocultar sobrenomes;
- não usar imagens de convidados sem cuidado adicional;
- não usar fotos de crianças sem autorização adequada.

Texto sugerido:

> Autorizo a Devazi a utilizar imagens do meu convite/site, nomes, fotos e depoimentos para fins de portfólio, redes sociais e divulgação comercial, conforme autorizado por mim.

---

## 22. Regras de implementação para o time técnico

### 22.1 Eventos permitidos

Eventos recomendados:

```text
invite_viewed
page_viewed
rsvp_started
rsvp_submitted
map_clicked
music_played
gift_page_viewed_aggregated
pix_copy_clicked_aggregated
technical_error
```

### 22.2 Eventos que exigem cuidado

Eventos que não devem ser expostos individualmente:

```text
guest_viewed_gift_page
guest_clicked_pix
guest_spent_time_on_story
guest_opened_many_times
guest_abandoned_rsvp
```

Se coletados tecnicamente, devem ser restritos, com retenção curta e uso apenas operacional/agregado.

### 22.3 Campos recomendados

```text
event_id
event_type
wedding_id
page_id
session_id
guest_token_hash
timestamp
duration_seconds_approx
device_type
browser_family
os_family
referrer_internal
```

### 22.4 Campos a evitar

```text
guest_name_in_event
guest_phone_in_event
full_ip_long_term
precise_location
device_fingerprint
raw_user_agent_long_term
sensitive_notes
```

### 22.5 Hash de token

Quando possível, armazenar hash do token do convidado em eventos de analytics, em vez do token puro.

---

## 23. Checklist antes de publicar em produção

Antes de ativar analytics para clientes reais:

- [ ] URLs usam tokens aleatórios e não nomes dos convidados.
- [ ] O painel dos noivos mostra métricas agregadas.
- [ ] O painel dos noivos não mostra comportamento individual detalhado.
- [ ] Página de presentes/Pix não expõe cliques por convidado.
- [ ] Dados dos convidados não são usados para marketing.
- [ ] Política de Privacidade menciona dados de navegação.
- [ ] Existe aviso discreto de privacidade no convite ou RSVP.
- [ ] Existe canal para pedidos de exclusão/privacidade.
- [ ] Retenção de analytics individualizado está definida.
- [ ] Existe rotina de anonimização ou exclusão.
- [ ] Cookies/pixels de terceiros foram avaliados.
- [ ] Meta Pixel/Google Ads não rodam em páginas de convidados sem revisão.
- [ ] Permissões do banco foram revisadas.
- [ ] Buckets públicos foram revisados.
- [ ] Variáveis de ambiente não estão expostas.
- [ ] Contas críticas têm MFA.
- [ ] Logs técnicos não exibem dados pessoais desnecessários.
- [ ] Existe processo mínimo para incidente de segurança.
- [ ] Existe autorização separada para uso de portfólio.

---

## 24. Checklist visual/experiência premium

A experiência do convite deve continuar elegante.

Evitar:

- banner grande de cookies no topo;
- pop-up bloqueando o convite;
- linguagem jurídica pesada na primeira tela;
- aviso assustador;
- excesso de checkboxes para o convidado.

Preferir:

- aviso curto no rodapé;
- link discreto “Privacidade”;
- modal simples;
- texto humano;
- política completa em página separada;
- nenhum pixel de marketing nas páginas dos convidados, salvo decisão jurídica/produto específica.

---

## 25. Exemplo de posicionamento comercial

Em vez de vender como:

> Veja tudo que cada convidado fez no convite.

Usar:

> Acompanhe confirmações e métricas agregadas do seu convite sem expor a privacidade dos convidados.

Ou:

> Métricas inteligentes para acompanhar o desempenho do convite, com privacidade e elegância.

---

## 26. Riscos que este documento busca reduzir

- multa ou questionamento por tratamento excessivo de dados;
- reclamação de convidado;
- reclamação de casal;
- percepção de vigilância;
- exposição indevida de dados;
- vazamento de lista de convidados;
- uso indevido de dados para marketing;
- chargeback por falta de transparência;
- problema com direito de imagem;
- problema com crianças e adolescentes;
- uso inadequado de cookies/pixels;
- fragilidade em eventual auditoria ou questionamento.

---

## 27. Pontos que precisam de revisão jurídica futura

Antes de escalar vendas, tráfego pago ou clientes reais em volume, revisar com advogado:

- Política de Privacidade final;
- Termos de Uso;
- Política de Cookies;
- Política de Reembolso;
- base legal de analytics;
- base legal de cookies;
- regras para dados de convidados;
- uso de dados de menores;
- transferência internacional;
- contratos com fornecedores;
- autorização de portfólio;
- textos do checkout;
- fluxo de consentimento, se houver marketing.

---

## 28. Referências oficiais úteis

- Lei Geral de Proteção de Dados Pessoais — Lei nº 13.709/2018:  
  https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm

- ANPD — Guia Orientativo: Cookies e Proteção de Dados Pessoais:  
  https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf

- ANPD — Guia Orientativo sobre Segurança da Informação para Agentes de Tratamento de Pequeno Porte:  
  https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte

- ANPD — Guia Orientativo sobre Hipóteses Legais de Tratamento de Dados Pessoais: Legítimo Interesse:  
  https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse

---

## 29. Resumo executivo

A Devazi pode manter analytics interno, mas deve evitar transformar o convite em rastreamento individual visível para os noivos.

A regra prática é:

> Coletar o mínimo necessário.  
> Exibir métricas agregadas.  
> Proteger dados dos convidados.  
> Não usar convidados para marketing.  
> Evitar cookies e pixels de terceiros nos convites.  
> Manter transparência discreta e elegante.  
> Anonimizar ou excluir dados individualizados após o evento.

Esta abordagem protege a marca, reduz riscos jurídicos e preserva a experiência premium do convite.
