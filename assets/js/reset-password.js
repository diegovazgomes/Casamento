(function () {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token') || '';
  const hashType = hash.get('type');
  const queryType = query.get('type');
  const code = query.get('code') || '';
  const errorCode = hash.get('error_code') || query.get('error_code');

  const states = {
    loading: document.getElementById('stateLoading'),
    form: document.getElementById('stateForm'),
    error: document.getElementById('stateError'),
    success: document.getElementById('stateSuccess'),
  };

  function showState(name) {
    Object.values(states).forEach(el => el.classList.remove('is-active'));
    if (states[name]) states[name].classList.add('is-active');
  }

  function normalizePasswordUpdateMessage(message) {
    const normalized = String(message || '').trim().toLowerCase();

    if (!normalized) {
      return 'Não foi possível atualizar a senha. Tente novamente.';
    }

    if (
      normalized.includes('different from the old password')
      || normalized.includes('same as the old password')
      || normalized.includes('new password should be different')
      || normalized.includes('password should be different')
    ) {
      return 'A nova senha precisa ser diferente da senha anterior.';
    }

    if (normalized.includes('password') && normalized.includes('weak')) {
      return 'A senha informada é muito fraca. Use uma combinação mais segura.';
    }

    if (normalized.includes('password') && normalized.includes('characters')) {
      return 'A senha deve ter no mínimo 8 caracteres.';
    }

    if (normalized.includes('session') || normalized.includes('token') || normalized.includes('expired')) {
      return 'Seu link expirou ou não é mais válido. Solicite um novo link de redefinição.';
    }

    if (normalized.includes('rate limit') || normalized.includes('too many')) {
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
    }

    return 'Não foi possível atualizar a senha. Tente novamente.';
  }

  function clearSensitiveAuthParams() {
    const currentUrl = new URL(window.location.href);
    const nextQuery = new URLSearchParams(currentUrl.search);
    const nextHash = new URLSearchParams(currentUrl.hash.startsWith('#') ? currentUrl.hash.slice(1) : currentUrl.hash);
    const sensitiveKeys = ['access_token', 'refresh_token', 'type', 'code', 'error_code', 'error_description'];

    let changed = false;
    sensitiveKeys.forEach((key) => {
      if (nextQuery.has(key)) {
        nextQuery.delete(key);
        changed = true;
      }
      if (nextHash.has(key)) {
        nextHash.delete(key);
        changed = true;
      }
    });

    if (!changed) {
      return;
    }

    const search = nextQuery.toString();
    const hashValue = nextHash.toString();
    const sanitizedUrl = `${currentUrl.pathname}${search ? `?${search}` : ''}${hashValue ? `#${hashValue}` : ''}`;
    history.replaceState(null, '', sanitizedUrl);
  }

  showState('loading');

  const isRecoveryFlow = hashType === 'recovery' || queryType === 'recovery' || Boolean(code);

  // Link inválido ou tipo errado
  if (errorCode || !isRecoveryFlow || (!accessToken && !code)) {
    showState('error');
    return;
  }

  let supabase;

  // Inicializar Supabase e setar sessão de recovery
  fetch('/api/event-config?mode=client-config')
    .then(r => r.ok ? r.json() : Promise.reject('config-fail'))
    .then(({ supabaseUrl, supabaseAnonKey }) => {
      if (!supabaseUrl || !supabaseAnonKey) return Promise.reject('no-config');
      supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      if (code) {
        return supabase.auth.exchangeCodeForSession(code);
      }
      return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    })
    .then(({ error, data }) => {
      if (error) { showState('error'); return; }
      if (code && !data?.session) { showState('error'); return; }
      clearSensitiveAuthParams();
      showState('form');
      bindForm();
    })
    .catch(() => showState('error'));

  function bindForm() {
    const form = document.getElementById('resetForm');
    const submitBtn = document.getElementById('submitBtn');
    const alertError = document.getElementById('alertError');
    const alertSuccess = document.getElementById('alertSuccess');
    const pwdInput = document.getElementById('passwordInput');
    const cfmInput = document.getElementById('confirmInput');
    const errPwd = document.getElementById('errPassword');
    const errCfm = document.getElementById('errConfirm');

    // Indicador de força de senha
    pwdInput.addEventListener('input', () => {
      const val = pwdInput.value;
      const bars = [document.getElementById('bar1'), document.getElementById('bar2'), document.getElementById('bar3')];
      let strength = 0;
      if (val.length >= 8) strength++;
      if (/[A-Z]/.test(val) || /\d/.test(val)) strength++;
      if (/[^A-Za-z0-9]/.test(val) || val.length >= 12) strength++;

      bars.forEach((b, i) => {
        b.className = 'strength-bar';
        if (i < strength) {
          b.classList.add(strength === 1 ? 'weak' : strength === 2 ? 'medium' : 'strong');
        }
      });
      pwdInput.classList.remove('is-invalid');
      errPwd.classList.remove('visible');
    });

    cfmInput.addEventListener('input', () => {
      cfmInput.classList.remove('is-invalid');
      errCfm.classList.remove('visible');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertError.classList.remove('visible');
      alertSuccess.classList.remove('visible');

      const pwd = pwdInput.value;
      const cfm = cfmInput.value;
      let valid = true;

      if (pwd.length < 8) {
        pwdInput.classList.add('is-invalid');
        errPwd.textContent = 'A senha deve ter no mínimo 8 caracteres.';
        errPwd.classList.add('visible');
        valid = false;
      }

      if (pwd !== cfm) {
        cfmInput.classList.add('is-invalid');
        errCfm.textContent = 'As senhas não coincidem.';
        errCfm.classList.add('visible');
        valid = false;
      }

      if (!valid) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';

      try {
        const { error } = await supabase.auth.updateUser({ password: pwd });
        if (error) {
          alertError.textContent = normalizePasswordUpdateMessage(error.message);
          alertError.classList.add('visible');
          return;
        }
        showState('success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
      } catch {
        alertError.textContent = 'Erro inesperado. Tente novamente.';
        alertError.classList.add('visible');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar nova senha';
      }
    });
  }
})();
