import { adminClient, getPerfil, json } from './_helpers.js';

export default async function handler(req, res) {
  try {
    const { perfil } = await getPerfil(req);
    if (!perfil || !['seller', 'admin'].includes(perfil.tipo)) return json(res, 403, { error: 'Sem permissão.' });
    const admin = adminClient();
    let query = admin.from('compras').select('id,quantidade,total,status,created_at,produtos(nome,icone,imagem_url),usuarios(nome,email),grupos(nome)').order('created_at', { ascending: false });
    if (perfil.tipo === 'seller') query = query.eq('grupo_id', perfil.grupo_id);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return json(res, 200, data);
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
