/**
 * Endpoint: POST /api/dashboard/auth
 * Autenticação simples com senha para o dashboard do casal
 *
 * Request:
 *   { "password": "senha-do-casal" }
 *
 * Response (200):
 *   { "token": "uuid-token", "expiresAt": 1234567890000 }
 *
 * Response (401/403):
 *   { "error": "Invalid credentials" }
 */

import { createHmac } from 'crypto';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const TOKEN_SECRET_FALLBACK = 'dashboard-auth-fallback-secret-change-me';

export default function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const expectedPassword = process.env.DASHBOARD_PASSWORD;

  if (!expectedPassword) {
    console.error('[dashboard/auth] DASHBOARD_PASSWORD not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  // Validação simples de senha
  if (password !== expectedPassword) {
    return res.status(403).json({ error: 'Invalid credentials' });
  }

  // Gerar token stateless assinado (funciona em ambiente serverless)
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const token = generateSignedToken(expiresAt);

  return res.status(200).json({
    token,
    expiresAt,
    expiresIn: '1h',
  });
}

/**
 * Verificar se um token é válido
 * Chamado por outros endpoints do dashboard
 */
export function verifyDashboardToken(token) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadEncoded, signature] = parts;
  const expectedSignature = signPayload(payloadEncoded);
  if (signature !== expectedSignature) return false;

  try {
    const payloadJson = Buffer.from(payloadEncoded, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    if (!payload?.exp || Number.isNaN(payload.exp)) return false;
    return Date.now() <= payload.exp;
  } catch {
    return false;
  }
}

function generateSignedToken(expiresAt) {
  const payload = {
    exp: expiresAt,
    iat: Date.now(),
  };

  const payloadEncoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = signPayload(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

function signPayload(payloadEncoded) {
  const secret = process.env.DASHBOARD_AUTH_SECRET || process.env.DASHBOARD_PASSWORD || TOKEN_SECRET_FALLBACK;
  return createHmac('sha256', secret).update(payloadEncoded).digest('base64url');
}

/**
 * Middleware para verificar token em outros endpoints
 */
export function requireDashboardAuth(handler) {
  return (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!verifyDashboardToken(token)) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Token válido, continuar
    return handler(req, res);
  };
}
