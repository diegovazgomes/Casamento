const AUDIO_START_VOLUME_FACTOR = 0.05;
const AUDIO_FADE_IN_DURATION_MS = 6500;
const AUDIO_FIRST_PLAY_AUDIBLE_DELAY_MS = 1800;
const AUDIO_AUTO_PAUSE_FADE_MS = 180;

export class AudioController extends EventTarget {
    constructor(trackConfig = {}) {
        super();
        this.desiredTrackKey = null;
        this.currentTrackKey = null;
        this.readyForPlayback = false;
        this.userPaused = false;
        this.lastError = null;
        this.fadeFrameId = null;
        this.fadeResolve = null;
        this.audioContext = null;
        this.audioOutputNodes = new WeakMap();
        this.tracks = Object.fromEntries(
            Object.entries(trackConfig).map(([key, definition]) => [
                key,
                {
                    ...definition,
                    element: this.createAudioElement(definition.src)
                }
            ])
        );
    }

    createAudioElement(src) {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = src;
        audio.loop = true;
        audio.preload = 'metadata';
        audio.volume = 0;

        audio.addEventListener('error', () => {
            this.lastError = 'audio-load-error';
            this.emitState();
        });

        return audio;
    }

    emitState() {
        const currentElement = this.getCurrentElement();

        this.dispatchEvent(new CustomEvent('statechange', {
            detail: {
                currentTrackKey: this.currentTrackKey,
                desiredTrackKey: this.desiredTrackKey,
                readyForPlayback: this.readyForPlayback,
                userPaused: this.userPaused,
                isPlaying: Boolean(currentElement && !currentElement.paused),
                hasError: Boolean(this.lastError)
            }
        }));
    }

    getCurrentElement() {
        if (!this.currentTrackKey) {
            return null;
        }

        return this.tracks[this.currentTrackKey]?.element ?? null;
    }

    getTrackStartTime(trackKey) {
        const startTime = Number(this.tracks[trackKey]?.startTime ?? 0);

        if (!Number.isFinite(startTime) || startTime < 0) {
            return 0;
        }

        return startTime;
    }

    getTrackVolume(trackKey) {
        const trackVolume = Number(this.tracks[trackKey]?.volume ?? 0.12);

        if (!Number.isFinite(trackVolume)) {
            return 0.12;
        }

        return Math.max(0, Math.min(trackVolume, 1));
    }

    getStartFadeVolume(targetVolume) {
        if (targetVolume <= 0) {
            return 0;
        }

        return Math.max(0, Math.min(targetVolume * AUDIO_START_VOLUME_FACTOR, targetVolume));
    }

    getAudioContext() {
        if (this.audioContext) {
            return this.audioContext;
        }

        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextConstructor) {
            return null;
        }

