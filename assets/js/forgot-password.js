(function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const form         = document.getElementById('forgotForm');
  const formWrap     = document.getElementById('formWrap');
  const submitBtn    = document.getElementById('submitBtn');
  const alertError   = document.getElementById('alertError');
  const errEmail     = document.getElementById('errEmail');
  const emailInput   = document.getElementById('emailInput');
  const successState = document.getElementById('successState');

  function showAlert(msg) {
    alertError.textContent = msg;
    alertError.classList.add('visible');
  }
  function clearAlert() { alertError.classList.remove('visible'); }

  async function getPublicSupabaseConfig() {
    const response = await fetch('/api/event-config?mode=client-config');
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Não foi possível carregar a configuração pública.');
    }

    if (!payload?.supabaseUrl || !payload?.supabaseAnonKey) {
      throw new Error('Supabase não configurado para recuperação de senha.');
    }

    return {
      supabaseUrl: payload.supabaseUrl,
      supabaseAnonKey: payload.supabaseAnonKey,
    };
  }

  function resolveResetRedirect() {
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}/reset-password.html`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const email = emailInput.value.trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      emailInput.classList.add('is-invalid');
      errEmail.textContent = 'Informe um e-mail válido.';
      errEmail.classList.add('visible');
      emailInput.focus();
      return;
    }
    emailInput.classList.remove('is-invalid');
    errEmail.classList.remove('visible');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    try {
      const { supabaseUrl, supabaseAnonKey } = await getPublicSupabaseConfig();
      const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resolveResetRedirect(),
      });

      if (error) {
        throw new Error('Não foi possível solicitar a recuperação de senha.');
      }

      formWrap.style.display = 'none';
      successState.classList.add('visible');
    } catch (error) {
      alertError.textContent = error?.message || 'Não foi possível enviar o link agora. Verifique sua conexão e tente novamente.';
      alertError.classList.add('visible');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar link de recuperação';
    }
  });

  emailInput.addEventListener('input', () => {
    emailInput.classList.remove('is-invalid');
    errEmail.classList.remove('visible');
  });
})();
