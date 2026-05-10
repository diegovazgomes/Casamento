import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function loadSignupHtml() {
  const filePath = path.resolve(process.cwd(), 'signup.html');
  return readFileSync(filePath, 'utf8');
}

function mountSignupPage() {
  const html = loadSignupHtml();
  const bodyMatch = html.match(/<body>([\s\S]*?)<script>/i);
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);

  if (!bodyMatch || !scriptMatch) {
    throw new Error('Nao foi possivel extrair body/script de signup.html');
  }

  document.body.innerHTML = bodyMatch[1];
  window.eval(scriptMatch[1]);
}

describe('signup form integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('mantem regra visual de autofill configurada', () => {
    const html = loadSignupHtml();

    expect(html).toContain('.field input:-webkit-autofill');
    expect(html).toContain('-webkit-box-shadow: 0 0 0 1000px var(--surface-2) inset;');
  });

  it('envia payload normalizado com campos preenchidos programaticamente', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Erro esperado para teste' }),
    });

    globalThis.fetch = fetchMock;
    mountSignupPage();

    document.getElementById('brideNameInput').value = '  Siannah  ';
    document.getElementById('groomNameInput').value = '  Diego  ';
    document.getElementById('emailInput').value = '  CASAL@EMAIL.COM  ';
    document.getElementById('whatsappInput').value = '(11) 99999-9999';
    document.getElementById('passwordInput').value = 'senhaforte123';
    document.getElementById('consentCheckbox').checked = true;

    const form = document.getElementById('signupForm');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/signup');
    expect(options.method).toBe('POST');

    const payload = JSON.parse(options.body);
    expect(payload).toEqual({
      bride_name: 'Siannah',
      groom_name: 'Diego',
      couple_name: 'Siannah & Diego',
      email: 'casal@email.com',
      whatsapp: '11999999999',
      password: 'senhaforte123',
    });
  });
});
