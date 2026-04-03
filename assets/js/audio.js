import { AUDIO_TRACKS } from '../config/audio.js';

export class AudioController extends EventTarget {
    constructor(trackConfig = AUDIO_TRACKS) {
        super();
        this.desiredTrackKey = null;
        this.currentTrackKey = null;
        this.readyForPlayback = false;
        this.userPaused = false;
        this.lastError = null;
        this.fadeFrameId = null;
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
        const audio = new Audio(src);
        audio.loop = true;
        audio.preload = 'none';
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

    async ensureMetadataAndSeek(audio, time) {
        const applySeek = () => {
            audio.currentTime = this.clampTime(audio, time);
        };

        if (this.hasMetadata(audio)) {
            applySeek();
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
                audio.removeEventListener('loadedmetadata', finish);
                audio.removeEventListener('durationchange', finish);
                audio.removeEventListener('error', finish);
                resolve();
            };

            const timeoutId = window.setTimeout(finish, 1200);

            audio.addEventListener('loadedmetadata', finish, { once: true });
            audio.addEventListener('durationchange', finish, { once: true });
            audio.addEventListener('error', finish, { once: true });
            audio.load();
        });

        try {
            applySeek();
        } catch {
            const retrySeek = () => {
                audio.removeEventListener('loadedmetadata', retrySeek);
                audio.removeEventListener('durationchange', retrySeek);

                try {
                    applySeek();
                } catch {
                }
            };

            audio.addEventListener('loadedmetadata', retrySeek, { once: true });
            audio.addEventListener('durationchange', retrySeek, { once: true });
        }
    }

    async unlock() {
        this.readyForPlayback = true;
        this.emitState();
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
        nextElement.volume = 0;
        await this.ensureMetadataAndSeek(nextElement, this.getTrackStartTime(trackKey));

        const played = await this.safePlay(nextElement);

        if (!played) {
            this.emitState();
            return false;
        }

        this.currentTrackKey = trackKey;
        await this.fadeVolume(nextElement, track.volume ?? 0.12, 420);
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

        await new Promise((resolve) => {
            const startTime = performance.now();
            const startVolume = audio.volume;

            const step = (now) => {
                const progress = Math.min((now - startTime) / duration, 1);
                audio.volume = startVolume + (targetVolume - startVolume) * progress;

                if (progress < 1) {
                    this.fadeFrameId = window.requestAnimationFrame(step);
                } else {
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

        currentElement.volume = 0;
        const played = await this.safePlay(currentElement);

        if (!played) {
            this.emitState();
            return false;
        }

        await this.fadeVolume(currentElement, this.tracks[this.currentTrackKey].volume ?? 0.12, 320);
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