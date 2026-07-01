import { CHAVES, lerLista, salvarLista } from "./redis.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const produtos = await lerLista(CHAVES.produtos);
      return res.status(200).json(produtos);
    }

    if (req.method === "POST") {
      const { nome, preco, turma, icone, descricao } = req.body || {};

      if (!nome || !preco || !turma || !icone) {
        return res.status(400).json({
          erro: "Preencha nome, preço, turma e ícone."
        });
      }

      const produtos = await lerLista(CHAVES.produtos);
      const novoProduto = {
        id: Date.now(),
        nome: String(nome).trim(),
        preco: Number(preco),
        turma: String(turma).trim(),
        icone: String(icone).trim(),
        descricao: descricao
          ? String(descricao).trim()
          : "Produto criado pelos alunos."
      };

      produtos.push(novoProduto);
      await salvarLista(CHAVES.produtos, produtos);

      return res.status(201).json({ sucesso: true, produto: novoProduto });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);

      if (!id) {
        await salvarLista(CHAVES.produtos, []);
        return res.status(200).json({ sucesso: true });
      }

      const produtos = await lerLista(CHAVES.produtos);
      const atualizados = produtos.filter((produto) => Number(produto.id) !== id);
      await salvarLista(CHAVES.produtos, atualizados);

      return res.status(200).json({ sucesso: true });
    }

    return res.status(405).json({ erro: "Método não permitido." });
  } catch (error) {
    console.error("Erro na API de produtos:", error);
    return res.status(500).json({ erro: "Erro interno ao processar produtos." });
  }
}
