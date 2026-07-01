teste de retorno 

# Feira do Tomazinho - Vercel + Supabase

Sistema escolar de compra e venda com moeda fictícia Tomazinho.

## Funções principais

- Login com Google pelo Supabase Auth.
- Aluno comprador consulta saldo, compra produtos e vê histórico.
- Grupo vendedor cadastra produtos e acompanha vendas do próprio grupo.
- Professor/admin libera usuários, altera saldos, cria grupos e vê relatórios.
- Compra segura por função SQL: desconta saldo, reduz estoque e registra compra no banco.

## 1. Criar projeto no Supabase

1. Acesse o Supabase e crie um novo projeto.
2. Abra o **SQL Editor**.
3. Copie e execute o arquivo `sql/schema.sql`.

## 2. Ativar login com Google no Supabase

No Supabase:

1. Vá em **Authentication > Providers**.
2. Ative **Google**.
3. Configure Client ID e Client Secret do Google Cloud.
4. Em **Authentication > URL Configuration**, coloque a URL do seu site da Vercel.

Durante teste local, pode usar:

```txt
http://localhost:3000
```

Depois na Vercel, use:

```txt
https://seu-projeto.vercel.app
```

## 3. Variáveis na Vercel

Em **Vercel > Project > Settings > Environment Variables**, configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

A `SUPABASE_SERVICE_ROLE_KEY` deve ficar apenas na Vercel. Não coloque essa chave no front-end.

## 4. Primeiro admin

1. Entre no site com seu Google.
2. O usuário aparecerá como `pendente` na tabela `usuarios`.
3. No SQL Editor do Supabase, rode:

```sql
update public.usuarios
set tipo = 'admin', saldo = 999
where email = 'SEU_EMAIL@gmail.com';
```

4. Acesse `/admin/admin.html`.
5. A partir daí, você libera alunos e grupos pelo painel.

## 5. Tipos de usuário

- `pendente`: login feito, mas ainda sem acesso liberado.
- `student`: aluno comprador do 6º ano.
- `seller`: grupo vendedor do Ensino Médio.
- `admin`: professor/admin geral.

## 6. Como liberar os grupos vendedores

1. Peça para o aluno responsável de cada grupo entrar com Google.
2. No painel admin, encontre o usuário.
3. Mude o tipo para `seller`.
4. Escolha o grupo: Grupo 1, Grupo 2, Grupo 3 ou Grupo 4.
5. Salve.

## 7. Como liberar alunos compradores

1. Peça para o aluno entrar com Google.
2. No painel admin, mude o tipo para `student`.
3. Defina turma e saldo inicial.
4. Salve.

## Observação

O arquivo original usava `/api/produtos.js` com produtos em memória. Essa versão substitui isso por Supabase, porque no Vercel a memória pode resetar entre execuções.


## Imagens dos produtos

Esta versão troca o campo de emoji por upload de imagem no painel de produtos.
As imagens são salvas no Supabase Storage, no bucket público chamado `produtos`, e a tabela `produtos` guarda apenas o link no campo `imagem_url`.

Antes de testar o cadastro com imagem, execute novamente o arquivo `sql/schema.sql` no SQL Editor do Supabase. Ele cria/atualiza:

- coluna `imagem_url` na tabela `produtos`;
- bucket `produtos` no Supabase Storage;
- políticas para permitir upload por usuários `seller` e `admin`.

Limite configurado: imagens JPG, PNG ou WEBP com até 2 MB. O layout força todas as imagens para o mesmo tamanho usando `object-fit: cover`, evitando quebrar os cards.


## Atualização de preço pelo painel

No painel admin/vendedor, cada produto cadastrado agora possui campos separados para:

- atualizar preço em Tomazinhos;
- atualizar estoque;
- ativar ou desativar o produto.

Use o botão **Atualizar preço** quando algum grupo cadastrar o valor errado. O sistema valida para aceitar apenas preço maior que zero.
