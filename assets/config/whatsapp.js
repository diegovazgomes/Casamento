export const WHATSAPP_CONFIG = {
    destinationPhone: '5511914772174',
    recipientName: 'Siannah',
    redirectDelayMs: 5000,
    messages: {
        attending: [
            'Olá, {recipientName}!',
            '',
            'Aqui é {name}.',
            'Meu WhatsApp para contato é {phone}.',
            'Estou passando para confirmar minha presença no casamento.',
            '',
            'Nos vemos em breve.'
        ].join('\n'),
        notAttending: [
            'Olá, {recipientName}!',
            '',
            'Aqui é {name}.',
            'Meu WhatsApp para contato é {phone}.',
            'Infelizmente, não poderei estar presente no casamento.',
            '',
            'Agradeço muito pelo convite e desejo um dia lindo para vocês.'
        ].join('\n')
    },
    feedback: {
        attending: {
            title: 'Presença confirmada, {firstName}.',
            subtitle: 'Sua mensagem está pronta e vamos te levar ao WhatsApp para finalizar o envio com carinho.',
            note: 'Abrindo o WhatsApp em {delaySeconds} segundos'
        },
        notAttending: {
            title: 'Obrigada pelo aviso, {firstName}.',
            subtitle: 'Sua mensagem de ausência está pronta para seguir ao WhatsApp com todo o carinho que este momento merece.',
            note: 'Abrindo o WhatsApp em {delaySeconds} segundos'
        },
        error: {
            title: 'Não foi possível continuar.',
            subtitle: 'Confira os dados informados e tente novamente em instantes.',
            note: ''
        }
    }
};