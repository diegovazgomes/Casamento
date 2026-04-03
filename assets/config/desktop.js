// Configuracao aplicada quando o projeto esta em viewport desktop.
// Ela segue a mesma estrutura do mobile, mas com valores pensados para telas maiores.
export const CONFIG = {
    // Cores principais usadas pelo tema da versao desktop.
    colors: {
        // Cor primaria do projeto, usada em destaques e elementos dourados.
        primary: '#c9a84c',
        // Cor secundaria de apoio, usada para contrastes mais suaves.
        secondary: '#e8d08a',
        // Cor de fundo principal da pagina.
        background: '#1a1714'
    },

    // Controle dos tempos de entrada e atraso das animacoes principais.
    animation: {
        // Duracao do fade do hero e de outras transicoes ligadas ao config.
        fade: '1.35s',
        // Delay, em milissegundos, antes da revelacao do conteudo principal do hero.
        delay: 320
    },

    // Escala tipografica usada na versao desktop.
    fontSizes: {
        // Tamanho base de fonte da interface.
        base: '13px',
        // Tamanho do texto auxiliar acima dos nomes no hero.
        heroLabel: '10px',
        // Tamanho da data apresentada no hero.
        heroDate: '11px',
        // Escala responsiva dos nomes do casal em telas maiores.
        heroNames: {
            // Tamanho minimo dos nomes no hero.
            min: '54px',
            // Componente fluido baseada em viewport para crescimento responsivo.
            fluid: '12vw',
            // Tamanho maximo para evitar exagero em telas muito largas.
            max: '110px'
        }
    },

    // Sistema de espacamento principal para desktop.
    spacing: {
        // Padding superior padrao antes das secoes internas.
        sectionTop: '88px',
        // Padding lateral principal em desktop.
        inline: '24px',
        // Espacamento inferior do footer.
        footerBottom: '48px',
        // Distancia entre os cards do countdown.
        countdownGap: '12px'
    },

    // Regras estruturais do layout em desktop.
    layout: {
        // Altura do hero ocupando toda a altura visivel da janela.
        heroHeight: '100vh',
        // Padding completo aplicado ao hero.
        heroPadding: '0 24px 64px',
        // Largura maxima do conteudo textual central do hero.
        heroContentWidth: '720px',
        // Espaco inferior entre o bloco textual e a base do hero.
        heroContentPaddingBottom: '36px',
        // Distancia inicial do texto antes do fade/slide do hero.
        heroFadeOffset: '44px',
        // Largura maxima do conteudo interno das secoes em desktop.
        contentMaxWidth: '760px'
    },

    // Parametros funcionais da contagem regressiva.
    countdown: {
        // Mantem a exibicao com dois digitos para consistencia visual.
        format: 'two-digits',
        // Intervalo de atualizacao do countdown em milissegundos.
        updateInterval: 1000
    }
};