import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PresentPage } from '../../assets/js/presente.js';

function mountPixDom(value = 'PIX123') {
  document.body.innerHTML = `
    <button
      id="copyBtn"
      data-copy-value="${value}"
      data-copy-feedback-target="pixFeedback"
    >Copiar código Pix</button>
    <p id="pixFeedback"></p>
  `;
}

describe('PresentPage copy pix', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies with navigator.clipboard when available', async () => {
    mountPixDom('PIX-OK');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    const page = new PresentPage();
    const button = document.getElementById('copyBtn');

    await page.handleCopy(button);

    expect(writeText).toHaveBeenCalledWith('PIX-OK');
    expect(button.classList.contains('is-success')).toBe(true);
    expect(document.getElementById('pixFeedback').textContent).toContain('copiado');
  });

  it('uses fallback copy when clipboard API is unavailable', async () => {
    mountPixDom('PIX-FALLBACK');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(true)
    });
    const execSpy = vi.spyOn(document, 'execCommand');

    const page = new PresentPage();
    const button = document.getElementById('copyBtn');

    await page.handleCopy(button);

    expect(execSpy).toHaveBeenCalledWith('copy');
    expect(button.classList.contains('is-success')).toBe(true);
  });

  it('shows error feedback when no pix value exists', async () => {
    mountPixDom('');

    const page = new PresentPage();
    const button = document.getElementById('copyBtn');

    await page.handleCopy(button);

    expect(button.classList.contains('is-success')).toBe(false);
    expect(document.getElementById('pixFeedback').textContent).toContain('indisponível');
  });
});