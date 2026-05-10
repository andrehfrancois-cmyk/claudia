import { adminClient, getPerfil, json } from './_helpers.js';

export default async function handler(req, res) {
  try {
    const admin = adminClient();

    if (req.method === 'GET') {
      const somenteAtivos = req.query?.todos !== '1';
      let query = admin
        .from('produtos')
        .select('id,nome,descricao,preco,estoque,icone,turma,ativo,grupo_id,grupos(nome)')
        .order('created_at', { ascending: false });
      if (somenteAtivos) query = query.eq('ativo', true).gt('estoque', 0);
      const { data, error } = await query;
      if (error) throw error;
      return json(res, 200, data);
    }

    if (req.method === 'POST') {
      const { user, perfil } = await getPerfil(req);
      if (!user || !perfil) return json(res, 401, { error: 'Faça login.' });
      if (!['seller', 'admin'].includes(perfil.tipo)) return json(res, 403, { error: 'Apenas vendedores ou admin podem cadastrar produtos.' });

      const body = req.body;
      const nome = String(body.nome || '').trim();
      const preco = Number(body.preco || 0);
      const estoque = Number(body.estoque || 0);
      if (!nome || preco <= 0 || estoque < 0) return json(res, 400, { error: 'Preencha nome, preço e estoque corretamente.' });

      const grupo_id = perfil.tipo === 'admin' ? (body.grupo_id || perfil.grupo_id) : perfil.grupo_id;
      if (!grupo_id) return json(res, 400, { error: 'Este usuário vendedor precisa estar vinculado a um grupo.' });

      const { data, error } = await admin.from('produtos').insert({
        nome,
        descricao: body.descricao || '',
        preco,
        estoque,
        icone: body.icone || '🛍️',
        turma: body.turma || '',
        grupo_id,
        criado_por: user.id,
        ativo: true
      }).select().single();

      if (error) throw error;
      return json(res, 200, { sucesso: true, produto: data });
    }

    if (req.method === 'PATCH') {
      const { perfil } = await getPerfil(req);
      if (!perfil || !['seller', 'admin'].includes(perfil.tipo)) return json(res, 403, { error: 'Sem permissão.' });
      const body = req.body;
      const id = body.id;
      if (!id) return json(res, 400, { error: 'Produto sem ID.' });

      const updates = {};
      ['nome', 'descricao', 'icone', 'turma', 'ativo'].forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });
      ['preco', 'estoque'].forEach(k => { if (body[k] !== undefined) updates[k] = Number(body[k]); });

      let query = admin.from('produtos').update(updates).eq('id', id);
      if (perfil.tipo === 'seller') query = query.eq('grupo_id', perfil.grupo_id);
      const { data, error } = await query.select().single();
      if (error) throw error;
      return json(res, 200, { sucesso: true, produto: data });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
