import { adminClient, getPerfil, json } from './_helpers.js';

const TIPOS_VALIDOS = ['pendente', 'student', 'seller', 'admin'];

function montarUpdates(body) {
  const updates = {};
  if (body.tipo !== undefined) {
    if (!TIPOS_VALIDOS.includes(body.tipo)) throw new Error('Tipo de usuário inválido.');
    updates.tipo = body.tipo;
  }
  if (body.turma !== undefined) updates.turma = body.turma || '';
  if (body.grupo_id !== undefined) updates.grupo_id = body.grupo_id || null;
  if (body.nome !== undefined) updates.nome = body.nome || '';
  if (body.saldo !== undefined) {
    const saldo = Number(body.saldo);
    if (!Number.isFinite(saldo) || saldo < 0) throw new Error('Saldo inválido.');
    updates.saldo = Math.floor(saldo);
  }
  return updates;
}

async function aplicarSaldoEmMassa(admin, ids, modo, valor) {
  if (!modo) return;
  if (!['set', 'add', 'subtract'].includes(modo)) throw new Error('Modo de saldo inválido.');
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) throw new Error('Valor de saldo inválido.');
  const pontos = Math.floor(n);

  const { data: atuais, error: erroBusca } = await admin
    .from('usuarios')
    .select('id, saldo')
    .in('id', ids);
  if (erroBusca) throw erroBusca;

  const updates = atuais.map(u => {
    let novoSaldo = Number(u.saldo || 0);
    if (modo === 'set') novoSaldo = pontos;
    if (modo === 'add') novoSaldo += pontos;
    if (modo === 'subtract') novoSaldo = Math.max(0, novoSaldo - pontos);
    return admin.from('usuarios').update({ saldo: novoSaldo }).eq('id', u.id);
  });

  const resultados = await Promise.all(updates);
  const erro = resultados.find(r => r.error)?.error;
  if (erro) throw erro;
}

export default async function handler(req, res) {
  try {
    const { perfil } = await getPerfil(req);
    if (perfil?.tipo !== 'admin') return json(res, 403, { error: 'Apenas admin.' });
    const admin = adminClient();

    if (req.method === 'GET') {
      const { data, error } = await admin
        .from('usuarios')
        .select('*, grupos(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(res, 200, data);
    }

    if (req.method === 'PATCH') {
      const body = req.body || {};

      if (Array.isArray(body.ids)) {
        const ids = body.ids.filter(Boolean);
        if (!ids.length) return json(res, 400, { error: 'Selecione pelo menos um usuário.' });
        if (ids.length > 200) return json(res, 400, { error: 'Selecione no máximo 200 usuários por vez.' });

        const updates = montarUpdates(body);
        delete updates.saldo; // saldo em massa é tratado abaixo para permitir somar/remover pontos

        if (Object.keys(updates).length) {
          const { error } = await admin.from('usuarios').update(updates).in('id', ids);
          if (error) throw error;
        }

        await aplicarSaldoEmMassa(admin, ids, body.saldo_modo, body.saldo_valor);

        const { data, error } = await admin
          .from('usuarios')
          .select('*, grupos(nome)')
          .in('id', ids);
        if (error) throw error;
        return json(res, 200, { ok: true, atualizados: data.length, usuarios: data });
      }

      const { id } = body;
      if (!id) return json(res, 400, { error: 'ID obrigatório.' });

      const updates = montarUpdates(body);
      if (body.saldo_modo) {
        await aplicarSaldoEmMassa(admin, [id], body.saldo_modo, body.saldo_valor);
      }

      if (Object.keys(updates).length) {
        const { data, error } = await admin.from('usuarios').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return json(res, 200, data);
      }

      const { data, error } = await admin.from('usuarios').select().eq('id', id).single();
      if (error) throw error;
      return json(res, 200, data);
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
