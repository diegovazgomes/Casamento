/**
 * Endpoint: GET/POST/PATCH/DELETE /api/dashboard/guest-groups
 * CRUD de grupos de convidados (guest_tokens)
 *
 * Todos os endpoints requerem: Authorization: Bearer <token>
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  // Verificar token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!verifyDashboardToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Rotear para handlers específicos
  switch (req.method) {
    case 'GET':
      return handleGetGroups(req, res);
    case 'POST':
      return handleCreateGroup(req, res);
    case 'PATCH':
      return handleUpdateGroup(req, res);
    case 'DELETE':
      return handleDeleteGroup(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/dashboard/guest-groups?eventId=...
 * Listar todos os grupos de um evento
 */
async function handleGetGroups(req, res) {
  const { eventId } = req.query;
  const supabase = getSupabaseClient();

  if (!eventId) {
    return res.status(400).json({ error: 'eventId required' });
  }

  try {
    // Buscar tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('guest_tokens')
      .select('id, token, group_name, max_confirmations, phone, notes, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (tokensError) throw tokensError;

    // Para cada token, buscar contagem de confirmações
    const groupsWithCounts = await Promise.all(
      tokens.map(async (token) => {
        const { count: confirmationCount } = await supabase
          .from('rsvp_confirmations')
          .select('id', { count: 'exact', head: true })
          .eq('token_id', token.id)
          .eq('attendance', 'yes');

        return {
          ...token,
          confirmationCount: confirmationCount || 0,
          slotsAvailable: token.max_confirmations - (confirmationCount || 0),
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: groupsWithCounts,
      count: groupsWithCounts.length,
    });
  } catch (error) {
    console.error('[guest-groups GET]', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/dashboard/guest-groups
 * Criar novo grupo
 *
 * Body:
 *   { "eventId": "...", "groupName": "...", "maxConfirmations": 2, "phone": "...", "notes": "..." }
 */
async function handleCreateGroup(req, res) {
  const { eventId, groupName, maxConfirmations, phone, notes } = req.body || {};
  const supabase = getSupabaseClient();

  if (!eventId || !groupName || !maxConfirmations) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (maxConfirmations < 1) {
    return res.status(400).json({ error: 'maxConfirmations must be >= 1' });
  }

  try {
    // Gerar token único
    const guestToken = generateGuestToken();

    const { data, error } = await supabase
      .from('guest_tokens')
      .insert({
        event_id: eventId,
        token: guestToken,
        group_name: groupName,
        max_confirmations: maxConfirmations,
        phone: phone || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data: {
        ...data,
        confirmationCount: 0,
        slotsAvailable: data.max_confirmations,
        inviteLink: `${getOrigin(req)}/index.html?g=${data.token}`,
      },
    });
  } catch (error) {
    console.error('[guest-groups POST]', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/dashboard/guest-groups/:tokenId
 * Editar grupo (principalmente max_confirmations)
 *
 * Body:
 *   { "maxConfirmations": 3, "groupName": "...", "phone": "...", "notes": "..." }
 */
async function handleUpdateGroup(req, res) {
  const { id: tokenId } = req.query;
  const { maxConfirmations, groupName, phone, notes } = req.body || {};
  const supabase = getSupabaseClient();

  if (!tokenId) {
    return res.status(400).json({ error: 'tokenId required' });
  }

  if (maxConfirmations !== undefined && maxConfirmations < 1) {
    return res.status(400).json({ error: 'maxConfirmations must be >= 1' });
  }

  try {
    const updateData = {};
    if (maxConfirmations !== undefined) updateData.max_confirmations = maxConfirmations;
    if (groupName !== undefined) updateData.group_name = groupName;
    if (phone !== undefined) updateData.phone = phone;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('guest_tokens')
      .update(updateData)
      .eq('id', tokenId)
      .select()
      .single();

    if (error) throw error;

    // Buscar contagem de confirmações
    const { count: confirmationCount } = await supabase
      .from('rsvp_confirmations')
      .select('id', { count: 'exact', head: true })
      .eq('token_id', tokenId)
      .eq('attendance', 'yes');

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        confirmationCount: confirmationCount || 0,
        slotsAvailable: data.max_confirmations - (confirmationCount || 0),
      },
    });
  } catch (error) {
    console.error('[guest-groups PATCH]', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/dashboard/guest-groups/:tokenId
 * Deletar grupo (e cascadear para views/reminders)
 */
async function handleDeleteGroup(req, res) {
  const { id: tokenId } = req.query;
  const supabase = getSupabaseClient();

  if (!tokenId) {
    return res.status(400).json({ error: 'tokenId required' });
  }

  try {
    // Supabase com ON DELETE CASCADE cuida das tabelas relacionadas
    const { error } = await supabase
      .from('guest_tokens')
      .delete()
      .eq('id', tokenId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    console.error('[guest-groups DELETE]', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Gerar um token único para um grupo
 * Formato: evento-slug_randomstring
 */
function generateGuestToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Obter origem (protocol + host) da request
 */
function getOrigin(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost:3000';
  return `${protocol}://${host}`;
}
