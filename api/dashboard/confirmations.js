/**
 * Endpoint: GET /api/dashboard/confirmations
 * GET /api/dashboard/confirmations/export
 *
 * Listar confirmações filtradas e exportar como CSV
 * Requer: Authorization: Bearer <token>
 */

import { createClient } from '@supabase/supabase-js';
import { requireOwnedEvent } from '../_lib/dashboard-auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://devazi.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://devazi.app');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rotear para export ou listar normalmente
  if (req.url.includes('/export')) {
    return handleExportCsv(req, res);
  }

  if (req.query?.mode === 'audience') {
    return handleAudience(req, res);
  }

  return handleListConfirmations(req, res);
}

const AUDIENCE_MAX_RAW_ROWS = 5000;

function toSafeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAudienceDuration(value) {
  const duration = toSafeInteger(value, 0);
  return duration > 0 ? duration : 0;
}

function normalizeAudiencePagePath(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return '/';
  }

  try {
    const normalizedUrl = new URL(rawValue, 'https://example.com');
    const path = `${normalizedUrl.pathname || '/'}${normalizedUrl.hash || ''}`;
    return path || '/';
  } catch {
    const [pathWithoutQuery] = rawValue.split('?');
    return pathWithoutQuery || '/';
  }
}

function titleCaseLabel(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function buildAudiencePageLabel(pagePath, eventSlug = '') {
  const normalizedPath = normalizeAudiencePagePath(pagePath);
  const [pathWithoutHash] = normalizedPath.split('#');
  const cleanPath = String(pathWithoutHash || '/').trim();
  const cleanSlug = String(eventSlug || '').trim();
  const slugPath = cleanSlug ? `/${cleanSlug}` : '';
  const segments = cleanPath.split('/').filter(Boolean);
  const lastSegment = segments.at(-1) || '';
  const normalizedLeaf = lastSegment.toLowerCase().replace(/\.html$/, '');

  if (!cleanPath || cleanPath === '/' || cleanPath === '/index.html' || cleanPath === slugPath) {
    return 'Página inicial';
  }

  const knownLabels = {
    confirm: 'Confirmação de presença',
    faq: 'Perguntas frequentes',
    historia: 'Nossa história',
    hospedagem: 'Hospedagem',
    landing: 'Tela de abertura',
    mensagem: 'Mensagem ao casal',
    musica: 'Sugestão de música',
    presente: 'Presentes',
    privacy: 'Privacidade',
    terms: 'Termos',
    traje: 'Traje',
  };

  if (knownLabels[normalizedLeaf]) {
    return knownLabels[normalizedLeaf];
  }

  const fallbackToken = normalizedLeaf || cleanPath.replace(/^\//, '') || 'pagina';
  return titleCaseLabel(fallbackToken.replace(/[-_]+/g, ' '));
}

function aggregateAudienceViews(rows = [], eventSlug = '') {
  const visitors = new Map();
  const pageTotals = new Map();
  let totalViews = 0;
  let totalDurationSeconds = 0;
  let latestActivityAt = '';

  rows.forEach((row) => {
    const tokenId = String(row?.token_id || 'without-token');
    const groupName = String(row?.guest_tokens?.group_name || 'Convite sem identificação').trim() || 'Convite sem identificação';
    const pagePath = normalizeAudiencePagePath(row?.page_path);
    const pageLabel = buildAudiencePageLabel(pagePath, eventSlug);
    const durationSeconds = normalizeAudienceDuration(row?.duration_seconds);
    const openedAt = row?.opened_at || row?.created_at || null;
    const sessionId = String(row?.session_id || '').trim();

    totalViews += 1;
    totalDurationSeconds += durationSeconds;

    if (openedAt && (!latestActivityAt || openedAt > latestActivityAt)) {
      latestActivityAt = openedAt;
    }

    const pageKey = pagePath;
    const pageStats = pageTotals.get(pageKey) || {
      pagePath,
      pageLabel,
      viewCount: 0,
      totalDurationSeconds: 0,
      latestOpenedAt: '',
    };
    pageStats.viewCount += 1;
    pageStats.totalDurationSeconds += durationSeconds;
    if (openedAt && (!pageStats.latestOpenedAt || openedAt > pageStats.latestOpenedAt)) {
      pageStats.latestOpenedAt = openedAt;
    }
    pageTotals.set(pageKey, pageStats);

    const visitor = visitors.get(tokenId) || {
      tokenId,
      groupName,
      guestToken: row?.guest_tokens?.token || '',
      totalViews: 0,
      totalDurationSeconds: 0,
      uniquePageCount: 0,
      sessionCount: 0,
      latestActivityAt: '',
      lastPagePath: '',
      lastPageLabel: '',
      pageMap: new Map(),
      sessionSet: new Set(),
    };

    visitor.totalViews += 1;
    visitor.totalDurationSeconds += durationSeconds;
    if (openedAt && (!visitor.latestActivityAt || openedAt > visitor.latestActivityAt)) {
      visitor.latestActivityAt = openedAt;
      visitor.lastPagePath = pagePath;
      visitor.lastPageLabel = pageLabel;
    }
    if (sessionId) {
      visitor.sessionSet.add(sessionId);
    }

    const visitorPage = visitor.pageMap.get(pageKey) || {
      pagePath,
      pageLabel,
      viewCount: 0,
      totalDurationSeconds: 0,
      latestOpenedAt: '',
    };
    visitorPage.viewCount += 1;
    visitorPage.totalDurationSeconds += durationSeconds;
    if (openedAt && (!visitorPage.latestOpenedAt || openedAt > visitorPage.latestOpenedAt)) {
      visitorPage.latestOpenedAt = openedAt;
    }
    visitor.pageMap.set(pageKey, visitorPage);
    visitors.set(tokenId, visitor);
  });

  const visitorRows = Array.from(visitors.values())
    .map((visitor) => {
      const pages = Array.from(visitor.pageMap.values())
        .sort((left, right) => {
          if ((right.latestOpenedAt || '') !== (left.latestOpenedAt || '')) {
            return String(right.latestOpenedAt || '').localeCompare(String(left.latestOpenedAt || ''));
          }
          return right.viewCount - left.viewCount;
        });

      return {
        tokenId: visitor.tokenId,
        groupName: visitor.groupName,
        guestToken: visitor.guestToken,
        totalViews: visitor.totalViews,
        totalDurationSeconds: visitor.totalDurationSeconds,
        uniquePageCount: pages.length,
        sessionCount: visitor.sessionSet.size || (visitor.totalViews > 0 ? 1 : 0),
        latestActivityAt: visitor.latestActivityAt,
        lastPagePath: visitor.lastPagePath,
        lastPageLabel: visitor.lastPageLabel,
        pages,
      };
    })
    .sort((left, right) => {
      if ((right.latestActivityAt || '') !== (left.latestActivityAt || '')) {
        return String(right.latestActivityAt || '').localeCompare(String(left.latestActivityAt || ''));
      }
      return right.totalViews - left.totalViews;
    });

  const pageOptions = Array.from(pageTotals.values()).sort((left, right) => {
    if (right.viewCount !== left.viewCount) {
      return right.viewCount - left.viewCount;
    }
    return String(left.pageLabel || '').localeCompare(String(right.pageLabel || ''));
  });

  return {
    visitors: visitorRows,
    pageOptions,
    totals: {
      totalViews,
      totalDurationSeconds,
      latestActivityAt,
    },
  };
}

function filterAudienceVisitors(visitors = [], searchTerm = '', pagePath = '') {
  const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
  const normalizedPagePath = normalizeAudiencePagePath(pagePath);

  return visitors.filter((visitor) => {
    const matchesSearch = !normalizedSearch || [
      visitor.groupName,
      visitor.lastPageLabel,
      ...visitor.pages.map((page) => `${page.pageLabel} ${page.pagePath}`),
    ].join(' ').toLowerCase().includes(normalizedSearch);

    const matchesPage = !pagePath || visitor.pages.some((page) => page.pagePath === normalizedPagePath);
    return matchesSearch && matchesPage;
  });
}

function buildAudienceSummary(visitors = [], pageOptions = []) {
  const totalViews = visitors.reduce((sum, visitor) => sum + visitor.totalViews, 0);
  const totalDurationSeconds = visitors.reduce((sum, visitor) => sum + visitor.totalDurationSeconds, 0);
  const latestActivityAt = visitors.reduce((latest, visitor) => {
    const candidate = visitor.latestActivityAt || '';
    return !latest || candidate > latest ? candidate : latest;
  }, '');

  const pageCounter = new Map();
  visitors.forEach((visitor) => {
    visitor.pages.forEach((page) => {
      const current = pageCounter.get(page.pagePath) || {
        pagePath: page.pagePath,
        pageLabel: page.pageLabel,
        viewCount: 0,
      };
      current.viewCount += page.viewCount;
      pageCounter.set(page.pagePath, current);
    });
  });

  const mostVisitedPage = Array.from(pageCounter.values()).sort((left, right) => right.viewCount - left.viewCount)[0]
    || pageOptions[0]
    || null;

  return {
    totalViews,
    uniqueVisitors: visitors.length,
    totalDurationSeconds,
    averageDurationSeconds: totalViews > 0 ? Math.round(totalDurationSeconds / totalViews) : 0,
    latestActivityAt: latestActivityAt || null,
    mostVisitedPage: mostVisitedPage
      ? {
          pagePath: mostVisitedPage.pagePath,
          pageLabel: mostVisitedPage.pageLabel,
          viewCount: mostVisitedPage.viewCount,
        }
      : null,
  };
}

/**
 * GET /api/dashboard/confirmations?mode=audience&eventId=...&page=1&pageSize=20
 * Retorna a jornada dos convidados por pagina.
 */
async function handleAudience(req, res) {
  const {
    page = '1',
    pageSize = '20',
    search = '',
    pagePath = '',
  } = req.query;

  try {
    const ownedEvent = await requireOwnedEvent(req, {
      selectClause: 'id,slug,user_id,config',
    });

    if (!ownedEvent.ok) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(ownedEvent.status).json({ error: ownedEvent.error });
    }

    const supabase = ownedEvent.supabase;
    const pageNum = Math.max(1, toSafeInteger(page, 1));
    const size = Math.min(50, Math.max(1, toSafeInteger(pageSize, 20)));
    const offset = (pageNum - 1) * size;

    const { data: views, count, error } = await supabase
      .from('guest_views')
      .select(
        `
        id,
        token_id,
        opened_at,
        created_at,
        left_at,
        duration_seconds,
        page_path,
        session_id,
        referrer_page,
        guest_tokens:token_id(id,group_name,token,max_confirmations)
        `,
        { count: 'exact' }
      )
      .eq('event_id', ownedEvent.event.slug)
      .order('opened_at', { ascending: false })
      .range(0, AUDIENCE_MAX_RAW_ROWS - 1);

    if (error) {
      throw error;
    }

    const aggregated = aggregateAudienceViews(views || [], ownedEvent.event.slug);
    const filteredVisitors = filterAudienceVisitors(aggregated.visitors, search, pagePath);
    const summary = buildAudienceSummary(filteredVisitors, aggregated.pageOptions);
    const total = filteredVisitors.length;
    const pagedVisitors = filteredVisitors.slice(offset, offset + size);

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      summary,
      filters: {
        pages: aggregated.pageOptions,
      },
      data: pagedVisitors,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
      meta: {
        rawRows: views?.length || 0,
        rawCount: count ?? views?.length ?? 0,
        truncated: Boolean((count ?? 0) > AUDIENCE_MAX_RAW_ROWS),
      },
    });
  } catch (error) {
    console.error('[audience GET]', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: error.message });
  }
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
  const { status, groupId, page = '1', pageSize = '50' } = req.query;

  try {
    const ownedEvent = await requireOwnedEvent(req, {
      selectClause: 'id,slug,user_id,config',
    });

    if (!ownedEvent.ok) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(ownedEvent.status).json({ error: ownedEvent.error });
    }

    const supabase = ownedEvent.supabase;
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
      .eq('event_id', ownedEvent.event.slug);

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
  const { status, groupId } = req.query;

  try {
    const ownedEvent = await requireOwnedEvent(req, {
      selectClause: 'id,slug,user_id,config',
    });

    if (!ownedEvent.ok) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(ownedEvent.status).json({ error: ownedEvent.error });
    }

    const supabase = ownedEvent.supabase;
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
      .eq('event_id', ownedEvent.event.slug);

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
    res.setHeader('Content-Disposition', `attachment; filename="confirmacoes-${ownedEvent.event.slug || ownedEvent.event.id}-${Date.now()}.csv"`);
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
