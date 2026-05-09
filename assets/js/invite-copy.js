(function () {
  const PARTY_POPPER = '\\u{1F389}';
  const WHITE_HEART = '\\u{1F90D}';

  function buildInviteWhatsAppMessage({ coupleNames, link, isIndividual = false, groupSizeLabel = '' } = {}) {
    const coupleLabel = String(coupleNames || 'os noivos').trim() || 'os noivos';
    const inviteLink = String(link || '').trim();

    if (!inviteLink) {
      return '';
    }

    if (isIndividual) {
      return (
        `Olá! Você foi convidado(a) para o casamento de ${coupleLabel}! ${PARTY_POPPER}\n\n` +
        `Seu convite é exclusivo. Acesse o link abaixo para confirmar sua presença:\n\n` +
        `${inviteLink}\n\n` +
        `Aguardamos você com muito carinho! ${WHITE_HEART}`
      );
    }

    const sizeLabel = String(groupSizeLabel || '').trim() || 'vários convidados';

    return (
      `Olá! Você está sendo convidado(a) para o casamento de ${coupleLabel}! ${PARTY_POPPER}\n\n` +
      `Seu convite é para ${sizeLabel}. Acesse o link abaixo para confirmar sua presença e compartilhe com os demais convidados do seu grupo:\n\n` +
      `${inviteLink}\n\n` +
      `Aguardamos você com muito carinho! ${WHITE_HEART}`
    );
  }

  globalThis.buildInviteWhatsAppMessage = buildInviteWhatsAppMessage;
})();