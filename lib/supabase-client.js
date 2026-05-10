let supabaseClient = null;

async function initSupabase() {
  if (supabaseClient) return supabaseClient;
  const res = await fetch('/api/config');
  const cfg = await res.json();
  if (!res.ok) throw new Error(cfg.error || 'Erro ao carregar configuração do Supabase.');
  supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  return supabaseClient;
}

async function getSession() {
  const sb = await initSupabase();
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function authHeaders() {
  const session = await getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function loginGoogle() {
  const sb = await initSupabase();
  const redirectTo = window.location.origin + window.location.pathname;
  await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
}

async function logout() {
  const sb = await initSupabase();
  await sb.auth.signOut();
  window.location.href = '/';
}

async function apiFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...(await authHeaders())
  };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na solicitação.');
  return data;
}

window.TomazinhoAuth = { initSupabase, getSession, authHeaders, loginGoogle, logout, apiFetch };
