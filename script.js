let saldo = 50;
let carrinho = [];

function atualizarTela() {
  document.getElementById("saldoTomazinho").textContent = `${saldo} Tomazinhos`;

  const lista = document.getElementById("listaCarrinho");
  const total = carrinho.reduce((soma, item) => soma + item.preco, 0);
  document.getElementById("totalCarrinho").textContent = `${total} Tomazinhos`;

  if (carrinho.length === 0) {
    lista.innerHTML = '<div class="item-carrinho">Nenhum produto escolhido ainda ✨</div>';
    return;
  }

  lista.innerHTML = carrinho
    .map(
      (item) => `
      <div class="item-carrinho">
        <span>${item.nome}</span>
        <strong>${item.preco} T</strong>
      </div>
    `
    )
    .join("");
}

function mostrarMensagem(texto, sucesso = true) {
  const mensagem = document.getElementById("mensagemCompra");
  mensagem.style.display = "block";
  mensagem.textContent = texto;
  mensagem.style.background = sucesso ? "#eefdf3" : "#fff0ef";
  mensagem.style.color = sucesso ? "#2b7a40" : "#b24040";
  mensagem.style.borderColor = sucesso ? "#c8f0d2" : "#ffc8c4";
}

function adicionarAoCarrinho(nome, preco) {
  carrinho.push({ nome, preco });
  atualizarTela();
  mostrarMensagem(`${nome} foi adicionado ao carrinho!`);
}

function limparCarrinho() {
  carrinho = [];
  atualizarTela();
  mostrarMensagem("Carrinho limpo com sucesso!");
}

function finalizarCompra() {
  const total = carrinho.reduce((soma, item) => soma + item.preco, 0);

  if (carrinho.length === 0) {
    mostrarMensagem("Escolha pelo menos um produto antes de finalizar.", false);
    return;
  }

  if (total > saldo) {
    mostrarMensagem("Você não tem Tomazinhos suficientes para essa compra.", false);
    return;
  }

  saldo -= total;
  const quantidade = carrinho.length;
  carrinho = [];
  atualizarTela();
  mostrarMensagem(`Compra concluída! Você comprou ${quantidade} item(ns). Parabéns!`);
}

atualizarTela();

async function carregarProdutos() {
  const res = await fetch("/api/produtos");
  const produtos = await res.json();

  const grade = document.querySelector(".grade-produtos");

  grade.innerHTML = produtos.map(p => `
    <article class="produto">
      <span class="tag-turma">Turma ${p.turma}</span>
      <div class="produto-icone">${p.icone}</div>
      <h4>${p.nome}</h4>
      <p>Produto criado pelos alunos.</p>
      <div class="rodape-card">
        <span class="preco">${p.preco} Tomazinhos</span>
        <button class="btn-comprar" onclick="adicionarAoCarrinho('${p.nome}', ${p.preco})">
          Comprar
        </button>
      </div>
    </article>
  `).join("");
}

carregarProdutos();
