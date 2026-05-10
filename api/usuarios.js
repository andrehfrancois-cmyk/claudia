import { adminClient, getPerfil, json } from './_helpers.js';

export default async function handler(req, res) {
  try {
    const { perfil } = await getPerfil(req);
    if (perfil?.tipo !== 'admin') return json(res, 403, { error: 'Apenas admin.' });
    const admin = adminClient();

    if (req.method === 'GET') {
      const { data, error } = await admin.from('usuarios').select('*, grupos(nome)').order('created_at', { ascending: false });
      if (error) throw error;
      return json(res, 200, data);
    }

    if (req.method === 'PATCH') {
      const { id, tipo, saldo, turma, grupo_id, nome } = req.body;
      if (!id) return json(res, 400, { error: 'ID obrigatório.' });
      const updates = {};
      if (tipo !== undefined) updates.tipo = tipo;
      if (saldo !== undefined) updates.saldo = Number(saldo);
      if (turma !== undefined) updates.turma = turma;
      if (grupo_id !== undefined) updates.grupo_id = grupo_id || null;
      if (nome !== undefined) updates.nome = nome;
      const { data, error } = await admin.from('usuarios').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return json(res, 200, data);
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
