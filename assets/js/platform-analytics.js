(function () {
  const STORAGE_KEY = 'devazi-platform-session-id';
  const TRACKED_CTA_SELECTOR = [
    'a[href="signup.html"]',
    'a[href="/signup.html"]',
    'a[href*="signup.html"]',
    'a[href*="demonstracao"]',
    '[data-platform-event]',
  ].join(',');
  const pageStartTime = Date.now();
  let engagementSent = false;

  function getSessionId() {
    try {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (existing) return existing;
      const next = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(STORAGE_KEY, next);
      return next;
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  function getDeviceType() {
    const width = window.innerWidth || 0;
    if (width <= 640) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
    };
  }

  function postEvent(eventName, metadata = {}) {
    const payload = {
      event_name: eventName,
      session_id: getSessionId(),
      page_path: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
      ...getUtmParams(),
      metadata,
    };

    const body = JSON.stringify({
      table: 'platform_events',
      payload,
    });

    try {
      if (navigator.sendBeacon) {
        const accepted = navigator.sendBeacon('/api/submissions', new Blob([body], { type: 'application/json' }));
        if (accepted) return;
      }
    } catch {
      // Fetch keepalive below covers browsers that reject this beacon.
    }

    fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function getPageKind() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const fileName = path.split('/').pop() || 'landing.html';

    if (fileName === 'landing.html' || path === '/') return 'landing';
    if (fileName === 'signup.html') return 'signup';
    if (fileName === 'dashboard.html') return 'dashboard';
    return 'other';
  }

  function autoTrackPageView() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const fileName = path.split('/').pop() || 'landing.html';

    if (fileName === 'landing.html' || path === '/') {
      postEvent('landing_view');
      return;
    }

    if (fileName === 'signup.html') {
      postEvent('signup_started', { source: 'page_view' });
    }
  }

  function bindClickTracking() {
    document.addEventListener('click', (event) => {
      const target = event.target?.closest?.(TRACKED_CTA_SELECTOR);
      if (!target) return;

      const explicitEvent = target.dataset.platformEvent;
      const href = target.getAttribute('href') || '';
      let eventName = explicitEvent || 'landing_cta_click';

      if (!explicitEvent && href.includes('demonstracao')) {
        eventName = 'example_invite_view';
      }

      postEvent(eventName, {
        text: target.textContent?.trim().slice(0, 120) || '',
        href,
      });
    }, { capture: true });
  }

  function sendEngagement() {
    if (engagementSent) return;
    engagementSent = true;

    const pageKind = getPageKind();
    if (pageKind !== 'landing' && pageKind !== 'signup') {
      return;
    }

    const durationSeconds = Math.max(1, Math.round((Date.now() - pageStartTime) / 1000));
    postEvent('page_engaged', {
      page_kind: pageKind,
      duration_seconds: durationSeconds,
    });
  }

  window.DevaziPlatformAnalytics = {
    track: postEvent,
    getSessionId,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoTrackPageView();
      bindClickTracking();
    });
  } else {
    autoTrackPageView();
    bindClickTracking();
  }

  window.addEventListener('pagehide', sendEngagement, { once: true });
  window.addEventListener('beforeunload', sendEngagement, { once: true });
})();
