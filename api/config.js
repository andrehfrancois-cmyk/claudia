import { json, getEnv } from './_helpers.js';

export default function handler(req, res) {
  try {
    const { url, anon } = getEnv();
    return json(res, 200, { supabaseUrl: url, supabaseAnonKey: anon });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
