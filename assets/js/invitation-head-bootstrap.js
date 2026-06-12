(function () {
    let invitationStarted = false;
    let navigationTarget = null;

    try {
        invitationStarted = window.sessionStorage.getItem('wedding-invitation-started') === 'true';
    } catch {
        invitationStarted = false;
    }

    let guestToken = null;

    try {
        const searchParams = new URL(window.location.href).searchParams;
        navigationTarget = searchParams.get('section');
        guestToken = searchParams.get('g') || null;
    } catch {
        navigationTarget = null;
        guestToken = null;
    }

    if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
    }

    window.__INVITATION_BOOTSTRAP__ = {
        navigationTarget,
        guestToken,
        shouldSkipIntro: invitationStarted || Boolean(navigationTarget),
        plan: 'premium',
    };

    if (window.__INVITATION_BOOTSTRAP__.shouldSkipIntro) {
        document.documentElement.classList.add('skip-intro');
    }
})();
