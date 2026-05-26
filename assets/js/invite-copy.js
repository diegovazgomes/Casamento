(function () {
  const WHITE_HEART = String.fromCodePoint(0x1F90D);

  function buildInviteWhatsAppMessage({ coupleNames, link, deadline = '', isIndividual = false, groupSizeLabel = '' } = {}) {
    const coupleLabel  = String(coupleNames || 'os noivos').trim() || 'os noivos';
    const inviteLink   = String(link || '').trim();
    const deadlineText = String(deadline || '').trim();

    if (!inviteLink) return '';

    const deadlineLine = deadlineText
      ? `✅ Confirmar sua presença (necessário até ${deadlineText})`
      : `✅ Confirmar sua presença`;

    const groupLine = !isIndividual
      ? `Seu convite é para ${String(groupSizeLabel || 'vários convidados').trim()} — compartilhe com o seu grupo.\n\n`
      : '';

    return (
      `Olá! Você foi convidado(a) para o casamento de ${coupleLabel} ${WHITE_HEART}\n\n` +
      `${groupLine}` +
      `Antes de abrir o link, leia as informações abaixo:\n\n` +
      `No convite você vai encontrar:\n` +
      `${deadlineLine}\n` +
      `🎁 Lista de presentes\n` +
      `📍 Detalhes do evento, traje e FAQ\n\n` +
      `👉 ${inviteLink}\n\n` +
      `Aguardamos você com muito carinho!`
    );
  }

  globalThis.buildInviteWhatsAppMessage = buildInviteWhatsAppMessage;
})();
