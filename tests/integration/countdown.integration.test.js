import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Countdown } from '../../assets/js/countdown.js';

function mountCountdownDom() {
  document.body.innerHTML = `
    <div id="countdownWrap">
      <span id="cd-days"></span>
      <span id="cd-hours"></span>
      <span id="cd-mins"></span>
      <span id="cd-secs"></span>
    </div>
  `;
}

describe('Countdown integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mountCountdownDom();
  });

  it('updates countdown numbers based on current time', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const target = new Date(now + 86400000 + 7200000 + 180000 + 4000).toISOString();
    const countdown = new Countdown(target, { countdown: { format: 'two-digits' } });

    countdown.update();

    expect(document.getElementById('cd-days').textContent).toBe('01');
    expect(document.getElementById('cd-hours').textContent).toBe('02');
    expect(document.getElementById('cd-mins').textContent).toBe('03');
    expect(document.getElementById('cd-secs').textContent).toBe('04');
  });

  it('displays finished state when date is reached', () => {
    const now = Date.UTC(2026, 0, 2, 0, 0, 0);
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const target = new Date(now - 1000).toISOString();
    const countdown = new Countdown(target, { texts: { countdownFinished: 'Chegou o dia!' } });

    countdown.update();

    expect(document.getElementById('cd-days').textContent).toBe('00');
    expect(document.querySelector('.countdown-finished')?.textContent).toBe('Chegou o dia!');
  });
});