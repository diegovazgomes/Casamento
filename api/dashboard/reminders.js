/**
 * Endpoint: POST /api/dashboard/reminders/send-whatsapp
 *
 * Enviar lembrete via WhatsApp para um grupo de convidados
 * Integra com Twilio (opcional) ou apenas loga em reminder_logs
 *
 * Requer: Authorization: Bearer <token>
 */

import { createClient } from '@supabase/supabase-js';
import {
  authenticateDashboardRequest,
  findOwnedGuestToken,
  requireOwnedEvent,
} from '../_lib/dashboard-auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return handleSendReminder(req, res);
}

/**
 * POST /api/dashboard/reminders/send-whatsapp
 *
 * Body:
 *   {
 *     "eventId": "siannah-diego-2026",
 *     "tokenId": "uuid-token",
 *     "message": "Olá! Ainda não recebemos sua confirmação...",
 *     "sendVia": "whatsapp" | "log"
 *   }
 */
async function handleSendReminder(req, res) {
  const { eventId, tokenId, message, sendVia = 'whatsapp' } = req.body || {};

  if (!eventId || !tokenId || !message) {
    return res.status(400).json({
      error: 'Missing required fields: eventId, tokenId, message',
    });
  }

  try {
    const auth = await authenticateDashboardRequest(req);

    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const ownedEvent = await requireOwnedEvent(req, {
      selectClause: 'id,slug,user_id,config',
    });

    if (!ownedEvent.ok) {
      return res.status(ownedEvent.status).json({ error: ownedEvent.error });
    }

    const ownedToken = await findOwnedGuestToken(auth.supabase, auth.user.id, tokenId, 'id,event_id,group_name,phone,token');

    if (!ownedToken || ownedToken.event_id !== ownedEvent.event.id) {
      return res.status(404).json({ error: 'Guest group not found' });
    }

    const supabase = auth.supabase;
    // 1. Buscar token e dados do grupo
    if (!ownedToken.phone) {
      return res.status(400).json({ error: 'Phone number not configured for this group' });
    }

    // 2. Enviar via Twilio (se configurado) ou simular envio
    let sendStatus = 'pending';
    let errorMessage = null;

    if (sendVia === 'whatsapp' && process.env.TWILIO_ACCOUNT_SID) {
      try {
        sendStatus = await sendViaWhatsApp(
          ownedToken.phone,
          message,
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
          process.env.TWILIO_PHONE_FROM
        );
      } catch (twilioError) {
        sendStatus = 'failed';
        errorMessage = twilioError.message;
        console.error('[reminders] Twilio error:', twilioError);
      }
    } else {
      // Se Twilio não está configurado, apenas logar como enviado
      console.log('[reminders] Twilio not configured, logging reminder only');
      sendStatus = 'sent';
    }

    // 3. Registrar envio em reminder_logs
    const { data: log, error: logError } = await supabase
      .from('reminder_logs')
      .insert({
        event_id: eventId,
        token_id: tokenId,
        phone: ownedToken.phone,
        message,
        status: sendStatus,
        error_message: errorMessage,
        sent_by: 'dashboard',
      })
      .select()
      .single();

    if (logError) {
      console.error('[reminders] Log error:', logError);
      // Não falhar se log falhar — apenas avisar
    }

    return res.status(200).json({
      success: true,
      message: `Reminder ${sendStatus}`,
      data: {
        logId: log?.id,
        status: sendStatus,
        groupName: ownedToken.group_name,
        phone: maskPhone(ownedToken.phone),
        errorMessage,
      },
    });
  } catch (error) {
    console.error('[reminders POST]', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Enviar mensagem via Twilio WhatsApp
 * Retorna 'sent' ou 'failed'
 */
async function sendViaWhatsApp(phone, message, accountSid, authToken, phoneFrom) {
  // Validação básica
  if (!phone || !accountSid || !authToken || !phoneFrom) {
    throw new Error('Missing Twilio configuration');
  }

  // Normalize phone: remover caracteres especiais e adicionar +55 se necessário
  let normalizedPhone = phone.replace(/\D/g, '');
  if (!normalizedPhone.startsWith('55')) {
    normalizedPhone = '55' + normalizedPhone;
  }

  try {
    // Fazer requisição para Twilio Messages API
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: 'whatsapp:' + phoneFrom,
        To: 'whatsapp:+' + normalizedPhone,
        Body: message,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Twilio API error');
    }

    console.log('[reminders] Message sent:', data.sid);
    return 'sent';
  } catch (error) {
    console.error('[reminders] Twilio send error:', error);
    throw error;
  }
}

/**
 * Mascarar número de telefone para exibição
 */
function maskPhone(phone) {
  if (!phone) return 'N/A';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return digits.slice(0, -4).replace(/./g, '*') + digits.slice(-4);
}
