// Nav scroll
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 30);
  }, { passive: true });
}

// Mobile hamburger
const hamburger = document.getElementById('hamburger');
const drawer = document.getElementById('navDrawer');
if (hamburger && drawer) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('is-open');
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('is-open');
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
    });
  });
}

// Reveal on scroll
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -48px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Count-up animation
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const decimal = el.dataset.decimal || '';
  const duration = 1800;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(ease * target);
    if (decimal) {
      el.textContent = decimal + String(value).slice(-1) + suffix;
    } else {
      el.textContent = value + suffix;
    }
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const countObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('[data-count]').forEach(animateCount);
      countObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
const numerosSection = document.getElementById('numeros');
if (numerosSection) countObserver.observe(numerosSection);

// Showcase de direções visuais
(function () {
  const showcaseSection = document.getElementById('direcoes-visuais');
  const screens = document.querySelectorAll('.direcao-screen');
  const infos = document.querySelectorAll('.direcao-info');
  const dots = document.querySelectorAll('.direcao-dot');
  const prevBtn = document.querySelector('.direcoes-prev');
  const nextBtn = document.querySelector('.direcoes-next');
  const phoneWrap = document.querySelector('.direcoes-phone-wrap');
  const videos = document.querySelectorAll('.direcao-video');
  const total = screens.length;
  if (!total) return;

  let current = 0;
  let showcaseVisible = false;
  let interactionUnlocked = false;

  function primeVideo(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.load();
  }

  videos.forEach((video, index) => {
    primeVideo(video);
    video.addEventListener('loadeddata', () => {
      if (index === current && showcaseVisible) syncVideos();
    });
    video.addEventListener('canplay', () => {
      if (index === current && showcaseVisible) syncVideos();
    });
  });

  function syncVideos() {
    videos.forEach((video, i) => {
      if (i === current && showcaseVisible && !document.hidden) {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        return;
      }

      video.pause();
      video.currentTime = 0;
    });
  }

  function unlockPlayback() {
    if (interactionUnlocked) return;
    interactionUnlocked = true;
    syncVideos();
  }

  function showSlide(index) {
    current = ((index % total) + total) % total;
    screens.forEach((s, i) => s.classList.toggle('is-active', i === current));
    infos.forEach((info, i) => info.classList.toggle('is-active', i === current));
    dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === current);
      d.setAttribute('aria-selected', String(i === current));
    });
    syncVideos();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => showSlide(current - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => showSlide(current + 1));

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => showSlide(i));
    dot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSlide(i); }
    });
  });

  // Swipe no phone
  if (phoneWrap) {
    const sw = { startX: 0, startY: 0, tracking: false };
    const threshold = 48;
    phoneWrap.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      sw.startX = e.touches[0].clientX;
      sw.startY = e.touches[0].clientY;
      sw.tracking = true;
    }, { passive: true });
    phoneWrap.addEventListener('touchend', (e) => {
      if (!sw.tracking) return;
      sw.tracking = false;
      const dx = e.changedTouches[0].clientX - sw.startX;
      const dy = e.changedTouches[0].clientY - sw.startY;
      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy)) {
        showSlide(dx < 0 ? current + 1 : current - 1);
      }
    }, { passive: true });
    phoneWrap.addEventListener('touchcancel', () => { sw.tracking = false; }, { passive: true });
  }

  if (showcaseSection) {
    const showcaseObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        showcaseVisible = entry.isIntersecting;
        syncVideos();
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -10% 0px'
    });

    showcaseObserver.observe(showcaseSection);
  } else {
    showcaseVisible = true;
  }

  document.addEventListener('visibilitychange', syncVideos);
  window.addEventListener('pageshow', syncVideos);
  window.addEventListener('touchstart', unlockPlayback, { passive: true, once: true });
  window.addEventListener('pointerdown', unlockPlayback, { passive: true, once: true });
  window.addEventListener('scroll', unlockPlayback, { passive: true, once: true });
  syncVideos();
})();

// Redireciona CTAs para o dashboard se já existir sessão ativa.
(function () {
  let token = '';
  try {
    token = sessionStorage.getItem('dashboard-access-token');
  } catch (err) {
    console.warn('[landing] Não foi possível ler a sessão local:', err?.message);
  }

  if (!token) return;

  document.querySelectorAll('a[href="signup.html"]').forEach(function (link) {
    link.href = 'dashboard.html';
  });
})();
