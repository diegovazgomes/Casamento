import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioController } from '../../assets/js/audio.js';

class FakeAudio extends EventTarget {
  constructor(src) {
    super();
    this.src = src;
    this.loop = false;
    this.preload = '';
    this.volume = 1;
    this.readyState = 0;
    this.duration = Number.NaN;
    this.paused = true;
    this.seeking = false;
    this.loadCalls = 0;
    this.playCalls = [];
    this._currentTime = 0;
  }

  get currentTime() {
    return this._currentTime;
  }

  set currentTime(value) {
    if (this.readyState < 1) {
      throw new Error('metadata not loaded');
    }

    this._currentTime = value;
    this.seeking = true;
  }

  load() {
    this.loadCalls += 1;
  }

  play() {
    this.paused = false;
    this.playCalls.push({
      currentTime: this.currentTime,
      volume: this.volume,
    });
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

describe('AudioController', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the first play muted until delayed metadata allows seeking to startTime', async () => {
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('HTMLMediaElement', { HAVE_METADATA: 1 });
    vi.spyOn(AudioController.prototype, 'fadeVolume').mockImplementation(async (audio, targetVolume) => {
      audio.volume = targetVolume;
    });

    const controller = new AudioController({
      main: {
        src: 'assets/audio/main-theme.mp3',
        volume: 0.4,
        startTime: 42,
      },
    });
    const audio = controller.tracks.main.element;

    const started = controller.startFromGesture('main');
    await Promise.resolve();

    expect(audio.playCalls).toEqual([{ currentTime: 0, volume: 0 }]);

    audio.readyState = 1;
    audio.duration = 120;
    audio.dispatchEvent(new Event('loadedmetadata'));
    await Promise.resolve();

    audio.seeking = false;
    audio.dispatchEvent(new Event('seeked'));

    await started;

    expect(audio.currentTime).toBe(42);
    expect(audio.volume).toBe(0.4);
  });
});
