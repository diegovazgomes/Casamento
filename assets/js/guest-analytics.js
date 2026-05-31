const GUEST_VIEWS_ENDPOINT = '/api/submissions';
const SESSION_STORAGE_KEY = 'guest-analytics-session-id';

function createSessionId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function getOrCreateSessionId() {
    try {
        const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (existing) {
            return existing;
        }

        const nextId = createSessionId();
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextId);
        return nextId;
    } catch {
        return createSessionId();
    }
}

function normalizePagePath(urlLike, eventId = '') {
    try {
        const parsed = new URL(urlLike, window.location.origin);
        const pathname = parsed.pathname || '/';
        const segments = pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1] || '';
        const normalizedEventId = String(eventId || '').trim();

        if (!lastSegment || pathname === '/') {
            return 'index.html';
        }

        if (lastSegment.endsWith('.html')) {
            return lastSegment;
        }

        if (normalizedEventId && lastSegment === normalizedEventId) {
            return 'index.html';
        }

        return pathname;
    } catch {
        return 'index.html';
    }
}

function getReferrerPage(eventId = '') {
    const referrer = String(document.referrer || '').trim();
    if (!referrer) {
        return null;
    }

    return normalizePagePath(referrer, eventId);
}

function getViewportDimension(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function getDeviceType(width) {
    if (!Number.isFinite(width)) {
        return null;
    }

    if (width <= 767) {
        return 'mobile';
    }

    if (width <= 1023) {
        return 'tablet';
    }

    return 'desktop';
}

function postGuestView(payload, useBeacon = false) {
    const body = JSON.stringify({
        table: 'guest_views',
        payload,
    });

    if (useBeacon && typeof navigator.sendBeacon === 'function') {
        try {
            const blob = new Blob([body], { type: 'application/json' });
            const sent = navigator.sendBeacon(GUEST_VIEWS_ENDPOINT, blob);
            if (sent) {
                return true;
            }

            console.warn('[guest-analytics] navigator.sendBeacon recusou o envio de audiencia. Tentando fetch keepalive.', {
                pagePath: payload?.page_path || null,
                tokenId: payload?.token_id || null,
            });
        } catch (beaconError) {
            console.warn('[guest-analytics] Falha ao usar navigator.sendBeacon. Tentando fetch keepalive.', {
                message: beaconError?.message || 'beacon error',
                pagePath: payload?.page_path || null,
                tokenId: payload?.token_id || null,
            });
        }
    }

    const request = fetch(GUEST_VIEWS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
    }).then(async (response) => {
        if (!response.ok) {
            let details = '';
            try {
                details = await response.text();
            } catch {
                details = '';
            }

            console.warn('[guest-analytics] O backend rejeitou o registro de audiencia.', {
                status: response.status,
                details,
                pagePath: payload?.page_path || null,
                tokenId: payload?.token_id || null,
            });
        }
    }).catch((error) => {
        console.warn('[guest-analytics] Falha de rede ao enviar audiencia.', {
            message: error?.message || 'network error',
            pagePath: payload?.page_path || null,
            tokenId: payload?.token_id || null,
        });

        if (useBeacon && typeof navigator.sendBeacon === 'function') {
            console.warn('[guest-analytics] Falha de rede mesmo apos tentativa de sendBeacon.', {
                pagePath: payload?.page_path || null,
                tokenId: payload?.token_id || null,
            });
        }
    });

    void request;
    return true;
}

export class GuestViewTracker {
    constructor({ config = {}, guestTokenData = null, currentUrl = window.location.href } = {}) {
        this.config = config;
        this.guestTokenData = guestTokenData;
        this.currentUrl = currentUrl;
        this.startedAt = null;
        this.sent = false;
        this.scheduledFlushTimer = null;
        this.boundFlushOnPageHide = () => this.flush('pagehide');
        this.boundFlushOnBeforeUnload = () => this.flush('beforeunload');
    }

    isEnabled() {
        return this.config?.analytics?.enabled === true;
    }

