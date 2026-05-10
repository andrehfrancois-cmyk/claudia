import { userClient, json } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
  try {
    const supabase = userClient(req);
    const { produto_id, quantidade = 1 } = req.body;
    const { data, error } = await supabase.rpc('comprar_produto', {
      p_produto_id: produto_id,
      p_quantidade: Number(quantidade)
    });
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { sucesso: true, compra_id: data });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
