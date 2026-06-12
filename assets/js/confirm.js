(function () {
  const params  = new URLSearchParams(window.location.search);
  const hash    = new URLSearchParams(window.location.hash.slice(1));
  const step    = params.get('step');
  const email   = params.get('email') || '';

  // Elementos de estado
  const states = {
    loading:     document.getElementById('stateLoading'),
    'check-email': document.getElementById('stateCheckEmail'),
    success:     document.getElementById('stateSuccess'),
    error:       document.getElementById('stateError'),
  };

  function showState(name) {
    Object.values(states).forEach(el => el.classList.remove('is-active'));
    if (states[name]) states[name].classList.add('is-active');
  }

  function showError(detail) {
    showState('error');
    const detailEl = document.getElementById('errorDetail');
    if (detail && detailEl) {
      detailEl.textContent = detail;
      detailEl.hidden = false;
    }
  }

  // ── Passo 1: Se vier do pós-signup, mostra o estado de "cheque seu e-mail"
  if (step === 'check-email') {
    if (email) {
      const display = document.getElementById('emailDisplay');
      if (display) display.textContent = email;
    }
    showState('check-email');
    return;
  }

  // ── Passo 2: Verificar se há tokens Supabase no hash (callback de confirmação)
  const accessToken  = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const hashType     = hash.get('type');
  const queryType    = params.get('type');
  const code         = params.get('code') || '';
  const errorCode    = hash.get('error_code') || params.get('error_code');
  const errorDesc    = hash.get('error_description') || params.get('error_description');

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

  // Erros explícitos do Supabase na URL
  if (errorCode || errorDesc) {
    showError(errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : null);
    return;
  }

  const isRecoveryFlow = hashType === 'recovery' || queryType === 'recovery';
  if (isRecoveryFlow) {
    const nextSearch = params.toString();
    const nextHash = hash.toString();
    const resetUrl = `reset-password.html${nextSearch ? `?${nextSearch}` : ''}${nextHash ? `#${nextHash}` : ''}`;
    window.location.replace(resetUrl);
    return;
  }

  // Sem tokens e sem step: fallback para check-email genérico
  if (!accessToken && !code) {
    showState('check-email');
    return;
  }

  // Com tokens: tentar confirmar a sessão via Supabase client
  showState('loading');

  fetch('/api/event-config?mode=client-config')
    .then(r => r.ok ? r.json() : Promise.reject('config-fail'))
    .then(({ supabaseUrl, supabaseAnonKey }) => {
      if (!supabaseUrl || !supabaseAnonKey) return Promise.reject('no-config');
      const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      if (code) {
        return supabase.auth.exchangeCodeForSession(code);
      }
      return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' });
    })
    .then(({ data, error }) => {
      if (error || !data?.session) {
        showError(error?.message || null);
        return;
      }
      clearSensitiveAuthParams();
      // Sessão válida → mostrar sucesso e redirecionar
      showState('success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1800);
    })
    .catch(() => {
      showError('Não foi possível conectar ao servidor. Tente novamente.');
    });
})();
