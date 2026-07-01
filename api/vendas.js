import { CHAVES, lerLista, salvarLista } from "./redis.js";

function formatarData() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date());
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const vendas = await lerLista(CHAVES.vendas);
      return res.status(200).json(vendas);
    }

    if (req.method === "POST") {
      const { alunoId, itens } = req.body || {};
      const alunos = await lerLista(CHAVES.alunos);
      const vendas = await lerLista(CHAVES.vendas);
      const aluno = alunos.find((item) => Number(item.id) === Number(alunoId));
      const itensVenda = Array.isArray(itens) ? itens : [];
      const total = itensVenda.reduce((soma, item) => soma + Number(item.preco), 0);

      if (!aluno) {
        return res.status(404).json({ erro: "Aluno não encontrado." });
      }

      if (itensVenda.length === 0 || total <= 0) {
        return res.status(400).json({ erro: "A venda precisa ter pelo menos um item." });
      }

      if (Number(aluno.saldo) < total) {
        return res.status(400).json({ erro: "Saldo insuficiente para finalizar a compra." });
      }

      aluno.saldo = Number(aluno.saldo) - total;

      const venda = {
        id: Date.now(),
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        itens: itensVenda.map((item) => ({
          nome: String(item.nome),
          preco: Number(item.preco)
        })),
        total,
        data: formatarData()
      };

      vendas.unshift(venda);
      await salvarLista(CHAVES.alunos, alunos);
      await salvarLista(CHAVES.vendas, vendas);

      return res.status(201).json({ sucesso: true, venda, aluno });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);

      if (!id) {
        return res.status(400).json({ erro: "Informe a venda que será excluída." });
      }

      const vendas = await lerLista(CHAVES.vendas);
      const alunos = await lerLista(CHAVES.alunos);
      const venda = vendas.find((item) => Number(item.id) === id);

      if (!venda) {
        return res.status(404).json({ erro: "Venda não encontrada." });
      }

      const aluno = alunos.find((item) => Number(item.id) === Number(venda.alunoId));

      if (!aluno) {
        return res.status(404).json({
          erro: "Aluno da venda não encontrado. A venda não foi excluída."
        });
      }

      aluno.saldo = Number(aluno.saldo) + Number(venda.total);
      const vendasAtualizadas = vendas.filter((item) => Number(item.id) !== id);

      await salvarLista(CHAVES.alunos, alunos);
      await salvarLista(CHAVES.vendas, vendasAtualizadas);

      return res.status(200).json({
        sucesso: true,
        mensagem: "Venda excluída e saldo devolvido ao aluno.",
        aluno,
        venda
      });
    }

    return res.status(405).json({ erro: "Método não permitido." });
  } catch (error) {
    console.error("Erro na API de vendas:", error);
    return res.status(500).json({ erro: "Erro interno ao processar vendas." });
  }
}
