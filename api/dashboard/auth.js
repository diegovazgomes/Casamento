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

import { randomUUID } from 'crypto';

// Simples armazenamento em memória de tokens com TTL
// Em produção, isso poderia ser Redis ou Supabase com check RLS
const tokenStore = new Map();
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

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

  // Gerar token com TTL
  const token = randomUUID();
  const expiresAt = Date.now() + TOKEN_TTL_MS;

  tokenStore.set(token, {
    expiresAt,
    createdAt: Date.now(),
  });

  // Limpar tokens expirados periodicamente
  cleanupExpiredTokens();

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
  if (!token) return false;

  const tokenData = tokenStore.get(token);
  if (!tokenData) return false;

  const isExpired = Date.now() > tokenData.expiresAt;
  if (isExpired) {
    tokenStore.delete(token);
    return false;
  }

  return true;
}

/**
 * Limpar tokens expirados da memória
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(token);
    }
  }
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
