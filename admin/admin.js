let perfil = null;
let grupos = [];

function dinheiro(v) { return `${v} Tomazinho${Number(v) === 1 ? '' : 's'}`; }
function esc(txt) { return String(txt ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function loginGoogle() { await window.TomazinhoAuth.loginGoogle(); }
async function logout() { await window.TomazinhoAuth.logout(); }

function mensagem(id, texto, ok = true) {
  const el = document.getElementById(id);
  el.style.display = 'block';
  el.textContent = texto;
  el.style.background = ok ? '#eefdf3' : '#fff0ef';
  el.style.color = ok ? '#2b7a40' : '#b24040';
  el.style.borderColor = ok ? '#c8f0d2' : '#ffc8c4';
}

async function iniciarPainel() {
  try {
    await window.TomazinhoAuth.initSupabase();
    const session = await window.TomazinhoAuth.getSession();
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const status = document.getElementById('statusPainel');

    if (!session) {
      btnLogin.style.display = 'inline-flex';
      btnLogout.style.display = 'none';
      status.textContent = 'Entre com Google para acessar o painel.';
      return;
    }

    btnLogin.style.display = 'none';
    btnLogout.style.display = 'inline-flex';

    const dados = await window.TomazinhoAuth.apiFetch('/api/perfil');
    perfil = dados.perfil;

    if (!perfil || !['seller', 'admin'].includes(perfil.tipo)) {
      status.textContent = 'Seu usuário ainda não foi liberado como vendedor ou admin pelo professor.';
      return;
    }

    status.textContent = `${perfil.nome || dados.user.email} • ${perfil.tipo === 'admin' ? 'Admin geral' : 'Grupo vendedor'}`;
    document.getElementById('conteudoPainel').style.display = 'grid';

    if (perfil.tipo !== 'admin') {
      document.getElementById('cardUsuarios').style.display = 'none';
      document.getElementById('cardGrupos').style.display = 'none';
    }

    await carregarTudo();
  } catch (e) {
    document.getElementById('statusPainel').textContent = e.message;
  }
}

async function carregarTudo() {
  await carregarGrupos();
  await carregarProdutos();
  await carregarVendas();
  if (perfil.tipo === 'admin') await carregarUsuarios();
}

async function carregarGrupos() {
  grupos = await window.TomazinhoAuth.apiFetch('/api/grupos');
  const sel = document.getElementById('grupoProduto');
  sel.innerHTML = grupos.map(g => `<option value="${g.id}">${esc(g.nome)}</option>`).join('');
  if (perfil.tipo === 'seller') {
    sel.value = perfil.grupo_id || '';
    sel.disabled = true;
  }
  const lista = document.getElementById('listaGrupos');
  lista.innerHTML = grupos.map(g => `<div class="admin-item"><strong>${esc(g.nome)}</strong><span>${esc(g.descricao || '')}</span></div>`).join('');
}

async function criarGrupo() {
  try {
    const nome = document.getElementById('nomeGrupo').value;
    const descricao = document.getElementById('descricaoGrupo').value;
    await window.TomazinhoAuth.apiFetch('/api/grupos', { method: 'POST', body: JSON.stringify({ nome, descricao }) });
    document.getElementById('nomeGrupo').value = '';
    document.getElementById('descricaoGrupo').value = '';
    await carregarGrupos();
  } catch (e) { alert(e.message); }
}

async function cadastrarProduto() {
  try {
    const produto = {
      nome: document.getElementById('nome').value,
      preco: Number(document.getElementById('preco').value),
      estoque: Number(document.getElementById('estoque').value),
      turma: document.getElementById('turma').value,
      icone: document.getElementById('icone').value || '🛍️',
      descricao: document.getElementById('descricao').value,
      grupo_id: document.getElementById('grupoProduto').value
    };
    await window.TomazinhoAuth.apiFetch('/api/produtos', { method: 'POST', body: JSON.stringify(produto) });
    ['nome','preco','estoque','turma','icone','descricao'].forEach(id => document.getElementById(id).value = '');
    mensagem('msgProduto', 'Produto cadastrado com sucesso!');
    await carregarProdutos();
  } catch (e) {
    mensagem('msgProduto', e.message, false);
  }
}

async function carregarProdutos() {
  const produtos = await window.TomazinhoAuth.apiFetch('/api/produtos?todos=1');
  const lista = document.getElementById('listaProdutos');
  if (!produtos.length) {
    lista.innerHTML = '<div class="admin-item">Nenhum produto cadastrado ainda.</div>';
    return;
  }
  lista.innerHTML = produtos.map(p => `
    <div class="admin-item">
      <strong>${esc(p.icone || '🛍️')} ${esc(p.nome)}</strong>
      <span>${esc(p.descricao || '')}</span>
      <span class="badge">${dinheiro(p.preco)} • Estoque: ${p.estoque} • ${p.ativo ? 'Ativo' : 'Inativo'}</span>
      <small>Grupo: ${esc(p.grupos?.nome || 'sem grupo')} | Turma: ${esc(p.turma || '-')}</small>
      <div class="row-actions">
        <input id="estoque-${p.id}" type="number" value="${p.estoque}" min="0" title="Estoque">
        <button class="mini-btn" onclick="atualizarProduto('${p.id}', { estoque: Number(document.getElementById('estoque-${p.id}').value) })">Atualizar estoque</button>
        <button class="mini-btn mini-btn-sair" onclick="atualizarProduto('${p.id}', { ativo: ${!p.ativo} })">${p.ativo ? 'Desativar' : 'Ativar'}</button>
      </div>
    </div>
  `).join('');
}

async function atualizarProduto(id, dados) {
  try {
    await window.TomazinhoAuth.apiFetch('/api/produtos', { method: 'PATCH', body: JSON.stringify({ id, ...dados }) });
    await carregarProdutos();
  } catch (e) { alert(e.message); }
}

async function carregarUsuarios() {
  const usuarios = await window.TomazinhoAuth.apiFetch('/api/usuarios');
  const lista = document.getElementById('listaUsuarios');
  if (!usuarios.length) {
    lista.innerHTML = '<div class="admin-item">Nenhum usuário entrou ainda.</div>';
    return;
  }
  const opcoesGrupos = ['<option value="">Sem grupo</option>', ...grupos.map(g => `<option value="${g.id}">${esc(g.nome)}</option>`)].join('');
  lista.innerHTML = usuarios.map(u => `
    <div class="admin-item">
      <strong>${esc(u.nome || 'Sem nome')}</strong>
      <span>${esc(u.email || '')}</span>
      <span class="badge">${esc(u.tipo)} • Saldo: ${dinheiro(u.saldo || 0)} • Turma: ${esc(u.turma || '-')}</span>
      <div class="row-actions">
        <select id="tipo-${u.id}">
          ${['pendente','student','seller','admin'].map(t => `<option value="${t}" ${u.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <input id="saldo-${u.id}" type="number" value="${u.saldo || 0}" min="0">
        <input id="turma-${u.id}" value="${esc(u.turma || '')}" placeholder="Turma">
        <select id="grupo-${u.id}">${opcoesGrupos}</select>
        <button class="mini-btn" onclick="salvarUsuario('${u.id}')">Salvar</button>
      </div>
    </div>
  `).join('');

  usuarios.forEach(u => {
    const sel = document.getElementById(`grupo-${u.id}`);
    if (sel) sel.value = u.grupo_id || '';
  });
}

async function salvarUsuario(id) {
  try {
    const payload = {
      id,
      tipo: document.getElementById(`tipo-${id}`).value,
      saldo: Number(document.getElementById(`saldo-${id}`).value),
      turma: document.getElementById(`turma-${id}`).value,
      grupo_id: document.getElementById(`grupo-${id}`).value || null
    };
    await window.TomazinhoAuth.apiFetch('/api/usuarios', { method: 'PATCH', body: JSON.stringify(payload) });
    await carregarUsuarios();
  } catch (e) { alert(e.message); }
}

async function carregarVendas() {
  const vendas = await window.TomazinhoAuth.apiFetch('/api/vendas');
  const lista = document.getElementById('listaVendas');
  if (!vendas.length) {
    lista.innerHTML = '<div class="admin-item">Nenhuma venda registrada ainda.</div>';
    return;
  }
  lista.innerHTML = vendas.map(v => `
    <div class="admin-item">
      <strong>${esc(v.produtos?.icone || '🛍️')} ${esc(v.produtos?.nome || 'Produto')}</strong>
      <span>Comprador: ${esc(v.usuarios?.nome || v.usuarios?.email || 'Aluno')}</span>
      <span class="badge">Qtd: ${v.quantidade} • Total: ${dinheiro(v.total)} • ${esc(v.grupos?.nome || '')}</span>
      <small>${new Date(v.created_at).toLocaleString('pt-BR')}</small>
    </div>
  `).join('');
}

iniciarPainel();
