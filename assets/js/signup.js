(function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const WHATSAPP_RE = /^\d{10,15}$/;

  const form = document.getElementById('signupForm');
  const submitBtn = document.getElementById('submitBtn');
  const alertError = document.getElementById('alertError');
  const alertSuccess = document.getElementById('alertSuccess');

  const errorByInputId = {
    brideNameInput: 'errBrideName',
    groomNameInput: 'errGroomName',
    emailInput: 'errEmail',
    whatsappInput: 'errWhatsapp',
    passwordInput: 'errPassword',
    confirmInput: 'errConfirm',
  };

  const pwdInput = document.getElementById('passwordInput');
  const cfmInput = document.getElementById('confirmInput');
  const bars = [document.getElementById('bar1'), document.getElementById('bar2'), document.getElementById('bar3')];

  function calcStrength(val) {
    let s = 0;
    if (val.length >= 8) s++;
    if (/[A-Z]/.test(val) || /\d/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val) || val.length >= 12) s++;
    return s;
  }

  pwdInput.addEventListener('input', () => {
    const strength = calcStrength(pwdInput.value);
    bars.forEach((b, i) => {
      b.className = 'strength-bar';
      if (i < strength) b.classList.add(strength === 1 ? 'weak' : strength === 2 ? 'medium' : 'strong');
    });
    showError('errPassword', '');
  });

  cfmInput.addEventListener('input', () => showError('errConfirm', ''));

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function readFormValues() {
    const fd = new FormData(form);

    const bride_name = normalizeText(fd.get('bride_name'));
    const groom_name = normalizeText(fd.get('groom_name'));
    const email = normalizeText(fd.get('email')).toLowerCase();
    const whatsappRaw = String(fd.get('whatsapp') || '');
    const password = String(fd.get('password') || '');
    const consent = fd.get('consent') !== null;

    return {
      bride_name,
      groom_name,
      email,
      whatsapp: whatsappRaw.replace(/\D/g, ''),
      password,
      consent,
      couple_name: `${bride_name} & ${groom_name}`,
    };
  }

  function clearErrorForInput(input) {
    if (!input || !input.id) return;
    const errorId = errorByInputId[input.id];
    if (!errorId) return;
    showError(errorId, '');
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
    const input = el.previousElementSibling;
    if (input?.tagName === 'INPUT') {
      input.classList.toggle('is-invalid', !!msg);
    }
  }

  function clearErrors() {
    ['errBrideName', 'errGroomName', 'errEmail', 'errWhatsapp', 'errPassword', 'errConfirm', 'errConsent'].forEach(id => showError(id, ''));
    alertError.textContent = '';
    alertError.classList.remove('visible');
    alertSuccess.classList.remove('visible');
  }

  function validate(data) {
    let ok = true;

    if (!data.bride_name || data.bride_name.length < 2) {
      showError('errBrideName', 'Informe o nome da noiva(o) com no mínimo 2 caracteres.');
      ok = false;
    }

    if (!data.groom_name || data.groom_name.length < 2) {
      showError('errGroomName', 'Informe o nome do noivo(a) com no mínimo 2 caracteres.');
      ok = false;
    }

    if (!data.email || !EMAIL_RE.test(data.email)) {
      showError('errEmail', 'Informe um e-mail válido.');
      ok = false;
    }

    const digitsOnly = data.whatsapp.replace(/\D/g, '');
    if (!digitsOnly || !WHATSAPP_RE.test(digitsOnly)) {
      showError('errWhatsapp', 'Informe o WhatsApp com DDD (10 a 15 dígitos).');
      ok = false;
    }

    if (!data.password || data.password.length < 8) {
      showError('errPassword', 'A senha deve ter no mínimo 8 caracteres.');
      ok = false;
    } else if (calcStrength(data.password) < 2) {
      showError('errPassword', 'Senha fraca. Use letras maiúsculas, números ou caracteres especiais.');
      ok = false;
    }

    const confirm = String((new FormData(form)).get('confirm') || '');
    if (data.password && data.password.length >= 8 && confirm !== data.password) {
      showError('errConfirm', 'As senhas não coincidem.');
      ok = false;
    }

    if (!data.consent) {
      const el = document.getElementById('errConsent');
      if (el) el.classList.add('visible');
      ok = false;
    }

    return ok;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();

    const data = readFormValues();

    if (!validate(data)) return;

    window.DevaziPlatformAnalytics?.track('signup_started', { source: 'form_submit' });

    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta...';

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_name: data.couple_name,
          bride_name: data.bride_name,
          groom_name: data.groom_name,
          email: data.email,
          whatsapp: data.whatsapp,
          password: data.password,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        alertError.textContent = json.error || 'Erro ao criar conta. Tente novamente.';
        alertError.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar minha conta';
        return;
      }

      // Sucesso: redirecionar para página de confirmação.
      window.DevaziPlatformAnalytics?.track('signup_completed', { source: 'signup_form' });
      const emailParam = encodeURIComponent(data.email);
      window.location.href = `confirm.html?step=check-email&email=${emailParam}`;
    } catch (err) {
      alertError.textContent = 'Não foi possível conectar ao servidor. Tente novamente.';
      alertError.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar minha conta';
    }
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => clearErrorForInput(input));
    input.addEventListener('change', () => clearErrorForInput(input));
    input.addEventListener('blur', () => clearErrorForInput(input));
  });

  form.addEventListener('animationstart', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (event.animationName === 'autofill-start') {
      target.dataset.autofilled = 'true';
      clearErrorForInput(target);
      return;
    }

    if (event.animationName === 'autofill-cancel') {
      delete target.dataset.autofilled;
    }
  });
})();
