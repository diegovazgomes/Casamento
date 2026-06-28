(function () {
  const WHITE_HEART = String.fromCodePoint(0x1F90D);
  const DEFAULT_GROUP_NOTICE = `Olá! Você foi convidado(a) para o casamento de {coupleNames} ${WHITE_HEART}

Compartilhe este convite com as demais pessoas do seu grupo.

Antes de abrir o link, leia as informações abaixo:

No convite você vai encontrar:
{deadlineLine}
🎁 Lista de presentes
📍 Detalhes do evento, traje e FAQ

👉 {link}

Aguardamos você com muito carinho!`;
  const DEFAULT_INDIVIDUAL_NOTICE = `Olá! Você foi convidado(a) para o casamento de {coupleNames} ${WHITE_HEART}

Antes de abrir o link, leia as informações abaixo:

No convite você vai encontrar:
{deadlineLine}
🎁 Lista de presentes
📍 Detalhes do evento, traje e FAQ

👉 {link}

Aguardamos você com muito carinho!`;

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
            ? resolveInviteNotice(DEFAULT_INDIVIDUAL_NOTICE, DEFAULT_INDIVIDUAL_NOTICE, {
                coupleNames: coupleLabel,
                deadlineLine,
                link: inviteLink,
              })
            : resolveInviteNotice(String(individualNoticeText || '').trim(), '', {
                coupleNames: coupleLabel,
                deadlineLine,
                link: inviteLink,
              })
        )
      : (
          useDefaultGroupNotice
            ? resolveInviteNotice(DEFAULT_GROUP_NOTICE, DEFAULT_GROUP_NOTICE, {
                coupleNames: coupleLabel,
                deadlineLine,
                link: inviteLink,
              })
            : resolveInviteNotice(String(groupNoticeText || '').trim(), '', {
                coupleNames: coupleLabel,
                deadlineLine,
                link: inviteLink,
              })
        );

    const groupLabel = String(groupSizeLabel || 'vários convidados').trim();
    const inviteObservation = isIndividual
      ? 'Observação: este convite é individual.'
      : `Observação: este convite é para ${groupLabel}.`;

    return inviteNotice
      ? `${inviteNotice}\n\n${inviteObservation}`
      : inviteObservation;
  }

  globalThis.buildInviteWhatsAppMessage = buildInviteWhatsAppMessage;
})();
