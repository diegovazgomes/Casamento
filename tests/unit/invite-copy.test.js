import { describe, expect, it } from 'vitest';

await import('../../assets/js/invite-copy.js');

describe('invite copy helper', () => {
  it('builds the group invite message with group-sharing copy', () => {
    const message = globalThis.buildInviteWhatsAppMessage({
      coupleNames: 'Ana & Leo',
      link: 'https://example.com/ana-leo-2026?g=token',
      groupSizeLabel: '2 pessoas',
      groupNoticeTemplate: 'Seu convite é para {groupSizeLabel} e pode ser compartilhado com as demais pessoas do seu grupo.',
    });

    expect(message).toContain('pode ser compartilhado com as demais pessoas do seu grupo');
    expect(message).toContain('Seu convite é para 2 pessoas');
  });

  it('builds the individual invite message with explicit individual copy', () => {
    const message = globalThis.buildInviteWhatsAppMessage({
      coupleNames: 'Ana & Leo',
      link: 'https://example.com/ana-leo-2026?g=token',
      isIndividual: true,
      individualNotice: 'Seu convite é individual.',
    });

    expect(message).toContain('Seu convite é individual.');
    expect(message).not.toContain('demais pessoas do seu grupo');
  });
});
