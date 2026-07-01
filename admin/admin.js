let perfilAtual = null;
let grupos = [];
let usuarios = [];

function mostrarMensagem(texto, sucesso = true) {
  const box = document.getElementById("mensagemAdmin");
  box.style.display = "block";
  box.textContent = texto;
  box.style.background = sucesso ? "#eefdf3" : "#fff0ef";
  box.style.color = sucesso ? "#2b7a40" : "#b24040";
  box.style.borderColor = sucesso ? "#c8f0d2" : "#ffc8c4";
}

function limparFormulario() {
  ["nome", "preco", "estoque", "turma", "icone", "imagemUrl", "descricao"].forEach((id) => {
    document.getElementById(id).value = "";
  });
}

async function carregarPerfil() {
  const session = await TomazinhoAuth.getSession();
  const status = document.getElementById("statusAdmin");
  const btnLogin = document.getElementById("btnLoginAdmin");
  const btnLogout = document.getElementById("btnLogoutAdmin");

  if (!session) {
    status.textContent = "Entre com Google para acessar o painel.";
    btnLogin.style.display = "inline-flex";
    btnLogout.style.display = "none";
    return false;
  }

  btnLogin.style.display = "none";
  btnLogout.style.display = "inline-flex";

  const dados = await TomazinhoAuth.apiFetch("/api/perfil");
  perfilAtual = dados.perfil;

  if (!["seller", "admin"].includes(perfilAtual?.tipo)) {
    status.textContent = "Usuário sem permissão para o painel.";
    mostrarMensagem("Peça ao professor para liberar seu usuário como vendedor ou admin.", false);
    return false;
  }

  status.textContent = `${perfilAtual.nome || dados.user.email} - ${perfilAtual.tipo}`;
  return true;
}

async function carregarGrupos() {
  grupos = await TomazinhoAuth.apiFetch("/api/grupos");
  const select = document.getElementById("grupo");

  select.innerHTML = '<option value="">Sem grupo</option>' + grupos.map((grupo) => `
    <option value="${grupo.id}">${grupo.nome}</option>
  `).join("");

  if (perfilAtual?.grupo_id) select.value = perfilAtual.grupo_id;
}

async function cadastrarProduto() {
  const produto = {
    nome: document.getElementById("nome").value.trim(),
    preco: Number(document.getElementById("preco").value),
    estoque: Number(document.getElementById("estoque").value || 0),
    turma: document.getElementById("turma").value.trim(),
    grupo_id: document.getElementById("grupo").value || null,
    icone: document.getElementById("icone").value.trim() || "🛍️",
    imagem_url: document.getElementById("imagemUrl").value.trim(),
    descricao: document.getElementById("descricao").value.trim()
  };

  try {
    await TomazinhoAuth.apiFetch("/api/produtos", {
      method: "POST",
      body: JSON.stringify(produto)
    });
    mostrarMensagem("Produto cadastrado com sucesso.");
    limparFormulario();
    await carregarProdutos();
  } catch (error) {
    mostrarMensagem(error.message, false);
  }
}

async function carregarProdutos() {
  const produtos = await TomazinhoAuth.apiFetch("/api/produtos");
  const lista = document.getElementById("listaProdutos");

  if (!produtos.length) {
    lista.innerHTML = '<div class="item-admin">Nenhum produto cadastrado ainda.</div>';
    return;
  }

  lista.innerHTML = produtos.map((produto) => `
    <div class="item-admin">
      <div>
        <strong>${produto.icone || "🛍️"} ${produto.nome}</strong><br>
        <span>${produto.preco} T - estoque ${produto.estoque} - ${produto.ativo ? "ativo" : "inativo"}</span><br>
        <small>${produto.grupos?.nome || produto.turma || ""}</small>
      </div>
      <div class="acoes-item">
        <input class="input-mini" id="preco-${produto.id}" type="number" min="1" value="${produto.preco}">
        <input class="input-mini" id="estoque-${produto.id}" type="number" min="0" value="${produto.estoque}">
        <button class="btn-pequeno btn-secundario" onclick="atualizarProduto('${produto.id}')">Atualizar</button>
        <button class="btn-pequeno btn-excluir" onclick="alternarProduto('${produto.id}', ${produto.ativo ? "false" : "true"})">
          ${produto.ativo ? "Desativar" : "Ativar"}
        </button>
      </div>
    </div>
  `).join("");
}

