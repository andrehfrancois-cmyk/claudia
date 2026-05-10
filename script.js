let perfilAtual = null;
let produtosDisponiveis = [];
let carrinho = [];

const dinheiro = (valor) => `${valor} Tomazinho${Number(valor) === 1 ? '' : 's'}`;

function atualizarTela() {
  const lista = document.getElementById('listaCarrinho');
  const total = carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
  document.getElementById('totalCarrinho').textContent = dinheiro(total);

  if (carrinho.length === 0) {
    lista.innerHTML = '<div class="item-carrinho">Nenhum produto escolhido ainda ✨</div>';
    return;
  }

  lista.innerHTML = carrinho.map(item => `
    <div class="item-carrinho">
      <span>${item.icone || '🛍️'} ${item.nome} <small>x${item.quantidade}</small></span>
      <strong>${dinheiro(item.preco * item.quantidade)}</strong>
    </div>
  `).join('');
}

function mostrarMensagem(texto, sucesso = true) {
  const mensagem = document.getElementById('mensagemCompra');
  mensagem.style.display = 'block';
  mensagem.textContent = texto;
  mensagem.style.background = sucesso ? '#eefdf3' : '#fff0ef';
  mensagem.style.color = sucesso ? '#2b7a40' : '#b24040';
  mensagem.style.borderColor = sucesso ? '#c8f0d2' : '#ffc8c4';
}

async function loginGoogle() {
  await window.TomazinhoAuth.loginGoogle();
}

async function logout() {
  await window.TomazinhoAuth.logout();
}

async function carregarPerfil() {
  const session = await window.TomazinhoAuth.getSession();
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');
  const usuarioNome = document.getElementById('usuarioNome');
  const saldo = document.getElementById('saldoTomazinho');
  const aviso = document.getElementById('avisoLogin');

  if (!session) {
    perfilAtual = null;
    btnLogin.style.display = 'inline-flex';
    btnLogout.style.display = 'none';
    usuarioNome.textContent = 'Visitante';
    saldo.textContent = 'Entre para ver o saldo';
    aviso.innerHTML = '<strong>🔐 Login escolar</strong><p>Entre com Google para consultar saldo, comprar e ver histórico.</p>';
    return;
  }

  btnLogin.style.display = 'none';
  btnLogout.style.display = 'inline-flex';

  try {
    const dados = await window.TomazinhoAuth.apiFetch('/api/perfil');
    perfilAtual = dados.perfil;
    usuarioNome.textContent = perfilAtual?.nome || dados.user.email;

    if (!perfilAtual || perfilAtual.tipo === 'pendente') {
      saldo.textContent = 'Aguardando liberação';
      aviso.innerHTML = '<strong>⏳ Acesso pendente</strong><p>Seu login funcionou, mas o professor ainda precisa liberar seu tipo de acesso no painel admin.</p>';
      return;
    }

    if (perfilAtual.tipo === 'student') {
      saldo.textContent = dinheiro(perfilAtual.saldo);
      aviso.innerHTML = '<strong>✅ Aluno liberado</strong><p>Agora você pode escolher produtos e finalizar suas compras com Tomazinhos.</p>';
      await carregarHistorico();
    } else {
      saldo.textContent = perfilAtual.tipo === 'admin' ? 'Professor/Admin' : 'Grupo vendedor';
      aviso.innerHTML = '<strong>🧑‍🏫 Acesso administrativo</strong><p>Use o painel para cadastrar produtos, acompanhar vendas e gerenciar usuários.</p>';
    }
  } catch (e) {
    aviso.innerHTML = `<strong>⚠️ Erro</strong><p>${e.message}</p>`;
  }
}

