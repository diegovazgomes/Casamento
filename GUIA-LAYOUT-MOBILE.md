# Guia Rapido: Criar Layouts no Celular com Claude Code

## Objetivo
Usar Claude Code no celular para gerar um layout novo de demonstracao, somente visual, sem JavaScript de funcionalidade.

## Arquivos que voce deve enviar para o Claude
Envie somente estes arquivos como contexto:

- index.html
- assets/css/style.css
- assets/css/animations.css
- assets/config/defaults/theme.json
- assets/layouts/modern/layout.css (opcional, apenas como referencia de estilo atual)
- assets/layouts/modern/themes/black-silver.json (opcional, apenas como referencia de tokens)

Se quiser reduzir ao minimo absoluto, envie apenas:

- index.html
- assets/css/style.css
- assets/config/defaults/theme.json

## O que pedir para ele gerar
Peca para retornar apenas:

- Um HTML basico de demonstracao (sem JS)
- Um CSS de layout (somente estrutura visual)
- Uso de variaveis CSS (sem cores hardcoded)
- Responsivo para mobile e desktop

## Prompt pronto para copiar no celular
Copie e cole exatamente este texto no Claude Code:

"Quero um layout novo apenas de demonstracao visual para meu convite. Nao implemente funcionalidades JS. Use somente HTML + CSS. Respeite o sistema de tokens por variaveis CSS (cores vindas de variaveis, sem hardcode). Entregue:
1) um arquivo HTML basico com secoes principais (hero, detalhes, extras, RSVP visual),
2) um CSS separado focado em layout e identidade visual,
3) breakpoints para mobile e desktop,
4) acessibilidade basica (hierarquia de headings, labels e contraste).
Nao altere logica de scripts existentes."

## Regras para evitar retrabalho
- Nao pedir integracao com script.js
- Nao pedir formularios funcionais
- Nao pedir fetch de JSON
- Nao pedir audio
- Nao pedir countdown funcional
- Manter somente estrutura e visual

## Formato de saida recomendado
Peça a resposta neste formato:

1. index-demo.html
2. demo-layout.css
3. lista curta de tokens usados

## Checklist rapido antes de aprovar
- O layout ficou realmente diferente do classic
- Nao ha cores hardcoded no CSS
- Funciona em largura de celular e desktop
- HTML sem dependencia de JavaScript
- Classes e estrutura faceis de reaproveitar

## Dica pratica
Se o resultado vier muito generico, adicione uma direcao visual no prompt, por exemplo:

- "editorial minimalista"
- "futurista cinematografico"
- "romantico contemporaneo"
- "luxo clean"

## Proximo passo quando voltar ao notebook
Depois de escolher a proposta no celular:

1. Criar pasta de layout novo em assets/layouts/<nome-do-layout>/
2. Mover CSS final para assets/layouts/<nome-do-layout>/layout.css
3. Criar tema em assets/layouts/<nome-do-layout>/themes/<nome-do-tema>.json
4. Ajustar activeLayout e activeTheme no assets/config/site.json
5. Validar visual e rodar npm test
