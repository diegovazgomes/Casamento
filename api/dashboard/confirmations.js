/**
 * Endpoint: GET /api/dashboard/confirmations
 * GET /api/dashboard/confirmations/export
 *
 * Listar confirmações filtradas e exportar como CSV
 * Requer: Authorization: Bearer <token>
 */

import { createClient } from '@supabase/supabase-js';
import { verifyDashboardToken } from './auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  // Verificar token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!verifyDashboardToken(token)) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rotear para export ou listar normalmente
  if (req.url.includes('/export')) {
    return handleExportCsv(req, res);
  }

  return handleListConfirmations(req, res);
}

/**
 * GET /api/dashboard/confirmations?eventId=...&status=...&groupId=...&page=1
 * Listar confirmações com filtros e paginação
 *
 * Query params:
 *   - eventId (required)
 *   - status: 'yes' | 'no' | 'pending' (opcional)
 *   - groupId: token_id uuid (opcional)
 *   - page: 1-based (default: 1)
 *   - pageSize: default 50
 */
async function handleListConfirmations(req, res) {
  const { eventId, status, groupId, page = '1', pageSize = '50' } = req.query;
  const supabase = getSupabaseClient();

  if (!eventId) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'eventId required' });
  }

  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, parseInt(pageSize, 10) || 50);
    const offset = (pageNum - 1) * size;

    let query = supabase
      .from('rsvp_confirmations')
      .select(
        `
        id,
        name,
        phone,
        attendance,
        created_at,
        token_id,
        guest_tokens:token_id(group_name)
        `,
        { count: 'exact' }
      )
      .eq('event_id', eventId);

    // Filtrar por status
    if (status && status !== 'pending') {
      if (status === 'yes' || status === 'no') {
        query = query.eq('attendance', status);
      }
    } else if (status === 'pending') {
      query = query.not('attendance', 'in', '("yes","no")');
    }

    // Filtrar por grupo
    if (groupId) {
      query = query.eq('token_id', groupId);
    }

    // Ordenação e paginação
    const { data: confirmations, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + size - 1);

    if (error) throw error;

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      data: confirmations.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        status: c.attendance,
        confirmedAt: c.created_at,
        groupName: c.guest_tokens?.group_name || 'N/A',
        groupId: c.token_id,
      })),
      pagination: {
        page: pageNum,
        pageSize: size,
        total: count,
        totalPages: Math.ceil(count / size),
      },
    });
  } catch (error) {
    console.error('[confirmations GET]', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/dashboard/confirmations/export?eventId=...&status=...&groupId=...
 * Exportar confirmações como CSV
 */
async function handleExportCsv(req, res) {
  const { eventId, status, groupId } = req.query;
  const supabase = getSupabaseClient();

  if (!eventId) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'eventId required' });
  }

  try {
    let query = supabase
      .from('rsvp_confirmations')
      .select(
        `
        id,
        name,
        phone,
        attendance,
        created_at,
        token_id,
        guest_tokens:token_id(group_name)
        `
      )
      .eq('event_id', eventId);

    // Aplicar filtros (mesma lógica de listagem)
    if (status && status !== 'pending') {
      if (status === 'yes' || status === 'no') {
        query = query.eq('attendance', status);
      }
    } else if (status === 'pending') {
      query = query.not('attendance', 'in', '("yes","no")');
    }

    if (groupId) {
      query = query.eq('token_id', groupId);
    }

    const { data: confirmations, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;

    // Construir CSV
    const csv = confirmationsToCSV(confirmations);

    // Retornar como download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="confirmacoes-${eventId}-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('[confirmations EXPORT]', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Converter array de confirmações para CSV
 */
function confirmationsToCSV(confirmations) {
  const headers = ['Nome', 'Telefone', 'Status', 'Grupo', 'Data Confirmação'];
  const rows = confirmations.map((c) => [
    `"${(c.name || '').replace(/"/g, '""')}"`, // Escapar aspas
    `"${(c.phone || '').replace(/"/g, '""')}"`,
    statusToPortuguese(c.attendance),
    `"${(c.guest_tokens?.group_name || 'N/A').replace(/"/g, '""')}"`,
    new Date(c.created_at).toLocaleString('pt-BR'),
  ]);

  // Combinar headers + rows com quebra de linha
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  // BOM para encoding UTF-8 (evita problemas no Excel)
  return '\uFEFF' + csvContent;
}

/**
 * Converter código de status para português
 */
function statusToPortuguese(status) {
  const map = {
    yes: 'Confirmado',
    no: 'Recusado',
    message: 'Mensagem',
    song: 'Música',
  };
  return map[status] || status;
}
