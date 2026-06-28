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
  it('renderiza perguntas e respostas diretamente', async () => {
    createFaqDom();

    await import('../../assets/js/faq.js');
    window.dispatchEvent(new CustomEvent('app:ready', { detail: { config: baseConfig } }));

    const question = document.querySelector('.faq-question');
    const answer = document.querySelector('.faq-answer');

    expect(question.tagName).toBe('H2');
    expect(question.textContent).toBe('Tem estacionamento?');
    expect(answer.textContent).toBe('Sim.');
    expect(document.querySelector('.faq-question button')).toBeNull();
  });
});
