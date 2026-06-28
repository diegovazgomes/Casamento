(function () {
    try {
        document.documentElement.classList.add('ls-pending');

        const colors = JSON.parse(sessionStorage.getItem('ls-theme-colors') || 'null');
        if (colors && colors.bg && colors.text && colors.primary) {
            const root = document.documentElement;
            root.style.setProperty('--ls-bg-color', colors.bg);
            root.style.setProperty('--ls-text-color', colors.text);
            root.style.setProperty('--ls-primary-color', colors.primary);
        }

        window.__LS_COUPLE_DATA__ = null;
        if (sessionStorage.getItem('ls_data_ready') === '1') {
            const couple = JSON.parse(sessionStorage.getItem('ls_couple') || 'null');
            if (couple && couple.first && couple.second) {
                window.__LS_COUPLE_DATA__ = couple;
            }
        }

        const plan = window.__INVITATION_BOOTSTRAP__?.plan;
        if (plan) {
            try {
                localStorage.setItem('devazi_plan', plan);
            } catch {
                // localStorage may be blocked by browser privacy settings.
            }
        }
    } catch {
        window.__LS_COUPLE_DATA__ = null;
    }
})();
