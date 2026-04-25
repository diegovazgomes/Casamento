import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../assets/js/rsvp-persistence.js', () => ({
  saveRsvpConfirmation: vi.fn(),
}));

function createRsvpDom() {
  document.body.innerHTML = `
    <section id="rsvpSection">
      <div id="rsvpFlow">
        <form id="rsvpForm">
          <input id="rsvp-name" type="text">
          <span id="rsvp-name-error" hidden></span>
          <input id="rsvp-phone" type="text">
          <span id="rsvp-phone-error" hidden></span>
          <input id="rsvp-attendance" value="yes">
          <input id="rsvp-marketing-consent" type="checkbox">
          <button type="button" class="rsvp-btn-choice" data-attend="yes"></button>
          <button type="button" class="rsvp-btn-choice" data-attend="no"></button>
          <button type="submit" class="rsvp-submit">Enviar</button>
        </form>
      </div>
      <div id="rsvpSuccess" class="rsvp-success">
        <div id="successMsg"></div>
        <p id="successSub"></p>
        <p id="successNote"></p>
        <p id="successHint" hidden></p>
        <a id="successContactButton" hidden></a>
      </div>
    </section>
  `;
}

const baseConfig = {
  rsvp: { supabaseEnabled: true, eventId: 'evento-teste' },
  texts: {
    rsvpSuccessFaqHint: 'Consulte a FAQ acima se ainda tiver dúvidas.',
    rsvpSuccessContactButton: 'Falar com os noivos no WhatsApp',
  },
  whatsapp: {
    destinationPhone: '5511999999999',
    recipientName: 'Noivos',
    messages: {
      attending: 'Olá, {recipientName}! Aqui é {name}. Meu contato é {phone}.',
      notAttending: 'Olá, {recipientName}! Aqui é {name}. Não poderei ir. Meu contato é {phone}.',
    },
    feedback: {
      attending: {
        title: 'Presença confirmada, {firstName}.',
        subtitle: 'Sua confirmação foi registrada.',
        note: '',
      },
      notAttending: {
        title: 'Obrigada pelo aviso, {firstName}.',
        subtitle: 'Seu retorno foi registrado.',
        note: '',
      },
      error: {
        title: 'Erro',
        subtitle: 'Falhou',
        note: '',
      },
    },
  },
};

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  createRsvpDom();
});

describe('RSVP flow integration', () => {
  it('salva a confirmação e não redireciona automaticamente para o WhatsApp', async () => {
    const { saveRsvpConfirmation } = await import('../../assets/js/rsvp-persistence.js');
    saveRsvpConfirmation.mockResolvedValue(true);

    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    const { RSVP } = await import('../../assets/js/rsvp.js');

    document.getElementById('rsvp-name').value = 'Ana Clara';
    document.getElementById('rsvp-phone').value = '11999999999';
    document.getElementById('rsvp-attendance').value = 'yes';

    const rsvp = new RSVP(baseConfig);
    await rsvp.handleSubmit({ preventDefault() {} });

    expect(saveRsvpConfirmation).toHaveBeenCalledTimes(1);
    expect(saveRsvpConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'evento-teste',
    }));
    expect(assignSpy).not.toHaveBeenCalled();
    expect(document.getElementById('rsvpSuccess').classList.contains('show')).toBe(true);
    expect(document.getElementById('successHint').hidden).toBe(false);
    expect(document.getElementById('successContactButton').hidden).toBe(false);
    expect(document.getElementById('successContactButton').getAttribute('href')).toContain('https://wa.me/5511999999999');
  });

  it('mostra erro e reabilita o botão quando falha ao salvar', async () => {
    const { saveRsvpConfirmation } = await import('../../assets/js/rsvp-persistence.js');
    saveRsvpConfirmation.mockResolvedValue(false);

    const { RSVP } = await import('../../assets/js/rsvp.js');

    document.getElementById('rsvp-name').value = 'Ana Clara';
    document.getElementById('rsvp-phone').value = '11999999999';
    document.getElementById('rsvp-attendance').value = 'yes';

    const rsvp = new RSVP(baseConfig);
    await rsvp.handleSubmit({ preventDefault() {} });

    expect(document.getElementById('rsvpSuccess').classList.contains('is-error')).toBe(true);
    expect(document.querySelector('.rsvp-submit').disabled).toBe(false);
    expect(document.getElementById('successContactButton').hidden).toBe(true);
  });

  it('encaminha dados de grupo quando o RSVP vem de token', async () => {
    const { saveRsvpConfirmation } = await import('../../assets/js/rsvp-persistence.js');
    saveRsvpConfirmation.mockResolvedValue(true);

    const { RSVP } = await import('../../assets/js/rsvp.js');

    document.getElementById('rsvp-name').value = 'Ana Clara';
    document.getElementById('rsvp-phone').value = '11999999999';
    document.getElementById('rsvp-attendance').value = 'yes';

    const guestTokenData = {
      token_id: '2ff1c7ae-1111-4444-9999-99b2610fc11d',
      group_name: 'Familia Silva',
      max_confirmations: 4,
      confirmation_count: 1,
    };

    const rsvp = new RSVP(baseConfig, guestTokenData);
    await rsvp.handleSubmit({ preventDefault() {} });

    expect(saveRsvpConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      tokenId: '2ff1c7ae-1111-4444-9999-99b2610fc11d',
      groupName: 'Familia Silva',
      groupMaxConfirmations: 4,
    }));
  });

  it('aceita WhatsApp com codigo do pais 55', async () => {
    const { saveRsvpConfirmation } = await import('../../assets/js/rsvp-persistence.js');
    saveRsvpConfirmation.mockResolvedValue(true);

    const { RSVP } = await import('../../assets/js/rsvp.js');

    document.getElementById('rsvp-name').value = 'Ana Clara';
    document.getElementById('rsvp-phone').value = '+55 (11) 99999-9999';
    document.getElementById('rsvp-attendance').value = 'yes';

    const rsvp = new RSVP(baseConfig);
    await rsvp.handleSubmit({ preventDefault() {} });

    expect(saveRsvpConfirmation).toHaveBeenCalledTimes(1);
    expect(document.getElementById('rsvpSuccess').classList.contains('show')).toBe(true);
    expect(document.getElementById('rsvp-name-error').hidden).toBe(true);
    expect(document.getElementById('rsvp-phone-error').hidden).toBe(true);
  });
});