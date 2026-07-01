import { adminClient, getPerfil, json } from './_helpers.js';

export default async function handler(req, res) {
  try {
    const admin = adminClient();

    if (req.method === "GET") {
      const { data, error } = await admin
        .from('produtos')
        .select('*, grupos(nome)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return json(res, 200, data);
    }

    if (req.method === "POST") {
      const { user, perfil } = await getPerfil(req);

      if (!user) return json(res, 401, { error: 'Faça login para cadastrar produtos.' });
      if (!['seller', 'admin'].includes(perfil?.tipo)) {
        return json(res, 403, { error: 'Apenas vendedor ou admin pode cadastrar produtos.' });
      }

      const { nome, preco, turma, icone, descricao, estoque, imagem_url, grupo_id } = req.body || {};

      if (!nome || !preco) {
        return json(res, 400, { error: 'Preencha nome e preço.' });
      }

      const produto = {
        nome: String(nome).trim(),
        descricao: descricao ? String(descricao).trim() : '',
        preco: Number(preco),
        estoque: Math.max(0, Number(estoque || 0)),
        icone: icone ? String(icone).trim() : '🛍️',
        imagem_url: imagem_url ? String(imagem_url).trim() : '',
        turma: turma ? String(turma).trim() : perfil?.turma || '',
        grupo_id: perfil?.tipo === 'admin' ? (grupo_id || perfil?.grupo_id || null) : perfil?.grupo_id,
        criado_por: user.id,
        ativo: true
      };

      const { data, error } = await admin
        .from('produtos')
        .insert(produto)
        .select('*, grupos(nome)')
        .single();

      if (error) throw error;
      return json(res, 200, data);
    }

    if (req.method === "PATCH") {
      const { perfil } = await getPerfil(req);

      if (!['seller', 'admin'].includes(perfil?.tipo)) {
        return json(res, 403, { error: 'Apenas vendedor ou admin pode atualizar produtos.' });
      }

      const { id, preco, estoque, ativo, nome, descricao, icone, imagem_url } = req.body || {};
      if (!id) return json(res, 400, { error: 'ID obrigatório.' });

      const updates = {};
      if (nome !== undefined) updates.nome = String(nome).trim();
      if (descricao !== undefined) updates.descricao = String(descricao).trim();
      if (icone !== undefined) updates.icone = String(icone).trim() || '🛍️';
      if (imagem_url !== undefined) updates.imagem_url = String(imagem_url).trim();
      if (preco !== undefined) {
        const valor = Number(preco);
        if (!Number.isFinite(valor) || valor <= 0) return json(res, 400, { error: 'Preço inválido.' });
        updates.preco = Math.floor(valor);
      }
      if (estoque !== undefined) {
        const valor = Number(estoque);
        if (!Number.isFinite(valor) || valor < 0) return json(res, 400, { error: 'Estoque inválido.' });
        updates.estoque = Math.floor(valor);
      }
      if (ativo !== undefined) updates.ativo = Boolean(ativo);

      let query = admin.from('produtos').update(updates).eq('id', id);
      if (perfil?.tipo !== 'admin') query = query.eq('grupo_id', perfil.grupo_id);

      const { data, error } = await query.select('*, grupos(nome)').single();
      if (error) throw error;
      return json(res, 200, data);
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    console.error("Erro na API de produtos:", error);
    return json(res, 500, { error: error.message || 'Erro interno ao processar produtos.' });
  }
}
