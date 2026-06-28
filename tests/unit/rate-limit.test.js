import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeRateLimit, getClientIp, resetRateLimitForTests } from '../../api/_lib/rate-limit.js';

describe('rate limit helper', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    resetRateLimitForTests();
    vi.spyOn(Date, 'now').mockReturnValue(10_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses memory fallback and blocks after the configured limit', async () => {
    const first = await consumeRateLimit({
      scope: 'test-submissions',
      identifier: '203.0.113.10',
      max: 2,
      windowMs: 60_000,
    });
    const second = await consumeRateLimit({
      scope: 'test-submissions',
      identifier: '203.0.113.10',
      max: 2,
      windowMs: 60_000,
    });
    const third = await consumeRateLimit({
      scope: 'test-submissions',
      identifier: '203.0.113.10',
      max: 2,
      windowMs: 60_000,
    });

    expect(first).toMatchObject({ allowed: true, remaining: 1, store: 'memory' });
    expect(second).toMatchObject({ allowed: true, remaining: 0, store: 'memory' });
    expect(third).toMatchObject({ allowed: false, retryAfterSec: 50, store: 'memory' });
  });

  it('uses Upstash REST when credentials are configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com/';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'rest-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 1 }, { result: 1 }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await consumeRateLimit({
      scope: 'submissions',
      identifier: '203.0.113.10',
      max: 10,
      windowMs: 60_000,
    });

    expect(result).toMatchObject({ allowed: true, remaining: 9, store: 'upstash' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://redis.example.com/pipeline',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer rest-token',
          'Content-Type': 'application/json',
        }),
      })
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body[0][0]).toBe('INCR');
    expect(body[1][0]).toBe('PEXPIRE');
  });

  it('keeps repeated skip keys inside the grace window from consuming the limit', async () => {
    const first = await consumeRateLimit({
      scope: 'check-slug',
      identifier: '203.0.113.10',
      max: 1,
      windowMs: 60_000,
      skipKey: 'ana-leo-2026',
      skipWindowMs: 5_000,
    });
    const second = await consumeRateLimit({
      scope: 'check-slug',
      identifier: '203.0.113.10',
      max: 1,
      windowMs: 60_000,
      skipKey: 'ana-leo-2026',
      skipWindowMs: 5_000,
    });
    const third = await consumeRateLimit({
      scope: 'check-slug',
      identifier: '203.0.113.10',
      max: 1,
      windowMs: 60_000,
      skipKey: 'outro-casal-2026',
      skipWindowMs: 5_000,
    });

    expect(first).toMatchObject({ allowed: true, remaining: 0 });
    expect(second).toMatchObject({ allowed: true, skipped: true });
    expect(third).toMatchObject({ allowed: false });
  });

  it('extracts the first forwarded IP from request headers', () => {
    expect(getClientIp({
      headers: {
        'x-forwarded-for': '203.0.113.10, 198.51.100.7',
      },
    })).toBe('203.0.113.10');
  });
});