async function atualizarProduto(id) {
  const preco = Number(document.getElementById(`preco-${id}`).value);
  const estoque = Number(document.getElementById(`estoque-${id}`).value);

  try {
    await TomazinhoAuth.apiFetch("/api/produtos", {
      method: "PATCH",
      body: JSON.stringify({ id, preco, estoque })
    });
    mostrarMensagem("Produto atualizado.");
    await carregarProdutos();
  } catch (error) {
    mostrarMensagem(error.message, false);
  }
}

async function alternarProduto(id, ativo) {
  try {
    await TomazinhoAuth.apiFetch("/api/produtos", {
      method: "PATCH",
      body: JSON.stringify({ id, ativo })
    });
    mostrarMensagem("Status do produto atualizado.");
    await carregarProdutos();
  } catch (error) {
    mostrarMensagem(error.message, false);
  }
}

async function carregarUsuarios() {
  const lista = document.getElementById("listaUsuarios");

  if (perfilAtual?.tipo !== "admin") {
    lista.innerHTML = '<div class="item-admin">Apenas admin visualiza e libera usuários.</div>';
    return;
  }

  usuarios = await TomazinhoAuth.apiFetch("/api/usuarios");

  if (!usuarios.length) {
    lista.innerHTML = '<div class="item-admin">Nenhum usuário encontrado.</div>';
    return;
  }

  lista.innerHTML = usuarios.map((usuario) => `
    <div class="item-admin">
      <label>
        <input type="checkbox" class="usuario-check" value="${usuario.id}">
        <strong>${usuario.nome || usuario.email}</strong><br>
        <small>${usuario.email || ""}</small>
      </label>
      <div class="acoes-item">
        <select id="tipo-${usuario.id}">
          ${["pendente", "student", "seller", "admin"].map((tipo) => `
            <option value="${tipo}" ${usuario.tipo === tipo ? "selected" : ""}>${tipo}</option>
          `).join("")}
        </select>
        <select id="grupo-${usuario.id}">
          <option value="">Sem grupo</option>
          ${grupos.map((grupo) => `
            <option value="${grupo.id}" ${usuario.grupo_id === grupo.id ? "selected" : ""}>${grupo.nome}</option>
          `).join("")}
        </select>
        <input class="input-mini" id="saldo-${usuario.id}" type="number" min="0" value="${usuario.saldo}">
        <button class="btn-pequeno btn-secundario" onclick="salvarUsuario('${usuario.id}')">Salvar</button>
      </div>
    </div>
  `).join("");
}

async function salvarUsuario(id) {
  const body = {
    id,
    tipo: document.getElementById(`tipo-${id}`).value,
    grupo_id: document.getElementById(`grupo-${id}`).value || null,
    saldo: Number(document.getElementById(`saldo-${id}`).value)
  };

  try {
    await TomazinhoAuth.apiFetch("/api/usuarios", {
      method: "PATCH",
      body: JSON.stringify(body)
    });
    mostrarMensagem("Usuário atualizado.");
    await carregarUsuarios();
  } catch (error) {
    mostrarMensagem(error.message, false);
  }
}

async function aplicarSaldoSelecionados() {
  const ids = [...document.querySelectorAll(".usuario-check:checked")].map((item) => item.value);
  const saldo_modo = document.getElementById("saldoModo").value;
  const saldo_valor = Number(document.getElementById("saldoValor").value || 0);

  if (!ids.length) {
    mostrarMensagem("Selecione pelo menos um usuário.", false);
    return;
  }

  try {
    await TomazinhoAuth.apiFetch("/api/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ ids, saldo_modo, saldo_valor })
    });
    mostrarMensagem("Saldo atualizado para os usuários selecionados.");
    await carregarUsuarios();
  } catch (error) {
    mostrarMensagem(error.message, false);
  }
}

async function iniciarAdmin() {
  try {
    await TomazinhoAuth.initSupabase();
    const autorizado = await carregarPerfil();
    if (!autorizado) return;
    await carregarGrupos();
    await carregarProdutos();
    await carregarUsuarios();
  } catch (error) {
    mostrarMensagem(error.message, false);
  }
}

iniciarAdmin();