    shouldRequireGuestToken() {
        return this.config?.analytics?.requireGuestToken !== false;
    }

    shouldTrackDuration() {
        return this.config?.analytics?.trackPageDuration !== false;
    }

    getEventId() {
        return String(this.config?.rsvp?.eventId || '').trim();
    }

    getTokenId() {
        return this.guestTokenData?.token_id || null;
    }

    getPagePath() {
        return normalizePagePath(this.currentUrl, this.getEventId());
    }

    shouldTrack() {
        if (!this.isEnabled()) {
            console.warn('[guest-analytics] Rastreamento desativado no config do evento.');
            return false;
        }

        if (!this.getEventId()) {
            console.warn('[guest-analytics] eventId ausente. Nao foi possivel identificar o evento para salvar audiencia.');
            return false;
        }

        if (this.shouldRequireGuestToken() && !this.getTokenId()) {
            console.warn('[guest-analytics] guestTokenData.token_id ausente. O convite foi aberto sem token valido ou o token nao foi encontrado no backend.');
            return false;
        }

        return true;
    }

    start() {
        if (this.startedAt || !this.shouldTrack()) {
            return;
        }

        this.startedAt = new Date();

        if (!this.shouldTrackDuration()) {
            this.flush('immediate');
            return;
        }

        window.addEventListener('pagehide', this.boundFlushOnPageHide, { once: true });
        window.addEventListener('beforeunload', this.boundFlushOnBeforeUnload, { once: true });
    }

    stop() {
        if (this.scheduledFlushTimer) {
            window.clearTimeout(this.scheduledFlushTimer);
            this.scheduledFlushTimer = null;
        }
        window.removeEventListener('pagehide', this.boundFlushOnPageHide);
        window.removeEventListener('beforeunload', this.boundFlushOnBeforeUnload);
    }

    scheduleFlush(reason = 'immediate', delayMs = 1200, options = {}) {
        if (this.sent || !this.shouldTrack()) {
            return false;
        }

        if (this.scheduledFlushTimer) {
            window.clearTimeout(this.scheduledFlushTimer);
        }

        this.scheduledFlushTimer = window.setTimeout(() => {
            this.scheduledFlushTimer = null;
            this.flush(reason, options);
        }, delayMs);

        return true;
    }

    buildPayload({ includeDuration = true } = {}) {
        const openedAt = this.startedAt || new Date();
        const leftAt = new Date();
        const viewportWidth = getViewportDimension(window.innerWidth);
        const viewportHeight = getViewportDimension(window.innerHeight);
        const durationSeconds = includeDuration && this.shouldTrackDuration()
            ? Math.max(0, Math.round((leftAt.getTime() - openedAt.getTime()) / 1000))
            : null;

        return {
            event_id: this.getEventId(),
            token_id: this.getTokenId(),
            opened_at: openedAt.toISOString(),
            left_at: includeDuration && this.shouldTrackDuration() ? leftAt.toISOString() : null,
            duration_seconds: durationSeconds,
            user_agent: String(navigator.userAgent || '').slice(0, 200) || null,
            viewport_width: viewportWidth,
            viewport_height: viewportHeight,
            device_type: getDeviceType(viewportWidth),
            page_path: normalizePagePath(this.currentUrl, this.getEventId()),
            session_id: getOrCreateSessionId(),
            referrer_page: getReferrerPage(this.getEventId()),
        };
    }

    flush(reason = 'pagehide', options = {}) {
        if (this.sent || !this.shouldTrack()) {
            return false;
        }

        this.sent = true;
        this.stop();
        const shouldPreferBeacon = typeof options.preferBeacon === 'boolean'
            ? options.preferBeacon
            : reason !== 'immediate';
        return postGuestView(this.buildPayload(options), shouldPreferBeacon);
    }
}

export const guestAnalyticsInternals = {
    createSessionId,
    getDeviceType,
    getOrCreateSessionId,
    getReferrerPage,
    normalizePagePath,
    postGuestView,
};
