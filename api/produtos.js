let produtos = [
  { id: 1, nome: "Bonequinho Feliz", preco: 8, turma: "2ºA", icone: "🧸" },
  { id: 2, nome: "Mini Livro", preco: 6, turma: "3ºB", icone: "📚" }
];

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(produtos);
  }

  if (req.method === "POST") {
    const novo = req.body;

    novo.id = Date.now();
    produtos.push(novo);

    return res.status(200).json({ sucesso: true, produtos });
  }
}