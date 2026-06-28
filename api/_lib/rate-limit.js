const DEFAULT_WINDOW_MS = 60_000;
const memoryWindows = new Map();
const memorySkips = new Map();

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
}

export function getClientIp(req) {
  const headers = req?.headers || {};
  const forwarded = normalizeHeaderValue(headers['x-forwarded-for'] || headers['X-Forwarded-For']);

  if (forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = normalizeHeaderValue(headers['x-real-ip'] || headers['X-Real-IP']);
  if (realIp.trim()) {
    return realIp.trim();
  }

  return req?.socket?.remoteAddress || 'unknown';
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

  if (!url || !token || typeof fetch !== 'function') {
    return null;
  }

  return {
    url: url.replace(/\/+$/, ''),
    token,
  };
}

function sanitizeKeyPart(value) {
  return String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:._-]+/g, '_')
    .slice(0, 180) || 'unknown';
}

async function runUpstashPipeline(commands) {
  const config = getUpstashConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit request failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Upstash rate limit response format is invalid');
  }

  const firstError = payload.find((entry) => entry?.error);
  if (firstError) {
    throw new Error(String(firstError.error));
  }

  return payload;
}

async function consumeUpstashLimit({ scope, identifier, max, windowMs, skipKey, skipWindowMs, now }) {
  const safeScope = sanitizeKeyPart(scope);
  const safeIdentifier = sanitizeKeyPart(identifier);
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const retryAfterSec = Math.max(1, Math.ceil((bucketStart + windowMs - now) / 1000));

  if (skipKey && skipWindowMs > 0) {
    const safeSkipKey = sanitizeKeyPart(skipKey);
    const skipResult = await runUpstashPipeline([
      ['SET', `rl:${safeScope}:skip:${safeIdentifier}:${safeSkipKey}`, '1', 'PX', skipWindowMs, 'NX'],
    ]);

    if (!skipResult) {
      return null;
    }

    if (skipResult[0]?.result === null) {
      return {
        allowed: true,
        retryAfterSec: 0,
        limit: max,
        remaining: max,
        store: 'upstash',
        skipped: true,
      };
    }
  }

  const key = `rl:${safeScope}:${safeIdentifier}:${bucketStart}`;
  const result = await runUpstashPipeline([
    ['INCR', key],
    ['PEXPIRE', key, windowMs * 2],
  ]);

  if (!result) {
    return null;
  }

  const count = Number(result[0]?.result || 0);
  const remaining = Math.max(0, max - count);

  return {
    allowed: count <= max,
    retryAfterSec: count <= max ? 0 : retryAfterSec,
    limit: max,
    remaining,
    store: 'upstash',
  };
}

function cleanExpiredMemory(now) {
  for (const [key, entry] of memoryWindows.entries()) {
    if (!entry || entry.expiresAt <= now) {
      memoryWindows.delete(key);
    }
  }

  for (const [key, expiresAt] of memorySkips.entries()) {
    if (expiresAt <= now) {
      memorySkips.delete(key);
    }
  }
}

function consumeMemoryLimit({ scope, identifier, max, windowMs, skipKey, skipWindowMs, now }) {
  cleanExpiredMemory(now);

  const safeScope = sanitizeKeyPart(scope);
  const safeIdentifier = sanitizeKeyPart(identifier);

  if (skipKey && skipWindowMs > 0) {
    const safeSkipKey = sanitizeKeyPart(skipKey);
    const skipMapKey = `${safeScope}:skip:${safeIdentifier}:${safeSkipKey}`;
    const skipExpiresAt = memorySkips.get(skipMapKey) || 0;

    if (skipExpiresAt > now) {
      return {
        allowed: true,
        retryAfterSec: 0,
        limit: max,
        remaining: max,
        store: 'memory',
        skipped: true,
      };
    }

    memorySkips.set(skipMapKey, now + skipWindowMs);
  }

  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const key = `${safeScope}:${safeIdentifier}:${bucketStart}`;
  const expiresAt = bucketStart + windowMs;
  const current = memoryWindows.get(key) || { count: 0, expiresAt };
  const count = current.count + 1;
  memoryWindows.set(key, { count, expiresAt });

  return {
    allowed: count <= max,
    retryAfterSec: count <= max ? 0 : Math.max(1, Math.ceil((expiresAt - now) / 1000)),
    limit: max,
    remaining: Math.max(0, max - count),
    store: 'memory',
  };
}

export async function consumeRateLimit(options) {
  const now = Date.now();
  const normalized = {
    scope: options?.scope || 'default',
    identifier: options?.identifier || 'unknown',
    max: Number.isFinite(options?.max) ? options.max : 10,
    windowMs: Number.isFinite(options?.windowMs) ? options.windowMs : DEFAULT_WINDOW_MS,
    skipKey: options?.skipKey || '',
    skipWindowMs: Number.isFinite(options?.skipWindowMs) ? options.skipWindowMs : 0,
    now,
  };

  try {
    const upstashResult = await consumeUpstashLimit(normalized);
    if (upstashResult) {
      return upstashResult;
    }
  } catch (error) {
    console.warn('[rate-limit] Upstash indisponivel; usando fallback em memoria.', error?.message || error);
  }

  return consumeMemoryLimit(normalized);
}

export function resetRateLimitForTests() {
  memoryWindows.clear();
  memorySkips.clear();
}
