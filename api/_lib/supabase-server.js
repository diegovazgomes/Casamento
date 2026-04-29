import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function extractBearerToken(req) {
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization || '';

  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return '';
  }

  return authHeader.slice('Bearer '.length).trim();
}

export async function authenticateSupabaseUser(req, supabase) {
  const token = extractBearerToken(req);

  if (!token) {
    return { status: 401, error: 'Unauthorized' };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user?.id) {
    return { status: 401, error: 'Unauthorized' };
  }

  return { user: data.user, token };
}

export async function getEventById(supabase, eventId) {
  const { data, error } = await supabase
    .from('events')
    .select('id,user_id,config')
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}