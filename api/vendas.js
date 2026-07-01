import { adminClient, getPerfil, json } from './_helpers.js';

export default async function handler(req, res) {
  try {
    const { perfil } = await getPerfil(req);
    if (!perfil || !['seller', 'admin'].includes(perfil.tipo)) return json(res, 403, { error: 'Sem permissão.' });
    const admin = adminClient();

    if (req.method === 'GET') {
      let query = admin
        .from('compras')
        .select('id,quantidade,total,status,created_at,produtos(nome,icone,imagem_url),usuarios(nome,email),grupos(nome)')
        .order('created_at', { ascending: false });

      if (perfil.tipo === 'seller') query = query.eq('grupo_id', perfil.grupo_id);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return json(res, 200, data);
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '').trim();
      if (!id) return json(res, 400, { error: 'Informe a venda que será cancelada.' });

      const { data: compra, error: erroCompra } = await admin
        .from('compras')
        .select('id,aluno_id,produto_id,grupo_id,quantidade,total,status')
        .eq('id', id)
        .single();

      if (erroCompra || !compra) return json(res, 404, { error: 'Venda não encontrada.' });
      if (perfil.tipo === 'seller' && compra.grupo_id !== perfil.grupo_id) {
        return json(res, 403, { error: 'Você só pode cancelar vendas do seu grupo.' });
      }
      if (compra.status !== 'confirmada') {
        return json(res, 400, { error: 'Esta venda já foi cancelada ou não está confirmada.' });
      }

      const { data: travada, error: erroTrava } = await admin
        .from('compras')
        .update({ status: 'cancelando' })
        .eq('id', id)
        .eq('status', 'confirmada')
        .select('id')
        .single();

      if (erroTrava || !travada) {
        return json(res, 409, { error: 'Não foi possível bloquear a venda para cancelamento. Atualize a página e tente novamente.' });
      }

      const { data: aluno, error: erroAluno } = await admin
        .from('usuarios')
        .select('id,saldo')
        .eq('id', compra.aluno_id)
        .single();

      if (erroAluno || !aluno) throw new Error('Aluno da venda não encontrado. A venda ficou marcada como cancelando.');

      const { data: produto, error: erroProduto } = await admin
        .from('produtos')
        .select('id,estoque')
        .eq('id', compra.produto_id)
        .single();

      if (erroProduto || !produto) throw new Error('Produto da venda não encontrado. A venda ficou marcada como cancelando.');

      const novoSaldo = Number(aluno.saldo || 0) + Number(compra.total || 0);
      const novoEstoque = Number(produto.estoque || 0) + Number(compra.quantidade || 0);

      const { error: erroSaldo } = await admin
        .from('usuarios')
        .update({ saldo: novoSaldo })
        .eq('id', compra.aluno_id);
      if (erroSaldo) throw erroSaldo;

      const { error: erroEstoque } = await admin
        .from('produtos')
        .update({ estoque: novoEstoque })
        .eq('id', compra.produto_id);
      if (erroEstoque) throw erroEstoque;

      const { error: erroStatus } = await admin
        .from('compras')
        .update({ status: 'cancelada' })
        .eq('id', id);
      if (erroStatus) throw erroStatus;

      return json(res, 200, {
        sucesso: true,
        mensagem: 'Venda cancelada. Saldo devolvido ao aluno e estoque restaurado.'
      });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
