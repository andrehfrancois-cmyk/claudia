function mostrarMensagem(texto, sucesso = true) {
  const box = document.getElementById("mensagemAdmin");
  box.style.display = "block";
  box.textContent = texto;
  box.style.background = sucesso ? "#eefdf3" : "#fff0ef";
  box.style.color = sucesso ? "#2b7a40" : "#b24040";
  box.style.borderColor = sucesso ? "#c8f0d2" : "#ffc8c4";
}

function limparFormulario() {
  document.getElementById("nome").value = "";
  document.getElementById("preco").value = "";
  document.getElementById("turma").value = "";
  document.getElementById("icone").value = "";
  document.getElementById("descricao").value = "";
}

async function cadastrarProduto() {
  const produto = {
    nome: document.getElementById("nome").value.trim(),
    preco: Number(document.getElementById("preco").value),
    turma: document.getElementById("turma").value.trim(),
    icone: document.getElementById("icone").value.trim(),
    descricao: document.getElementById("descricao").value.trim()
  };

  const res = await fetch("/api/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(produto)
  });

  const dados = await res.json();

  if (!res.ok) {
    mostrarMensagem(dados.erro || "Erro ao salvar produto.", false);
    return;
  }

  mostrarMensagem("Produto cadastrado com sucesso.");
  limparFormulario();
  carregarTudo();
}

async function excluirProduto(id) {
  const confirmar = confirm("Deseja excluir este produto?");
  if (!confirmar) return;

  const res = await fetch(`/api/produtos?id=${id}`, {
    method: "DELETE"
  });

  const dados = await res.json();

  if (!res.ok) {
    mostrarMensagem(dados.erro || "Erro ao excluir produto.", false);
    return;
  }

  mostrarMensagem("Produto excluído com sucesso.");
  carregarTudo();
}

async function excluirVenda(id, alunoNome, total) {
  const confirmar = confirm(
    `Excluir esta venda e devolver ${total} Tomazinhos para ${alunoNome}?`
  );

  if (!confirmar) return;

  const res = await fetch(`/api/vendas?id=${id}`, {
    method: "DELETE"
  });

  const dados = await res.json();

  if (!res.ok) {
    mostrarMensagem(dados.erro || "Erro ao excluir venda.", false);
    return;
  }

  mostrarMensagem(dados.mensagem || "Venda excluída e saldo devolvido.");
  carregarTudo();
}

async function carregarProdutos() {
  const res = await fetch("/api/produtos");
  const produtos = await res.json();
  const lista = document.getElementById("listaProdutos");

  if (!Array.isArray(produtos) || produtos.length === 0) {
    lista.innerHTML = '<div class="item-admin">Nenhum produto cadastrado ainda.</div>';
    return;
  }

  lista.innerHTML = produtos.map((produto) => `
    <div class="item-admin">
      <div>
        <strong>${produto.icone} ${produto.nome}</strong><br>
        <span>Turma ${produto.turma} - ${produto.preco} Tomazinhos</span><br>
        <small>${produto.descricao || ""}</small>
      </div>
      <button class="btn-pequeno btn-excluir" onclick="excluirProduto(${produto.id})">
        Excluir
      </button>
    </div>
  `).join("");
}

async function carregarAlunos() {
  const res = await fetch("/api/alunos");
  const alunos = await res.json();
  const lista = document.getElementById("listaAlunos");

  if (!Array.isArray(alunos) || alunos.length === 0) {
    lista.innerHTML = '<div class="item-admin">Nenhum aluno entrou na loja ainda.</div>';
    return;
  }

  lista.innerHTML = alunos.map((aluno) => `
    <div class="item-admin">
      <div>
        <strong>${aluno.nome}</strong><br>
        <span>Saldo: ${aluno.saldo} Tomazinhos</span>
      </div>
    </div>
  `).join("");
}

async function carregarVendas() {
  const res = await fetch("/api/vendas");
  const vendas = await res.json();
  const lista = document.getElementById("listaVendas");

  if (!Array.isArray(vendas) || vendas.length === 0) {
    lista.innerHTML = '<div class="item-venda">Nenhuma venda registrada ainda.</div>';
    return;
  }

  lista.innerHTML = vendas.map((venda) => {
    const itens = venda.itens
      .map((item) => `${item.nome} (${item.preco} T)`)
      .join(", ");

    return `
      <div class="item-venda">
        <div>
          <strong>${venda.alunoNome} - ${venda.total} Tomazinhos</strong><br>
          <small>${venda.data}</small><br>
          <span>${itens}</span>
        </div>
        <button
          class="btn-pequeno btn-excluir"
          onclick="excluirVenda(${venda.id}, '${String(venda.alunoNome).replace(/'/g, "\\'")}', ${venda.total})"
        >
          Excluir e devolver saldo
        </button>
      </div>
    `;
  }).join("");
}

async function carregarTudo() {
  await Promise.all([
    carregarProdutos(),
    carregarAlunos(),
    carregarVendas()
  ]);
}

carregarTudo();
