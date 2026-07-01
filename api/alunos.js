import { CHAVES, lerLista, salvarLista } from "./redis.js";

const SALDO_INICIAL = 50;

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const alunos = await lerLista(CHAVES.alunos);
      return res.status(200).json(alunos);
    }

    if (req.method === "POST") {
      const { nome } = req.body || {};

      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ erro: "Informe o nome do aluno." });
      }

      const nomeLimpo = String(nome).trim();
      const alunos = await lerLista(CHAVES.alunos);
      let aluno = alunos.find(
        (item) => item.nome.toLowerCase() === nomeLimpo.toLowerCase()
      );

      if (!aluno) {
        aluno = {
          id: Date.now(),
          nome: nomeLimpo,
          saldo: SALDO_INICIAL
        };
        alunos.push(aluno);
        await salvarLista(CHAVES.alunos, alunos);
      }

      return res.status(200).json(aluno);
    }

    return res.status(405).json({ erro: "Método não permitido." });
  } catch (error) {
    console.error("Erro na API de alunos:", error);
    return res.status(500).json({ erro: "Erro interno ao processar alunos." });
  }
}
