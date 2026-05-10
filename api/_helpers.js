import { createClient } from '@supabase/supabase-js';

export function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel.');
  return { url, anon, service };
}

export function publicClient() {
  const { url, anon } = getEnv();
  return createClient(url, anon);
}

export function userClient(req) {
  const { url, anon } = getEnv();
  const auth = req.headers.authorization || '';
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } }
  });
}

export function adminClient() {
  const { url, service } = getEnv();
  if (!service) throw new Error('Configure SUPABASE_SERVICE_ROLE_KEY na Vercel para rotas administrativas.');
  return createClient(url, service);
}

export async function getAuthUser(req) {
  const supabase = userClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { user: null, error };
  return { user: data.user, error: null };
}

export async function getPerfil(req) {
  const { user } = await getAuthUser(req);
  if (!user) return { user: null, perfil: null };
  const admin = adminClient();
  const { data: perfil, error } = await admin
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return { user, perfil: null, error };
  return { user, perfil };
}

export function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
