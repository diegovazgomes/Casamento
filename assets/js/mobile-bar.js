(function () {
    const bar = document.getElementById('mobileBar');
    if (!bar || window.innerWidth > 768) return;

    const SCROLL_THRESHOLD = 300;
    const anchorIds = ['rsvp'];

    function updateBar() {
        const scrolled = window.scrollY > SCROLL_THRESHOLD;
        const nearSection = anchorIds.some((id) => {
            const el = document.getElementById(id);
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return rect.top < window.innerHeight * 0.75 && rect.bottom > 0;
        });

        bar.classList.toggle('is-visible', scrolled && !nearSection);
    }

    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();
})();
