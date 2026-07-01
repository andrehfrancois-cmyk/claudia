import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export const CHAVES = {
  produtos: "tomazinho:produtos",
  vendas: "tomazinho:vendas",
  alunos: "tomazinho:alunos"
};

export async function lerLista(chave) {
  const dados = await redis.get(chave);
  return Array.isArray(dados) ? dados : [];
}

export async function salvarLista(chave, lista) {
  await redis.set(chave, lista);
}