        try {
            this.audioContext = new AudioContextConstructor();
            return this.audioContext;
        } catch {
            return null;
        }
    }

    ensureAudioOutput(audio, initialVolume = 0) {
        if (!audio) {
            return null;
        }

        const existing = this.audioOutputNodes.get(audio);

        if (existing) {
            return existing;
        }

        const context = this.getAudioContext();

        if (!context) {
            return null;
        }

        try {
            const source = context.createMediaElementSource(audio);
            const gain = context.createGain();
            gain.gain.value = this.clampVolume(initialVolume);
            source.connect(gain);
            gain.connect(context.destination);
            const output = { context, gain };
            this.audioOutputNodes.set(audio, output);
            audio.volume = 1;
            return output;
        } catch {
            return null;
        }
    }

    async resumeAudioContext() {
        const context = this.audioContext;

        if (!context || context.state !== 'suspended') {
            return;
        }

        try {
            await context.resume();
        } catch {
        }
    }

    clampVolume(volume) {
        const normalizedVolume = Number(volume);

        if (!Number.isFinite(normalizedVolume)) {
            return 0;
        }

        return Math.max(0, Math.min(normalizedVolume, 1));
    }

    getOutputVolume(audio) {
        const output = this.audioOutputNodes.get(audio);

        if (output) {
            return output.gain.gain.value;
        }

        return this.clampVolume(audio?.volume ?? 0);
    }

    setOutputVolume(audio, volume) {
        const nextVolume = this.clampVolume(volume);
        const output = this.audioOutputNodes.get(audio);

        if (output) {
            output.gain.gain.value = nextVolume;
            return;
        }

        if (audio) {
            audio.volume = nextVolume;
        }
    }

    hasMetadata(audio) {
        return audio.readyState >= HTMLMediaElement.HAVE_METADATA || Number.isFinite(audio.duration);
    }

    clampTime(audio, time) {
        const normalizedTime = Math.max(time, 0);

        if (!this.hasMetadata(audio) || !Number.isFinite(audio.duration) || audio.duration <= 0) {
            return normalizedTime;
        }

        return Math.min(normalizedTime, audio.duration);
    }

    trySeek(audio, time) {
        try {
            audio.currentTime = this.clampTime(audio, time);
            return true;
        } catch {
            return false;
        }
    }

    async waitForSeekToSettle(audio, timeout = 1400) {
        if (!audio?.seeking) {
            return;
        }

        await new Promise((resolve) => {
            let settled = false;

            const finish = () => {
                if (settled) {
                    return;
                }

                settled = true;
                window.clearTimeout(timeoutId);
                audio.removeEventListener('seeked', finish);
                audio.removeEventListener('error', finish);
                resolve();
            };

            const timeoutId = window.setTimeout(finish, timeout);

            audio.addEventListener('seeked', finish, { once: true });
            audio.addEventListener('error', finish, { once: true });
        });
    }

    async waitForFirstAudibleStart(startedAt, delay) {
        const normalizedDelay = Math.max(Number(delay) || 0, 0);
        const elapsed = performance.now() - startedAt;
        const remaining = normalizedDelay - elapsed;

        if (remaining <= 0) {
            return;
        }

        await new Promise((resolve) => {
            window.setTimeout(resolve, remaining);
        });
    }

    async ensureMetadataAndSeek(audio, time, options = {}) {
        const metadataTimeout = Number(options.metadataTimeout ?? 1200);
        const applySeek = () => {
            return this.trySeek(audio, time);
        };

        if (this.hasMetadata(audio)) {
            const applied = applySeek();
            await this.waitForSeekToSettle(audio);
            return applied;
        }

        await new Promise((resolve) => {
            let settled = false;

            const finish = () => {
                if (settled) {
                    return;
                }

                settled = true;
                window.clearTimeout(timeoutId);
                audio.removeEventListener('loadedmetadata', finish);
                audio.removeEventListener('durationchange', finish);
                audio.removeEventListener('error', finish);
                resolve();
            };

            const timeoutId = window.setTimeout(finish, metadataTimeout);

            audio.addEventListener('loadedmetadata', finish, { once: true });
            audio.addEventListener('durationchange', finish, { once: true });
            audio.addEventListener('error', finish, { once: true });
            audio.load();
        });

        const applied = applySeek();

        if (!applied) {
            const retrySeek = () => {
                audio.removeEventListener('loadedmetadata', retrySeek);
                audio.removeEventListener('durationchange', retrySeek);

                applySeek();
            };

            audio.addEventListener('loadedmetadata', retrySeek, { once: true });
            audio.addEventListener('durationchange', retrySeek, { once: true });
        }

        await this.waitForSeekToSettle(audio);
        return applied;
    }

    async unlock() {
        this.readyForPlayback = true;
        this.emitState();
    }

    async startFromGesture(trackKey, options = {}) {
        const startedAt = performance.now();
        const audibleDelayMs = Number(options.audibleDelayMs ?? AUDIO_FIRST_PLAY_AUDIBLE_DELAY_MS);
        const track = this.tracks[trackKey];

        this.readyForPlayback = true;
        this.userPaused = false;
        this.desiredTrackKey = trackKey;

        if (!track) {
            this.emitState();
            return false;
        }

        if (this.currentTrackKey && this.currentTrackKey !== trackKey) {
            await this.fadeOutCurrent();
        }

        const audio = track.element;
        const targetTime = this.getTrackStartTime(trackKey);
        const targetVolume = this.getTrackVolume(trackKey);
        this.ensureAudioOutput(audio, 0);
        await this.resumeAudioContext();
        this.setOutputVolume(audio, 0);
        audio.load();
        const seekPromise = this.ensureMetadataAndSeek(audio, targetTime, { metadataTimeout: 4000 });

        this.currentTrackKey = trackKey;

        try {
            const playPromise = audio.play();

            if (playPromise) {
                await playPromise;
            }

            this.emitState();
            await seekPromise;
            await this.waitForFirstAudibleStart(startedAt, audibleDelayMs);
            await this.fadeVolume(audio, targetVolume, AUDIO_FADE_IN_DURATION_MS);
            this.lastError = null;
            this.emitState();
            return true;
        } catch (error) {
            this.lastError = error;
            this.emitState();
            return false;
        }
    }

    async setContext(trackKey) {
        this.desiredTrackKey = trackKey;

        if (!this.readyForPlayback || this.userPaused) {
            this.emitState();
            return false;
        }

        return this.playTrack(trackKey);
    }

    async playTrack(trackKey) {
        const track = this.tracks[trackKey];

        if (!track) {
            return false;
        }

        const currentElement = this.getCurrentElement();

        if (this.currentTrackKey === trackKey && currentElement && !currentElement.paused) {
            this.emitState();
            return true;
        }

        await this.fadeOutCurrent();

        const nextElement = track.element;
        const targetVolume = this.getTrackVolume(trackKey);
        const startVolume = this.getStartFadeVolume(targetVolume);
        this.ensureAudioOutput(nextElement, startVolume);
        await this.resumeAudioContext();
        this.setOutputVolume(nextElement, startVolume);
        await this.ensureMetadataAndSeek(nextElement, this.getTrackStartTime(trackKey));

        const played = await this.safePlay(nextElement);

        if (!played) {
            this.emitState();
            return false;
        }

        this.currentTrackKey = trackKey;
        await this.fadeVolume(nextElement, targetVolume, AUDIO_FADE_IN_DURATION_MS);
        this.emitState();
        return true;
    }

    async fadeOutCurrent() {
        const currentElement = this.getCurrentElement();

        if (!currentElement) {
            return;
        }

        await this.fadeVolume(currentElement, 0, 240);
        currentElement.pause();
        currentElement.currentTime = 0;
    }

    async fadeVolume(audio, targetVolume, duration) {
        if (!audio) {
            return;
        }

        window.cancelAnimationFrame(this.fadeFrameId);
        if (this.fadeResolve) {
            this.fadeResolve();
            this.fadeResolve = null;
        }

        await new Promise((resolve) => {
            this.fadeResolve = resolve;
            const startTime = performance.now();
            const startVolume = this.getOutputVolume(audio);

            const step = (now) => {
                const progress = Math.min((now - startTime) / duration, 1);
                this.setOutputVolume(audio, startVolume + (targetVolume - startVolume) * progress);

                if (progress < 1) {
                    this.fadeFrameId = window.requestAnimationFrame(step);
                } else {
                    this.fadeFrameId = null;
                    this.fadeResolve = null;
                    resolve();
                }
            };

            this.fadeFrameId = window.requestAnimationFrame(step);
        });
    }

    async safePlay(audio) {
        try {
            const playPromise = audio.play();

            if (playPromise) {
                await playPromise;
            }

            this.lastError = null;
            return true;
        } catch (error) {
            this.lastError = error;
            return false;
        }
    }

    pause() {
        this.userPaused = true;
        const currentElement = this.getCurrentElement();

        if (currentElement) {
            currentElement.pause();
        }

        this.emitState();
    }

    async pauseForSystem({ fadeDuration = AUDIO_AUTO_PAUSE_FADE_MS } = {}) {
        const currentElement = this.getCurrentElement();

        if (!currentElement || currentElement.paused) {
            this.emitState();
            return;
        }

        const normalizedDuration = Math.max(Number(fadeDuration) || 0, 0);

        if (normalizedDuration > 0) {
            await this.fadeVolume(currentElement, 0, normalizedDuration);
        } else {
            window.cancelAnimationFrame(this.fadeFrameId);
            if (this.fadeResolve) {
                this.fadeResolve();
                this.fadeResolve = null;
            }
            this.setOutputVolume(currentElement, 0);
        }

        currentElement.pause();
        this.emitState();
    }

    async resume() {
        this.userPaused = false;

        if (!this.readyForPlayback || !this.desiredTrackKey) {
            this.emitState();
            return false;
        }

        if (this.currentTrackKey !== this.desiredTrackKey) {
            return this.playTrack(this.desiredTrackKey);
        }

        const currentElement = this.getCurrentElement();

        if (!currentElement) {
            this.emitState();
            return false;
        }

        const targetVolume = this.getTrackVolume(this.currentTrackKey);
        const startVolume = this.getStartFadeVolume(targetVolume);
        this.ensureAudioOutput(currentElement, startVolume);
        await this.resumeAudioContext();
        this.setOutputVolume(currentElement, startVolume);
        const played = await this.safePlay(currentElement);

        if (!played) {
            this.emitState();
            return false;
        }

        await this.fadeVolume(currentElement, targetVolume, AUDIO_FADE_IN_DURATION_MS);
        this.emitState();
        return true;
    }

    toggle() {
        const currentElement = this.getCurrentElement();

        if (this.userPaused || !currentElement || currentElement.paused) {
            return this.resume();
        }

        this.pause();
        return Promise.resolve(false);
    }
}
