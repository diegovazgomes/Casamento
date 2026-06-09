(function () {
  const WHITE_HEART = String.fromCodePoint(0x1F90D);
  const DEFAULT_GROUP_NOTICE = 'Seu convite é para {groupSizeLabel} e pode ser compartilhado com as demais pessoas do seu grupo.';
  const DEFAULT_INDIVIDUAL_NOTICE = 'Seu convite é individual.';

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
    groupNoticeTemplate = '',
    individualNotice = '',
  } = {}) {
    const coupleLabel = String(coupleNames || 'os noivos').trim() || 'os noivos';
    const inviteLink = String(link || '').trim();
    const deadlineText = String(deadline || '').trim();

    if (!inviteLink) return '';

    const deadlineLine = deadlineText
      ? `✅ Confirmar sua presença (necessário até ${deadlineText})`
      : '✅ Confirmar sua presença';

    const inviteNotice = isIndividual
      ? resolveInviteNotice(individualNotice, DEFAULT_INDIVIDUAL_NOTICE)
      : resolveInviteNotice(groupNoticeTemplate, DEFAULT_GROUP_NOTICE, {
          groupSizeLabel: String(groupSizeLabel || 'vários convidados').trim(),
        });

    const inviteNoticeBlock = inviteNotice ? `${inviteNotice}\n\n` : '';

    return (
      `Olá! Você foi convidado(a) para o casamento de ${coupleLabel} ${WHITE_HEART}\n\n` +
      `${inviteNoticeBlock}` +
      'Antes de abrir o link, leia as informações abaixo:\n\n' +
      'No convite você vai encontrar:\n' +
      `${deadlineLine}\n` +
      '🎁 Lista de presentes\n' +
      '📍 Detalhes do evento, traje e FAQ\n\n' +
      `👉 ${inviteLink}\n\n` +
      'Aguardamos você com muito carinho!'
    );
  }

  globalThis.buildInviteWhatsAppMessage = buildInviteWhatsAppMessage;
})();
