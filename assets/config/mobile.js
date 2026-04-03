// Configuracao aplicada quando o projeto esta em viewport mobile.
// O objetivo deste arquivo e centralizar os ajustes visuais e de comportamento
// para telas menores, evitando valores soltos espalhados em CSS e JS.
export const CONFIG = {
    // Cores principais usadas para alimentar CSS variables dinamicas.
    colors: {
        // Cor de destaque principal. Hoje controla o dourado base do projeto.
        primary: '#c9a84c',
        // Cor secundaria de apoio. Hoje controla dourado claro e acentos suaves.
        secondary: '#e8d08a',
        // Cor base do fundo principal da pagina.
        background: '#1a1714'
    },

    // Tempos ligados a entrada de elementos e microinteracoes principais.
    animation: {
        // Duracao do fade principal usado no hero e em efeitos visuais relacionados.
        fade: '2.15s',
        // Atraso, em milissegundos, antes da revelacao do texto principal do hero.
        delay: 1260
    },

    // Tamanhos base de fonte para a versao mobile.
    fontSizes: {
        // Tamanho de fonte padrao usado como referencia geral do layout.
        base: '12px',
        // Tamanho do texto pequeno acima dos nomes no hero.
        heroLabel: '10px',
        // Tamanho da data exibida no hero.
        heroDate: '14px',
        // Escala responsiva dos nomes do casal no hero.
        heroNames: {
            // Tamanho minimo garantido em telas pequenas.
            min: '24px',
            // Fator responsivo baseado na largura da viewport.
            fluid: '10vw',
            // Limite maximo para os nomes nao crescerem demais.
            max: '46px'
        },
        // Tipografia semantica para os demais blocos da pagina.
        semantic: {
            // Texto do hint de rolagem exibido no hero.
            scrollHint: '9px',
            // Label pequena acima dos titulos de secao.
            sectionTag: '9px',
            // Escala responsiva dos titulos principais de secao.
            sectionTitle: {
                min: '34px',
                fluid: '7vw',
                max: '56px'
            },
            // Texto-base descritivo das secoes.
            sectionBody: '13px',
            // Numero principal de cada card do countdown.
            countdownNumber: '42px',
            // Label auxiliar de cada unidade do countdown.
            countdownLabel: '8px',
            // Tamanho do icone de cada card de detalhes.
            detailIcon: '18px',
            // Label superior de cada detalhe.
            detailTitle: '8px',
            // Valor principal de cada detalhe.
            detailValue: '20px',
            // Texto secundario do detalhe.
            detailSub: '10px',
            // Titulo principal do card de RSVP.
            rsvpTitle: '38px',
            // Subtitulo do card de RSVP.
            rsvpSubtitle: '11px',
            // Tamanho de texto dos inputs do formulario.
            rsvpInput: '12px',
            // Tamanho do texto dos botoes de presenca.
            rsvpChoice: '10px',
            // Tamanho do texto do botao de envio.
            rsvpSubmit: '10px',
            // Tamanho do titulo de sucesso apos envio.
            rsvpSuccessText: '26px',
            // Tamanho do subtitulo de sucesso.
            rsvpSuccessSub: '11px',
            // Nome do casal no footer.
            footerNames: '30px',
            // Nota final no footer.
            footerNote: '10px',
            // Mensagem final quando o countdown expirar.
            countdownFinished: '30px'
        }
    },

    // Dimensoes de componentes que nao sao exatamente espacamento nem tipografia.
    componentSizes: {
        // Largura visual maxima do divisor entre secoes.
        dividerWidth: '320px',
        // Tamanho do diamante central do divisor.
        dividerDiamond: '6px',
        // Largura total da seta do hint de rolagem.
        scrollArrowWidth: '14px',
        // Altura total da seta do hint de rolagem.
        scrollArrowHeight: '48px',
        // Altura da haste da seta do hint.
        scrollArrowStemHeight: '36px',
        // Tamanho da ponta da seta do hint.
        scrollArrowHeadSize: '8px',
        // Padding superior de cada card do countdown.
        countdownCardPaddingTop: '22px',
        // Padding lateral de cada card do countdown.
        countdownCardPaddingInline: '8px',
        // Padding inferior de cada card do countdown.
        countdownCardPaddingBottom: '16px',
        // Padding vertical do campo de input do RSVP.
        rsvpInputPaddingBlock: '14px',
        // Padding horizontal do campo de input do RSVP.
        rsvpInputPaddingInline: '18px',
        // Altura minima dos botoes de presenca.
        rsvpChoiceMinHeight: '48px',
        // Padding interno dos botoes de presenca.
        rsvpChoicePadding: '12px',
        // Padding vertical do botao principal de envio.
        rsvpSubmitPaddingBlock: '16px',
        // Padding horizontal do botao principal de envio.
        rsvpSubmitPaddingInline: '32px',
        // Tamanho do icone de sucesso no RSVP.
        rsvpSuccessIcon: '32px'
    },

    // Sistema de espacamento dividido em camadas.
    // 1) scale: valores-base reutilizaveis.
    // 2) semantic: espacamentos com significado de layout/componente.
    spacing: {
        // Escala enxuta para manter referencias consistentes no projeto.
        scale: {
            // Microespacos para detalhes pequenos, como gaps finos e offsets curtos.
            xs: '8px',
            // Espacos curtos usados em labels compactas e pequenos agrupamentos.
            sm: '12px',
            // Espaco medio curto para separacoes frequentes.
            md: '16px',
            // Espaco medio para respiro entre textos relacionados.
            lg: '22px',
            // Espaco mais aberto para separar blocos de uma mesma secao.
            xl: '30px',
            // Espaco estrutural entre grupos principais.
            xxl: '40px',
            // Respiro forte usado em cards e fechamento de blocos.
            xxxl: '48px',
            // Distancia maior para divisores e transicoes entre secoes.
            xxxxl: '56px',
            // Espaco de secao completa, usado quando o layout pede bastante respiro.
            section: '88px'
        },

        // Tokens semanticos: cada valor governa uma responsabilidade especifica.
        semantic: {
            // Padding superior padrao das secoes principais.
            sectionPaddingTop: '40px',
            // Padding lateral padrao do conteudo interno.
            sectionPaddingInline: '20px',
            // Override dedicado para a secao de detalhes, caso precise subir ou descer so ela.
            detailsSectionPaddingTop: '40px',
            // Distancia entre a label da secao e o titulo principal.
            sectionTagGap: '30px',
            // Distancia entre o titulo da secao e o texto de apoio.
            sectionTitleGap: '22px',
            // Distancia entre o texto auxiliar do hero e os nomes do casal.
            heroLabelGap: '16px',
            // Distancia entre os nomes do casal e a data no hero.
            heroDateGap: '22px',
            // Distancia do hint de rolagem ate a base do hero.
            scrollHintBottom: '20px',
            // Gap interno entre o texto do hint e a seta.
            scrollHintGap: '8px',
            // Margem superior do divisor entre blocos principais.
            dividerMarginTop: '56px',
            // Distancia entre o texto introdutorio e a grade da contagem.
            countdownMarginTop: '40px',
            // Gap entre os cards do countdown.
            countdownGap: '12px',
            // Distancia entre o texto da secao de detalhes e a grade de cards.
            detailsMarginTop: '40px',
            // Espaco entre colunas/linhas da grade de detalhes.
            detailsGridGap: '1px',
            // Padding vertical de cada card de detalhes.
            detailCardPaddingBlock: '28px',
            // Padding horizontal de cada card de detalhes.
            detailCardPaddingInline: '20px',
            // Respiro inferior do bloco RSVP antes do footer.
            rsvpShellPaddingBottom: '88px',
            // Distancia entre o texto de abertura do RSVP e o card do formulario.
            rsvpCardMarginTop: '40px',
            // Padding vertical interno do card RSVP.
            rsvpCardPaddingBlock: '48px',
            // Padding horizontal interno do card RSVP.
            rsvpCardPaddingInline: '32px',
            // Distancia entre o subtitulo do RSVP e o formulario.
            rsvpSubtitleGap: '32px',
            // Gap vertical entre campos do formulario.
            rsvpFormGap: '14px',
            // Gap entre os botoes de escolha de presenca.
            rsvpChoiceGap: '10px',
            // Margem superior do botao de envio.
            rsvpSubmitMarginTop: '8px',
            // Espaco inferior do footer para respiro visual.
            footerPaddingBottom: '48px'
        }
    },

    // Valores estruturais de layout para a versao mobile.
    layout: {
        // Altura minima do hero em mobile.
        heroHeight: '680px',
        // Padding completo do hero: topo/direita/baixo/esquerda.
        heroPadding: '0 20px 72px',
        // Largura maxima do bloco textual central do hero.
        heroContentWidth: '340px',
        // Espaco inferior entre o conteudo do hero e o final da area visivel.
        heroContentPaddingBottom: '32px',
        // Deslocamento inicial do texto antes do fade/slide de entrada.
        heroFadeOffset: '20px',
        // Largura maxima do conteudo textual das secoes internas.
        contentMaxWidth: '620px'
    },

    // Regras funcionais do countdown.
    countdown: {
        // Define como os numeros devem ser formatados.
        // "two-digits" significa sempre mostrar 2 digitos, ex: 04, 09, 12.
        format: 'two-digits',
        // Intervalo, em milissegundos, entre uma atualizacao e outra do contador.
        updateInterval: 1000
    }
};