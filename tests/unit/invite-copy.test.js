import { describe, expect, it } from 'vitest';

await import('../../assets/js/invite-copy.js');

describe('invite copy helper', () => {
  it('builds the group invite message with group-sharing copy', () => {
    const message = globalThis.buildInviteWhatsAppMessage({
      coupleNames: 'Ana & Leo',
      link: 'https://example.com/ana-leo-2026?g=token',
      groupSizeLabel: '2 pessoas',
      groupNoticeText: 'Compartilhe este convite com as demais pessoas do seu grupo.',
      useDefaultGroupNotice: false,
    });

    expect(message).toContain('pode ser compartilhado com as demais pessoas do seu grupo');
    expect(message).toContain('Observação: este convite é para 2 pessoas.');
  });

  it('builds the individual invite message with explicit individual copy', () => {
    const message = globalThis.buildInviteWhatsAppMessage({
      coupleNames: 'Ana & Leo',
      link: 'https://example.com/ana-leo-2026?g=token',
      isIndividual: true,
      individualNoticeText: 'Este convite foi enviado especialmente para você.',
      useDefaultIndividualNotice: false,
    });

    expect(message).toContain('Este convite foi enviado especialmente para você.');
    expect(message).toContain('Observação: este convite é individual.');
    expect(message).not.toContain('demais pessoas do seu grupo');
  });
});
