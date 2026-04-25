import { describe, expect, it } from 'vitest';
import { calculateCountdown } from '../../assets/js/countdown.js';

describe('calculateCountdown', () => {
  it('calculates remaining days/hours/minutes/seconds', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const target = now + (2 * 86400000) + (3 * 3600000) + (4 * 60000) + (5 * 1000);

    const result = calculateCountdown(target, now);

    expect(result).toEqual({
      isFinished: false,
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5
    });
  });

  it('marks countdown finished at or after target date', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const target = now;

    expect(calculateCountdown(target, now).isFinished).toBe(true);
    expect(calculateCountdown(target, now + 1000).isFinished).toBe(true);
  });
});