-- Feira do Tomazinho - Supabase
-- Execute este arquivo no SQL Editor do Supabase antes de publicar na Vercel.

create extension if not exists pgcrypto;

create table if not exists public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default '',
  created_at timestamptz default now()
);

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text default '',
  email text unique,
  tipo text not null default 'pendente' check (tipo in ('pendente', 'student', 'seller', 'admin')),
  turma text default '',
  grupo_id uuid references public.grupos(id) on delete set null,
  saldo integer not null default 50 check (saldo >= 0),
  created_at timestamptz default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default '',
  preco integer not null check (preco > 0),
  estoque integer not null default 0 check (estoque >= 0),
  icone text default '🛍️',
  turma text default '',
  grupo_id uuid references public.grupos(id) on delete set null,
  criado_por uuid references auth.users(id) on delete set null,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references public.usuarios(id) on delete set null,
  produto_id uuid references public.produtos(id) on delete set null,
  grupo_id uuid references public.grupos(id) on delete set null,
  quantidade integer not null check (quantidade > 0),
  total integer not null check (total >= 0),
  status text default 'confirmada',
  created_at timestamptz default now()
);

insert into public.grupos (nome, descricao)
select 'Grupo 1', 'Primeiro grupo vendedor'
where not exists (select 1 from public.grupos where nome = 'Grupo 1');

insert into public.grupos (nome, descricao)
select 'Grupo 2', 'Segundo grupo vendedor'
where not exists (select 1 from public.grupos where nome = 'Grupo 2');

insert into public.grupos (nome, descricao)
select 'Grupo 3', 'Terceiro grupo vendedor'
where not exists (select 1 from public.grupos where nome = 'Grupo 3');

insert into public.grupos (nome, descricao)
select 'Grupo 4', 'Quarto grupo vendedor'
where not exists (select 1 from public.grupos where nome = 'Grupo 4');

create or replace function public.criar_usuario_apos_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, tipo, saldo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'pendente',
    50
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_tomazinho on auth.users;
create trigger on_auth_user_created_tomazinho
after insert on auth.users
for each row execute function public.criar_usuario_apos_login();

create or replace function public.meu_tipo()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select tipo from public.usuarios where id = auth.uid();
$$;

create or replace function public.meu_grupo()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select grupo_id from public.usuarios where id = auth.uid();
$$;

create or replace function public.sou_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(select 1 from public.usuarios where id = auth.uid() and tipo = 'admin');
$$;

create or replace function public.comprar_produto(p_produto_id uuid, p_quantidade integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid := auth.uid();
  v_tipo text;
  v_saldo integer;
  v_preco integer;
  v_estoque integer;
  v_total integer;
  v_grupo uuid;
  v_compra uuid;
begin
  if v_aluno is null then
    raise exception 'Faça login para comprar.';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade inválida.';
  end if;

  select tipo, saldo into v_tipo, v_saldo
  from public.usuarios
  where id = v_aluno
  for update;

  if v_tipo is distinct from 'student' then
    raise exception 'Apenas alunos compradores podem finalizar compras.';
  end if;

  select preco, estoque, grupo_id into v_preco, v_estoque, v_grupo
  from public.produtos
  where id = p_produto_id and ativo = true
  for update;

  if v_preco is null then
    raise exception 'Produto não encontrado ou inativo.';
  end if;

  if v_estoque < p_quantidade then
    raise exception 'Estoque insuficiente.';
  end if;

  v_total := v_preco * p_quantidade;

  if v_saldo < v_total then
    raise exception 'Saldo insuficiente em Tomazinhos.';
  end if;

  update public.usuarios set saldo = saldo - v_total where id = v_aluno;
  update public.produtos set estoque = estoque - p_quantidade where id = p_produto_id;

  insert into public.compras (aluno_id, produto_id, grupo_id, quantidade, total, status)
  values (v_aluno, p_produto_id, v_grupo, p_quantidade, v_total, 'confirmada')
  returning id into v_compra;

  return v_compra;
end;
$$;

alter table public.usuarios enable row level security;
alter table public.grupos enable row level security;
alter table public.produtos enable row level security;
alter table public.compras enable row level security;

drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios
for select using (id = auth.uid() or public.sou_admin());

drop policy if exists usuarios_update_admin on public.usuarios;
create policy usuarios_update_admin on public.usuarios
for update using (public.sou_admin()) with check (public.sou_admin());

drop policy if exists grupos_select on public.grupos;
create policy grupos_select on public.grupos
for select using (true);

drop policy if exists grupos_admin_all on public.grupos;
create policy grupos_admin_all on public.grupos
for all using (public.sou_admin()) with check (public.sou_admin());

drop policy if exists produtos_select on public.produtos;
create policy produtos_select on public.produtos
for select using (ativo = true or public.sou_admin() or grupo_id = public.meu_grupo());

drop policy if exists produtos_insert_seller_admin on public.produtos;
create policy produtos_insert_seller_admin on public.produtos
for insert with check (
  public.sou_admin()
  or (public.meu_tipo() = 'seller' and grupo_id = public.meu_grupo())
);

drop policy if exists produtos_update_seller_admin on public.produtos;
create policy produtos_update_seller_admin on public.produtos
for update using (
  public.sou_admin()
  or (public.meu_tipo() = 'seller' and grupo_id = public.meu_grupo())
) with check (
  public.sou_admin()
  or (public.meu_tipo() = 'seller' and grupo_id = public.meu_grupo())
);

drop policy if exists compras_select on public.compras;
create policy compras_select on public.compras
for select using (
  aluno_id = auth.uid()
  or public.sou_admin()
  or grupo_id = public.meu_grupo()
);

-- Compra é feita pela função comprar_produto; por segurança, não criamos policy de insert direto para usuários comuns.

-- Depois do primeiro login, transforme seu usuário em admin com algo assim:
-- update public.usuarios set tipo = 'admin', saldo = 999 where email = 'SEU_EMAIL@gmail.com';
