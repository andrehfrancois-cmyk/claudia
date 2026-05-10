import { adminClient, getPerfil, json } from './_helpers.js';

export default async function handler(req, res) {
  try {
    const admin = adminClient();
    if (req.method === 'GET') {
      const { data, error } = await admin.from('grupos').select('*').order('nome');
      if (error) throw error;
      return json(res, 200, data);
    }
    if (req.method === 'POST') {
      const { perfil } = await getPerfil(req);
      if (perfil?.tipo !== 'admin') return json(res, 403, { error: 'Apenas admin pode criar grupos.' });
      const nome = String(req.body.nome || '').trim();
      if (!nome) return json(res, 400, { error: 'Informe o nome do grupo.' });
      const { data, error } = await admin.from('grupos').insert({ nome, descricao: req.body.descricao || '' }).select().single();
      if (error) throw error;
      return json(res, 200, data);
    }
    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
