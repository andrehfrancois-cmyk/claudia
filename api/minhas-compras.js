import { userClient, json } from './_helpers.js';

export default async function handler(req, res) {
  try {
    const supabase = userClient(req);
    const { data, error } = await supabase
      .from('compras')
      .select('id,quantidade,total,status,created_at,produtos(nome,icone)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return json(res, 200, data);
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
