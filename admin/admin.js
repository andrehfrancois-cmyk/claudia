let perfil = null;
let grupos = [];
let usuariosCache = [];
let usuariosFiltrados = [];
let selecionados = new Set();

const TIPOS_LABEL = {
  pendente: 'Pendente',
  student: 'Comprador',
  seller: 'Vendedor',
  admin: 'Admin'
};

function dinheiro(v) { return `${Number(v || 0)} Tomazinho${Number(v || 0) === 1 ? '' : 's'}`; }
function esc(txt) { return String(txt ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function loginGoogle() { await window.TomazinhoAuth.loginGoogle(); }
async function logout() { await window.TomazinhoAuth.logout(); }

function mensagem(id, texto, ok = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  el.textContent = texto;
  el.style.background = ok ? '#eefdf3' : '#fff0ef';
  el.style.color = ok ? '#2b7a40' : '#b24040';
  el.style.borderColor = ok ? '#c8f0d2' : '#ffc8c4';
}


function previewImagemProduto() {
  const input = document.getElementById('imagemProduto');
  const preview = document.getElementById('previewProduto');
  const arquivo = input?.files?.[0];
  if (!arquivo || !preview) {
    if (preview) preview.style.display = 'none';
    return;
  }
  preview.src = URL.createObjectURL(arquivo);
  preview.style.display = 'block';
}

async function uploadImagemProduto() {
  const input = document.getElementById('imagemProduto');
  const arquivo = input?.files?.[0];
  if (!arquivo) return '';

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
  if (!tiposPermitidos.includes(arquivo.type)) {
    throw new Error('Use imagem JPG, PNG ou WEBP.');
  }
  if (arquivo.size > 2 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 2 MB.');
  }

  const sb = await window.TomazinhoAuth.initSupabase();
  const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'jpg';
  const nomeSeguro = (arquivo.name || 'produto').toLowerCase().replace(/[^a-z0-9.-]+/g, '-').slice(0, 50);
  const pasta = perfil?.grupo_id || perfil?.id || 'geral';
  const caminho = `${pasta}/${Date.now()}-${crypto.randomUUID()}-${nomeSeguro}.${extensao}`;

  const { error } = await sb.storage
    .from('produtos')
    .upload(caminho, arquivo, {
      cacheControl: '3600',
      upsert: false,
      contentType: arquivo.type
    });
  if (error) throw error;

  const { data } = sb.storage.from('produtos').getPublicUrl(caminho);
  return data.publicUrl;
}

function renderImagemProduto(p) {
  if (p.imagem_url) {
    return `<img class="produto-admin-thumb" src="${esc(p.imagem_url)}" alt="Imagem do produto ${esc(p.nome)}" loading="lazy">`;
  }
  return `<div class="produto-admin-thumb produto-admin-thumb-fallback">${esc(p.icone || '🛍️')}</div>`;
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

  const bulkGrupo = document.getElementById('bulkGrupo');
  if (bulkGrupo) {
    bulkGrupo.innerHTML = ['<option value="__manter__">Manter grupo</option>', '<option value="">Sem grupo</option>', ...grupos.map(g => `<option value="${g.id}">${esc(g.nome)}</option>`)].join('');
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
    mensagem('msgProduto', 'Enviando imagem e cadastrando produto...');
    const imagem_url = await uploadImagemProduto();
    const produto = {
      nome: document.getElementById('nome').value,
      preco: Number(document.getElementById('preco').value),
      estoque: Number(document.getElementById('estoque').value),
      turma: document.getElementById('turma').value,
      imagem_url,
      descricao: document.getElementById('descricao').value,
      grupo_id: document.getElementById('grupoProduto').value
    };
    await window.TomazinhoAuth.apiFetch('/api/produtos', { method: 'POST', body: JSON.stringify(produto) });
    ['nome','preco','estoque','turma','descricao'].forEach(id => document.getElementById(id).value = '');
    const imagemInput = document.getElementById('imagemProduto');
    const preview = document.getElementById('previewProduto');
    if (imagemInput) imagemInput.value = '';
    if (preview) {
      preview.removeAttribute('src');
      preview.style.display = 'none';
    }
    mensagem('msgProduto', 'Produto cadastrado com imagem!');
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
    <div class="admin-item produto-admin-item">
      ${renderImagemProduto(p)}
      <div class="produto-admin-info">
        <strong>${esc(p.nome)}</strong>
        <span>${esc(p.descricao || '')}</span>
        <span class="badge">${dinheiro(p.preco)} • Estoque: ${p.estoque} • ${p.ativo ? 'Ativo' : 'Inativo'}</span>
        <small>Grupo: ${esc(p.grupos?.nome || 'sem grupo')} | Turma: ${esc(p.turma || '-')}</small>
        <div class="row-actions produto-edit-actions">
          <label class="mini-field">
            <small>Preço</small>
            <input id="preco-${p.id}" type="number" value="${p.preco}" min="1" step="1" title="Preço em Tomazinhos">
          </label>
          <button class="mini-btn" onclick="atualizarProduto('${p.id}', { preco: Number(document.getElementById('preco-${p.id}').value) }, 'Preço atualizado com sucesso!')">Atualizar preço</button>
          <label class="mini-field">
            <small>Estoque</small>
            <input id="estoque-${p.id}" type="number" value="${p.estoque}" min="0" step="1" title="Estoque">
          </label>
          <button class="mini-btn" onclick="atualizarProduto('${p.id}', { estoque: Number(document.getElementById('estoque-${p.id}').value) }, 'Estoque atualizado com sucesso!')">Atualizar estoque</button>
          <button class="mini-btn mini-btn-sair" onclick="atualizarProduto('${p.id}', { ativo: ${!p.ativo} }, 'Produto ${p.ativo ? 'desativado' : 'ativado'} com sucesso!')">${p.ativo ? 'Desativar' : 'Ativar'}</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function atualizarProduto(id, dados, textoSucesso = 'Produto atualizado com sucesso!') {
  try {
    if (dados.preco !== undefined && (!Number.isFinite(dados.preco) || dados.preco <= 0)) {
      throw new Error('Informe um preço válido maior que zero.');
    }
    if (dados.estoque !== undefined && (!Number.isFinite(dados.estoque) || dados.estoque < 0)) {
      throw new Error('Informe um estoque válido igual ou maior que zero.');
    }
    await window.TomazinhoAuth.apiFetch('/api/produtos', { method: 'PATCH', body: JSON.stringify({ id, ...dados }) });
    mensagem('msgProduto', textoSucesso);
    await carregarProdutos();
  } catch (e) {
    mensagem('msgProduto', e.message, false);
  }
}

async function carregarUsuarios() {
  usuariosCache = await window.TomazinhoAuth.apiFetch('/api/usuarios');
  renderizarUsuarios();
}

function aplicarFiltrosUsuarios() {
  const busca = (document.getElementById('buscaUsuario')?.value || '').trim().toLowerCase();
  const tipo = document.getElementById('filtroTipo')?.value || '';
  const turma = (document.getElementById('filtroTurma')?.value || '').trim().toLowerCase();

  usuariosFiltrados = usuariosCache.filter(u => {
    const texto = `${u.nome || ''} ${u.email || ''}`.toLowerCase();
    const turmaTexto = `${u.turma || ''} ${u.grupos?.nome || ''}`.toLowerCase();
    return (!busca || texto.includes(busca)) && (!tipo || u.tipo === tipo) && (!turma || turmaTexto.includes(turma));
  });
}

function renderizarUsuarios() {
  const lista = document.getElementById('listaUsuarios');
  if (!lista) return;
  aplicarFiltrosUsuarios();
  atualizarSelecionadosInfo();

  if (!usuariosCache.length) {
    lista.innerHTML = '<div class="admin-item">Nenhum usuário entrou ainda.</div>';
    return;
  }
  if (!usuariosFiltrados.length) {
    lista.innerHTML = '<div class="admin-item">Nenhum usuário encontrado com esses filtros.</div>';
    return;
  }

  const opcoesGrupos = ['<option value="">Sem grupo</option>', ...grupos.map(g => `<option value="${g.id}">${esc(g.nome)}</option>`)].join('');

  lista.innerHTML = usuariosFiltrados.map(u => `
    <div class="admin-item usuario-item ${selecionados.has(u.id) ? 'selecionado' : ''}">
      <label class="check-line">
        <input type="checkbox" ${selecionados.has(u.id) ? 'checked' : ''} onchange="alternarSelecionado('${u.id}', this.checked)">
        <strong>${esc(u.nome || 'Sem nome')}</strong>
      </label>
      <span>${esc(u.email || '')}</span>
      <span class="badge">${esc(TIPOS_LABEL[u.tipo] || u.tipo)} • Saldo: ${dinheiro(u.saldo || 0)} • Turma/Grupo: ${esc(u.turma || '-')}</span>
      <div class="usuario-form">
        <input id="nome-user-${u.id}" value="${esc(u.nome || '')}" placeholder="Nome">
        <select id="tipo-${u.id}">
          ${['pendente','student','seller','admin'].map(t => `<option value="${t}" ${u.tipo === t ? 'selected' : ''}>${TIPOS_LABEL[t]}</option>`).join('')}
        </select>
        <input id="saldo-${u.id}" type="number" value="${u.saldo || 0}" min="0" title="Saldo">
        <input id="turma-${u.id}" value="${esc(u.turma || '')}" placeholder="Turma ou grupo">
        <select id="grupo-${u.id}">${opcoesGrupos}</select>
      </div>
      <div class="row-actions">
        <button class="mini-btn" onclick="salvarUsuario('${u.id}')">Salvar alterações</button>
        <button class="mini-btn" onclick="somarSaldo('${u.id}', 10)">+10</button>
        <button class="mini-btn" onclick="somarSaldo('${u.id}', 50)">+50</button>
        <button class="mini-btn mini-btn-sair" onclick="somarSaldo('${u.id}', -10)">-10</button>
      </div>
    </div>
  `).join('');

  usuariosFiltrados.forEach(u => {
    const sel = document.getElementById(`grupo-${u.id}`);
    if (sel) sel.value = u.grupo_id || '';
  });
}

function alternarSelecionado(id, marcado) {
  if (marcado) selecionados.add(id);
  else selecionados.delete(id);
  atualizarSelecionadosInfo();
}

function atualizarSelecionadosInfo() {
  const el = document.getElementById('selecionadosInfo');
  if (el) el.textContent = `${selecionados.size} selecionado${selecionados.size === 1 ? '' : 's'}`;
}

function selecionarFiltrados(marcar) {
  aplicarFiltrosUsuarios();
  usuariosFiltrados.forEach(u => marcar ? selecionados.add(u.id) : selecionados.delete(u.id));
  renderizarUsuarios();
}

async function salvarUsuario(id) {
  try {
    const payload = {
      id,
      nome: document.getElementById(`nome-user-${id}`).value,
      tipo: document.getElementById(`tipo-${id}`).value,
      saldo: Number(document.getElementById(`saldo-${id}`).value),
      turma: document.getElementById(`turma-${id}`).value,
      grupo_id: document.getElementById(`grupo-${id}`).value || null
    };
    await window.TomazinhoAuth.apiFetch('/api/usuarios', { method: 'PATCH', body: JSON.stringify(payload) });
    mensagem('msgUsuarios', 'Usuário atualizado com sucesso!');
    await carregarUsuarios();
  } catch (e) { mensagem('msgUsuarios', e.message, false); }
}

async function somarSaldo(id, valor) {
  try {
    await window.TomazinhoAuth.apiFetch('/api/usuarios', {
      method: 'PATCH',
      body: JSON.stringify({ id, saldo_modo: valor >= 0 ? 'add' : 'subtract', saldo_valor: Math.abs(valor) })
    });
    mensagem('msgUsuarios', `${valor >= 0 ? 'Pontos adicionados' : 'Pontos removidos'} com sucesso!`);
    await carregarUsuarios();
  } catch (e) { mensagem('msgUsuarios', e.message, false); }
}

async function aplicarAcaoMassa() {
  try {
    const ids = Array.from(selecionados);
    if (!ids.length) {
      mensagem('msgUsuarios', 'Selecione pelo menos um usuário.', false);
      return;
    }

    const tipo = document.getElementById('bulkTipo').value;
    const turma = document.getElementById('bulkTurma').value;
    const grupo_id = document.getElementById('bulkGrupo').value;
    const saldo_modo = document.getElementById('bulkSaldoModo').value;
    const saldo_valor = document.getElementById('bulkSaldoValor').value;

    const payload = { ids };
    if (tipo) payload.tipo = tipo;
    if (turma.trim()) payload.turma = turma.trim();
    if (grupo_id !== '__manter__') payload.grupo_id = grupo_id || null;
    if (saldo_modo) {
      payload.saldo_modo = saldo_modo;
      payload.saldo_valor = Number(saldo_valor || 0);
      if (payload.saldo_valor < 0 || Number.isNaN(payload.saldo_valor)) throw new Error('Informe um valor de saldo válido.');
    }

    if (!tipo && !turma.trim() && grupo_id === '__manter__' && !saldo_modo) {
      mensagem('msgUsuarios', 'Escolha alguma ação em massa para aplicar.', false);
      return;
    }

    await window.TomazinhoAuth.apiFetch('/api/usuarios', { method: 'PATCH', body: JSON.stringify(payload) });
    mensagem('msgUsuarios', 'Ação em massa aplicada com sucesso!');
    document.getElementById('bulkSaldoValor').value = '';
    await carregarUsuarios();
  } catch (e) { mensagem('msgUsuarios', e.message, false); }
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
      <span class="badge">Qtd: ${v.quantidade} • Total: ${dinheiro(v.total)} • ${esc(v.grupos?.nome || '')} • ${esc(v.status || 'confirmada')}</span>
      <small>${new Date(v.created_at).toLocaleString('pt-BR')}</small>
      ${v.status === 'confirmada' ? `
        <div class="row-actions">
          <button class="mini-btn mini-btn-sair" onclick="cancelarVenda('${v.id}', ${Number(v.total || 0)})">
            Cancelar venda e devolver saldo
          </button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function cancelarVenda(id, total) {
  const ok = confirm(`Cancelar esta venda e devolver ${dinheiro(total)} ao aluno?`);
  if (!ok) return;

  try {
    const resposta = await window.TomazinhoAuth.apiFetch(`/api/vendas?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    mensagem('msgProduto', resposta.mensagem || 'Venda cancelada com sucesso!');
    await carregarVendas();
    await carregarProdutos();
    if (perfil.tipo === 'admin') await carregarUsuarios();
  } catch (e) {
    mensagem('msgProduto', e.message, false);
  }
}

iniciarPainel();
