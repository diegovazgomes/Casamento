import { beforeEach, describe, expect, it, vi } from 'vitest';

function createFaqDom() {
  document.head.innerHTML = '<meta name="description" content="">';
  document.body.innerHTML = `
    <span id="faqTag"></span>
    <h1 id="faqTitle"></h1>
    <p id="faqIntro"></p>
    <div id="faqList"></div>
  `;
}

const baseConfig = {
  pages: {
    faq: {
      content: {
        tag: 'FAQ',
        title: 'Perguntas frequentes',
        intro: 'Intro',
        items: [
          {
            question: 'Tem estacionamento?',
            answer: 'Sim.',
          },
        ],
      },
    },
  },
};

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  delete window.CONFIG;
});

describe('faq page', () => {
  it('abre e fecha respostas ao clicar na pergunta', async () => {
    createFaqDom();

    await import('../../assets/js/faq.js');
    window.dispatchEvent(new CustomEvent('app:ready', { detail: { config: baseConfig } }));

    const item = document.querySelector('.faq-item');
    const button = document.querySelector('.faq-question');
    const answer = document.querySelector('.faq-answer');

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(answer.textContent).toBe('Sim.');

    button.click();

    expect(item.classList.contains('is-open')).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    button.click();

    expect(item.classList.contains('is-open')).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
