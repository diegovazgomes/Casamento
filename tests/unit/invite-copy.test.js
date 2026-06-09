import { describe, expect, it } from 'vitest';

await import('../../assets/js/invite-copy.js');

describe('invite copy helper', () => {
  it('builds the group invite message with group-sharing copy', () => {
    const message = globalThis.buildInviteWhatsAppMessage({
      coupleNames: 'Ana & Leo',
      link: 'https://example.com/ana-leo-2026?g=token',
      groupSizeLabel: '2 pessoas',
      groupNoticeText: 'Mensagem customizada para {coupleNames}.\n\nAcesse aqui: {link}\n\n{deadlineLine}',
      useDefaultGroupNotice: false,
    });

    expect(message).toContain('Mensagem customizada para Ana & Leo.');
    expect(message).toContain('Acesse aqui: https://example.com/ana-leo-2026?g=token');
    expect(message).toContain('✅ Confirmar sua presença');
    expect(message).toContain('Observação: este convite é para 2 pessoas.');
  });

  it('builds the individual invite message with explicit individual copy', () => {
    const message = globalThis.buildInviteWhatsAppMessage({
      coupleNames: 'Ana & Leo',
      link: 'https://example.com/ana-leo-2026?g=token',
      isIndividual: true,
      individualNoticeText: 'Convite especial para {coupleNames}.',
      useDefaultIndividualNotice: false,
    });

    expect(message).toContain('Convite especial para Ana & Leo.');
    expect(message).toContain('Observação: este convite é individual.');
    expect(message).not.toContain('demais pessoas do seu grupo');
  });
});
