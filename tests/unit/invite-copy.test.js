import { describe, expect, it } from 'vitest';

await import('../../assets/js/invite-copy.js');

describe('invite copy helper', () => {

  it('builds the group invite message with group-sharing copy', () => {
    const message = globalThis.buildInviteWhatsAppMessage({
      coupleNames: 'Ana & Leo',
      link: 'https://example.com/api/event-config?mode=share&slug=ana-leo-2026&g=token',
      groupSizeLabel: '2 pessoas',
    });

    expect(message).toContain('compartilhe com os demais convidados do seu grupo');
    expect(message).toContain('Seu convite é para 2 pessoas');
  });

  it('builds the individual invite message without group-sharing copy', () => {
    const message = globalThis.buildInviteWhatsAppMessage({
      coupleNames: 'Ana & Leo',
      link: 'https://example.com/api/event-config?mode=share&slug=ana-leo-2026&g=token',
      isIndividual: true,
    });

    expect(message).toContain('Seu convite é exclusivo');
    expect(message).not.toContain('compartilhe com os demais convidados do seu grupo');
  });
});