async function carregarProdutos() {
  const grade = document.getElementById('gradeProdutos');
  try {
    produtosDisponiveis = await window.TomazinhoAuth.apiFetch('/api/produtos');
    if (!produtosDisponiveis.length) {
      grade.innerHTML = '<article class="produto"><h4>Nenhum produto ativo ainda</h4><p>Os grupos vendedores ainda vão cadastrar os produtos.</p></article>';
      return;
    }

    grade.innerHTML = produtosDisponiveis.map(p => `
      <article class="produto">
        <span class="tag-turma">${p.grupos?.nome || p.turma || 'Grupo vendedor'}</span>
        <div class="produto-icone">${p.icone || '🛍️'}</div>
        <h4>${p.nome}</h4>
        <p>${p.descricao || 'Produto criado pelos alunos.'}</p>
        <small class="estoque">Estoque: ${p.estoque}</small>
        <div class="rodape-card">
          <span class="preco">${dinheiro(p.preco)}</span>
          <button class="btn-comprar" onclick="adicionarAoCarrinho('${p.id}')">Comprar</button>
        </div>
      </article>
    `).join('');
  } catch (e) {
    grade.innerHTML = `<article class="produto"><h4>Erro ao carregar produtos</h4><p>${e.message}</p></article>`;
  }
}

function adicionarAoCarrinho(id) {
  if (!perfilAtual) {
    mostrarMensagem('Entre com Google antes de comprar.', false);
    return;
  }
  if (perfilAtual.tipo !== 'student') {
    mostrarMensagem('Este acesso não é de aluno comprador.', false);
    return;
  }

  const produto = produtosDisponiveis.find(p => p.id === id);
  if (!produto) return;
  const item = carrinho.find(i => i.id === id);
  const quantidadeAtual = item?.quantidade || 0;
  if (quantidadeAtual + 1 > produto.estoque) {
    mostrarMensagem('Não há estoque suficiente para adicionar mais unidades.', false);
    return;
  }
  if (item) item.quantidade += 1;
  else carrinho.push({ id: produto.id, nome: produto.nome, preco: produto.preco, icone: produto.icone, quantidade: 1 });
  atualizarTela();
  mostrarMensagem(`${produto.nome} foi adicionado ao carrinho!`);
}

function limparCarrinho() {
  carrinho = [];
  atualizarTela();
  mostrarMensagem('Carrinho limpo com sucesso!');
}

async function finalizarCompra() {
  if (!perfilAtual || perfilAtual.tipo !== 'student') {
    mostrarMensagem('Faça login como aluno comprador para finalizar.', false);
    return;
  }

  const total = carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
  if (carrinho.length === 0) return mostrarMensagem('Escolha pelo menos um produto antes de finalizar.', false);
  if (total > perfilAtual.saldo) return mostrarMensagem('Você não tem Tomazinhos suficientes para essa compra.', false);

  try {
    for (const item of carrinho) {
      await window.TomazinhoAuth.apiFetch('/api/comprar', {
        method: 'POST',
        body: JSON.stringify({ produto_id: item.id, quantidade: item.quantidade })
      });
    }
    const qtd = carrinho.reduce((s, i) => s + i.quantidade, 0);
    carrinho = [];
    atualizarTela();
    mostrarMensagem(`Compra concluída! Você comprou ${qtd} item(ns). Parabéns!`);
    await carregarPerfil();
    await carregarProdutos();
  } catch (e) {
    mostrarMensagem(e.message, false);
  }
}

async function carregarHistorico() {
  const el = document.getElementById('historicoCompras');
  try {
    const compras = await window.TomazinhoAuth.apiFetch('/api/minhas-compras');
    if (!compras.length) {
      el.innerHTML = '<div class="item-carrinho">Nenhuma compra realizada ainda.</div>';
      return;
    }
    el.innerHTML = compras.map(c => `
      <div class="item-carrinho">
        <span>${c.produtos?.icone || '🛍️'} ${c.produtos?.nome || 'Produto'} x${c.quantidade}</span>
        <strong>${dinheiro(c.total)}</strong>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = `<div class="item-carrinho">${e.message}</div>`;
  }
}

async function iniciar() {
  try {
    await window.TomazinhoAuth.initSupabase();
    await carregarPerfil();
    await carregarProdutos();
    atualizarTela();
  } catch (e) {
    document.getElementById('avisoLogin').innerHTML = `<strong>⚠️ Configuração pendente</strong><p>${e.message}</p>`;
  }
}

iniciar();
