export const WHATSAPP_CONFIG = {
    destinationPhone: '5511914772174',
    recipientName: 'Siannah',
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
    }
};