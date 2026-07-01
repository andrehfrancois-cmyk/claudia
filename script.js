let perfilAtual = null;
let sessionAtual = null;

function dinheiro(valor) {
  return `${Number(valor || 0)} Tomazinhos`;
}

function mostrarMensagem(texto, sucesso = true) {
  const mensagem = document.getElementById("mensagemCompra");
  mensagem.style.display = "block";
  mensagem.textContent = texto;
  mensagem.style.background = sucesso ? "#eefdf3" : "#fff0ef";
  mensagem.style.color = sucesso ? "#2b7a40" : "#b24040";
  mensagem.style.borderColor = sucesso ? "#c8f0d2" : "#ffc8c4";
}

function atualizarCabecalho() {
  const usuario = document.getElementById("usuarioAtual");
  const saldo = document.getElementById("saldoTomazinho");
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");
  const btnAdmin = document.getElementById("btnAdmin");

  if (!sessionAtual) {
    usuario.textContent = "Entre para começar";
    saldo.textContent = "0 Tomazinhos";
    btnLogin.style.display = "inline-flex";
    btnLogout.style.display = "none";
    btnAdmin.style.display = "none";
    return;
  }

  usuario.textContent = perfilAtual
    ? `${perfilAtual.nome || sessionAtual.user.email} (${perfilAtual.tipo})`
    : sessionAtual.user.email;
  saldo.textContent = dinheiro(perfilAtual?.saldo || 0);
  btnLogin.style.display = "none";
  btnLogout.style.display = "inline-flex";
  btnAdmin.style.display = ["seller", "admin"].includes(perfilAtual?.tipo)
    ? "inline-flex"
    : "none";
}

async function carregarPerfil() {
  sessionAtual = await TomazinhoAuth.getSession();

  if (!sessionAtual) {
    perfilAtual = null;
    atualizarCabecalho();
    return;
  }

  try {
    const dados = await TomazinhoAuth.apiFetch("/api/perfil");
    perfilAtual = dados.perfil;
  } catch (error) {
    perfilAtual = null;
    mostrarMensagem(error.message, false);
  }

  atualizarCabecalho();
}

async function carregarProdutos() {
  const grade = document.getElementById("gradeProdutos");

  try {
    const produtos = await TomazinhoAuth.apiFetch("/api/produtos");
    const ativos = produtos.filter((produto) => produto.ativo !== false);

    if (!ativos.length) {
      grade.innerHTML = `
        <article class="produto">
          <div class="produto-icone">🛍️</div>
          <h4>Nenhum produto ainda</h4>
          <p>Os grupos vendedores ainda vão cadastrar os produtos da feira.</p>
          <div class="rodape-card">
            <span class="preco">Em breve</span>
          </div>
        </article>
      `;
      return;
    }

    grade.innerHTML = ativos.map((produto) => {
      const imagem = produto.imagem_url
        ? `<img class="produto-img" src="${produto.imagem_url}" alt="${produto.nome}">`
        : `<div class="produto-icone">${produto.icone || "🛍️"}</div>`;

      const semEstoque = Number(produto.estoque || 0) <= 0;

      return `
        <article class="produto">
          <span class="tag-turma">${produto.grupos?.nome || produto.turma || "Grupo"}</span>
          ${imagem}
          <h4>${produto.nome}</h4>
          <p>${produto.descricao || "Produto criado pelos alunos."}</p>
          <div class="rodape-card">
            <span class="preco">${produto.preco} Tomazinhos</span>
            <small>Estoque: ${produto.estoque}</small>
            <button
              class="btn-comprar"
              onclick="comprarProduto('${produto.id}')"
              ${semEstoque ? "disabled" : ""}
            >
              ${semEstoque ? "Esgotado" : "Comprar"}
            </button>
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    grade.innerHTML = `
      <article class="produto">
        <div class="produto-icone">!</div>
        <h4>Erro ao carregar</h4>
        <p>${error.message}</p>
      </article>
    `;
  }
}

async function comprarProduto(produtoId) {
  if (!sessionAtual) {
    mostrarMensagem("Entre com Google antes de comprar.", false);
    return;
  }

  if (perfilAtual?.tipo !== "student") {
    mostrarMensagem("Apenas alunos compradores liberados podem finalizar compras.", false);
    return;
  }

  const confirmar = confirm("Confirmar compra deste produto?");
  if (!confirmar) return;

  try {
    await TomazinhoAuth.apiFetch("/api/comprar", {
      method: "POST",
      body: JSON.stringify({ produto_id: produtoId, quantidade: 1 })
    });
    mostrarMensagem("Compra concluída com sucesso.");
    await carregarPerfil();
    await carregarProdutos();
    await carregarCompras();
  } catch (error) {
    mostrarMensagem(error.message, false);
  }
}

async function carregarCompras() {
  const lista = document.getElementById("listaCompras");

  if (!sessionAtual) {
    lista.innerHTML = '<div class="item-carrinho">Entre com Google para ver seu histórico.</div>';
    return;
  }

  try {
    const compras = await TomazinhoAuth.apiFetch("/api/minhas-compras");

    if (!compras.length) {
      lista.innerHTML = '<div class="item-carrinho">Nenhuma compra registrada ainda.</div>';
      return;
    }

    lista.innerHTML = compras.map((compra) => `
      <div class="item-carrinho">
        <span>${compra.produtos?.nome || "Produto"} x${compra.quantidade}</span>
        <strong>${compra.total} T</strong>
      </div>
    `).join("");
  } catch (error) {
    lista.innerHTML = `<div class="item-carrinho">${error.message}</div>`;
  }
}

async function iniciar() {
  try {
    await TomazinhoAuth.initSupabase();
    await carregarPerfil();
    await carregarProdutos();
    await carregarCompras();
  } catch (error) {
    mostrarMensagem(error.message, false);
  }
}

iniciar();
