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
        }
    },

    // Espacamentos reutilizados em secoes e blocos principais.
    spacing: {
        // Espaco superior padrao antes do conteudo das secoes internas.
        sectionTop: '40px',
        // Padding lateral principal da interface mobile.
        inline: '20px',
        // Espaco inferior do footer para respiro visual no fim da pagina.
        footerBottom: '48px',
        // Distancia entre os blocos do countdown.
        countdownGap: '12px'
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