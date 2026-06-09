(function () {
  const WHITE_HEART = String.fromCodePoint(0x1F90D);
  const DEFAULT_GROUP_NOTICE = 'Compartilhe este convite com as demais pessoas do seu grupo.';
  const DEFAULT_INDIVIDUAL_NOTICE = 'Este convite foi enviado especialmente para você.';

  function resolveInviteNotice(template, fallback, values = {}) {
    const source = String(template || fallback || '').trim();

    return source.replace(/\{(\w+)\}/g, (_, key) => {
      const value = values[key];
      return value == null ? '' : String(value);
    }).trim();
  }

  function buildInviteWhatsAppMessage({
    coupleNames,
    link,
    deadline = '',
    isIndividual = false,
    groupSizeLabel = '',
    groupNoticeText = '',
    individualNoticeText = '',
    useDefaultGroupNotice = true,
    useDefaultIndividualNotice = true,
  } = {}) {
    const coupleLabel = String(coupleNames || 'os noivos').trim() || 'os noivos';
    const inviteLink = String(link || '').trim();
    const deadlineText = String(deadline || '').trim();

    if (!inviteLink) return '';

    const deadlineLine = deadlineText
      ? `✅ Confirmar sua presença (necessário até ${deadlineText})`
      : '✅ Confirmar sua presença';

    const inviteNotice = isIndividual
      ? (
          useDefaultIndividualNotice
            ? resolveInviteNotice(DEFAULT_INDIVIDUAL_NOTICE, DEFAULT_INDIVIDUAL_NOTICE)
            : String(individualNoticeText || '').trim()
        )
      : (
          useDefaultGroupNotice
            ? resolveInviteNotice(DEFAULT_GROUP_NOTICE, DEFAULT_GROUP_NOTICE)
            : String(groupNoticeText || '').trim()
        );

    const inviteNoticeBlock = inviteNotice ? `${inviteNotice}\n\n` : '';
    const groupLabel = String(groupSizeLabel || 'vários convidados').trim();
    const inviteObservation = isIndividual
      ? 'Observação: este convite é individual.'
      : `Observação: este convite é para ${groupLabel}.`;

    return (
      `Olá! Você foi convidado(a) para o casamento de ${coupleLabel} ${WHITE_HEART}\n\n` +
      `${inviteNoticeBlock}` +
      'Antes de abrir o link, leia as informações abaixo:\n\n' +
      'No convite você vai encontrar:\n' +
      `${deadlineLine}\n` +
      '🎁 Lista de presentes\n' +
      '📍 Detalhes do evento, traje e FAQ\n\n' +
      `👉 ${inviteLink}\n\n` +
      `${inviteObservation}\n\n` +
      'Aguardamos você com muito carinho!'
    );
  }

  globalThis.buildInviteWhatsAppMessage = buildInviteWhatsAppMessage;
})();
