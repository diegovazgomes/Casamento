import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../assets/js/rsvp-persistence.js', () => ({
  saveGuestMessage: vi.fn(),
  saveSongSuggestion: vi.fn(),
}));

function flushAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createMessageDom() {
  document.head.innerHTML = '<meta name="description" content="">';
  document.body.innerHTML = `
    <span id="mensagemTag"></span>
    <h1 id="mensagemTitle"></h1>
    <p id="mensagemIntro"></p>
    <h2 id="mensagemFormTitle"></h2>
    <p id="mensagemFormSubtitle"></p>
    <label id="mensagemNameLabel" for="mensagemNameInput"></label>
    <label id="mensagemBodyLabel" for="mensagemBodyInput"></label>
    <form id="mensagemForm">
      <input id="mensagemNameInput" type="text">
      <textarea id="mensagemBodyInput"></textarea>
      <button id="mensagemSubmitButton" type="submit">Enviar</button>
      <p id="mensagemFeedback"></p>
    </form>
  `;
}

function createMusicDom() {
  document.head.innerHTML = '<meta name="description" content="">';
  document.body.innerHTML = `
    <span id="musicaTag"></span>
    <h1 id="musicaTitle"></h1>
    <p id="musicaIntro"></p>
    <h2 id="musicaFormTitle"></h2>
    <p id="musicaFormSubtitle"></p>
    <label id="musicaNameLabel" for="musicaNameInput"></label>
    <label id="musicaSongLabel" for="musicaSongInput"></label>
    <label id="musicaArtistLabel" for="musicaArtistInput"></label>
    <label id="musicaNotesLabel" for="musicaNotesInput"></label>
    <form id="musicaForm">
      <input id="musicaNameInput" type="text">
      <input id="musicaSongInput" type="text">
      <input id="musicaArtistInput" type="text">
      <textarea id="musicaNotesInput"></textarea>
      <button id="musicaSubmitButton" type="submit">Enviar</button>
      <p id="musicaFeedback"></p>
    </form>
  `;
}

const baseConfig = {
  rsvp: { supabaseEnabled: true, eventId: 'evento-teste' },
  pages: {
    mensagem: {
      content: {
        tag: 'Mensagem',
        title: 'Mensagem',
        intro: 'Intro',
        formTitle: 'Escreva',
        formSubtitle: 'Sub',
        nameLabel: 'Nome',
        messageLabel: 'Mensagem',
        namePlaceholder: 'Nome',
        messagePlaceholder: 'Mensagem',
        submitLabel: 'Enviar mensagem aos noivos',
        successMessage: 'Mensagem enviada com carinho.',
        errorMessage: 'Não foi possível enviar sua mensagem agora. Tente novamente.',
      },
    },
    musica: {
      content: {
        tag: 'Música',
        title: 'Música',
        intro: 'Intro',
        formTitle: 'Sugestão',
        formSubtitle: 'Sub',
        nameLabel: 'Nome',
        songLabel: 'Música',
        artistLabel: 'Artista',
        notesLabel: 'Obs',
        namePlaceholder: 'Nome',
        songPlaceholder: 'Música',
        artistPlaceholder: 'Artista',
        notesPlaceholder: 'Obs',
        submitLabel: 'Enviar sugestão aos noivos',
        successMessage: 'Sugestão enviada com sucesso.',
        errorMessage: 'Não foi possível enviar sua sugestão agora. Tente novamente.',
      },
    },
  },
};

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('guest submissions integration', () => {
  it('envia mensagem sem abrir WhatsApp', async () => {
    createMessageDom();
    const { saveGuestMessage } = await import('../../assets/js/rsvp-persistence.js');
    saveGuestMessage.mockResolvedValue(true);
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    await import('../../assets/js/mensagem.js');
    window.dispatchEvent(new CustomEvent('app:ready', { detail: { config: baseConfig } }));

    document.getElementById('mensagemNameInput').value = 'Ana';
    document.getElementById('mensagemBodyInput').value = 'Parabéns ao casal!';
    document.getElementById('mensagemForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync();

    expect(saveGuestMessage).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
    expect(document.getElementById('mensagemFeedback').textContent).toContain('Mensagem enviada');
  });

  it('envia sugestão sem abrir WhatsApp', async () => {
    createMusicDom();
    const { saveSongSuggestion } = await import('../../assets/js/rsvp-persistence.js');
    saveSongSuggestion.mockResolvedValue(true);
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    await import('../../assets/js/musica.js');
    window.dispatchEvent(new CustomEvent('app:ready', { detail: { config: baseConfig } }));

    document.getElementById('musicaNameInput').value = 'Ana';
    document.getElementById('musicaSongInput').value = 'Velha Infância';
    document.getElementById('musicaForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushAsync();

    expect(saveSongSuggestion).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
    expect(document.getElementById('musicaFeedback').textContent).toContain('Sugestão enviada');
  });
});