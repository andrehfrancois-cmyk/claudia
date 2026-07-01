let alunoAtual = null;
let carrinho = [];

function dinheiro(valor) {
  return `${Number(valor)} Tomazinhos`;
}

function atualizarTela() {
  document.getElementById("saldoTomazinho").textContent = alunoAtual
    ? dinheiro(alunoAtual.saldo)
    : "0 Tomazinhos";

  document.getElementById("alunoAtual").textContent = alunoAtual
    ? `Aluno: ${alunoAtual.nome}`
    : "Nenhum aluno selecionado";

  const lista = document.getElementById("listaCarrinho");
  const total = carrinho.reduce((soma, item) => soma + Number(item.preco), 0);
  document.getElementById("totalCarrinho").textContent = dinheiro(total);

  if (carrinho.length === 0) {
    lista.innerHTML = '<div class="item-carrinho">Nenhum produto escolhido ainda.</div>';
    return;
  }

  lista.innerHTML = carrinho.map((item, index) => `
    <div class="item-carrinho">
      <span>${item.nome}</span>
      <strong>${item.preco} T</strong>
      <button class="btn-pequeno btn-secundario" onclick="removerDoCarrinho(${index})">Remover</button>
    </div>
  `).join("");
}

function mostrarMensagem(texto, sucesso = true) {
  const mensagem = document.getElementById("mensagemCompra");
  mensagem.style.display = "block";
  mensagem.textContent = texto;
  mensagem.style.background = sucesso ? "#eefdf3" : "#fff0ef";
  mensagem.style.color = sucesso ? "#2b7a40" : "#b24040";
  mensagem.style.borderColor = sucesso ? "#c8f0d2" : "#ffc8c4";
}

async function entrarAluno() {
  const nome = document.getElementById("nomeAluno").value.trim();

  if (!nome) {
    mostrarMensagem("Digite o nome do aluno para iniciar a compra.", false);
    return;
  }

  const res = await fetch("/api/alunos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome })
  });

  const dados = await res.json();

  if (!res.ok) {
    mostrarMensagem(dados.erro || "Erro ao carregar aluno.", false);
    return;
  }

  alunoAtual = dados;
  carrinho = [];
  atualizarTela();
  mostrarMensagem(`Aluno ${alunoAtual.nome} carregado com sucesso.`);
}

function adicionarAoCarrinho(nome, preco) {
  if (!alunoAtual) {
    mostrarMensagem("Escolha o aluno comprador antes de adicionar produtos.", false);
    return;
  }

  carrinho.push({ nome, preco: Number(preco) });
  atualizarTela();
  mostrarMensagem(`${nome} foi adicionado ao carrinho.`);
}

function removerDoCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarTela();
}

function limparCarrinho() {
  carrinho = [];
  atualizarTela();
  mostrarMensagem("Carrinho limpo com sucesso.");
}

async function finalizarCompra() {
  const total = carrinho.reduce((soma, item) => soma + Number(item.preco), 0);

  if (!alunoAtual) {
    mostrarMensagem("Escolha o aluno comprador antes de finalizar.", false);
    return;
  }

  if (carrinho.length === 0) {
    mostrarMensagem("Escolha pelo menos um produto antes de finalizar.", false);
    return;
  }

  if (total > Number(alunoAtual.saldo)) {
    mostrarMensagem("O aluno não tem Tomazinhos suficientes para essa compra.", false);
    return;
  }

  const res = await fetch("/api/vendas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alunoId: alunoAtual.id,
      itens: carrinho
    })
  });

  const dados = await res.json();

  if (!res.ok) {
    mostrarMensagem(dados.erro || "Erro ao finalizar a venda.", false);
    return;
  }

  alunoAtual = dados.aluno;
  const quantidade = carrinho.length;
  carrinho = [];
  atualizarTela();
  mostrarMensagem(`Compra concluída! ${quantidade} item(ns) registrado(s).`);
}

async function carregarProdutos() {
  try {
    const res = await fetch("/api/produtos");
    const produtos = await res.json();
    const grade = document.querySelector(".grade-produtos");

    if (!Array.isArray(produtos) || produtos.length === 0) {
      grade.innerHTML = `
        <article class="produto">
          <div class="produto-icone">🛍️</div>
          <h4>Nenhum produto ainda</h4>
          <p>Os produtos aparecerão aqui depois do cadastro no painel do professor.</p>
          <div class="rodape-card">
            <span class="preco">Em breve</span>
          </div>
        </article>
      `;
      return;
    }

    grade.innerHTML = produtos.map((produto) => {
      const nomeSeguro = String(produto.nome).replace(/'/g, "\\'");
      return `
        <article class="produto">
          <span class="tag-turma">Turma ${produto.turma}</span>
          <div class="produto-icone">${produto.icone}</div>
          <h4>${produto.nome}</h4>
          <p>${produto.descricao || "Produto criado pelos alunos."}</p>
          <div class="rodape-card">
            <span class="preco">${produto.preco} Tomazinhos</span>
            <button class="btn-comprar" onclick="adicionarAoCarrinho('${nomeSeguro}', ${Number(produto.preco)})">
              Comprar
            </button>
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Não foi possível carregar os produtos.", false);
  }
}

atualizarTela();
carregarProdutos();
