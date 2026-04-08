async function cadastrar() {
  const produto = {
    nome: document.getElementById("nome").value,
    preco: Number(document.getElementById("preco").value),
    turma: document.getElementById("turma").value,
    icone: document.getElementById("icone").value
  };

  await fetch("/api/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(produto)
  });

  alert("Produto cadastrado!");
  carregar();
}

async function carregar() {
  const res = await fetch("/api/produtos");
  const dados = await res.json();

  const lista = document.getElementById("lista");
  lista.innerHTML = dados.map(p =>
    `<p>${p.icone} ${p.nome} - ${p.preco}T (${p.turma})</p>`
  ).join("");
}

carregar();