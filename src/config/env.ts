import "dotenv/config";
import { resolve } from "node:path";

/**
 * Ponto único de leitura das variáveis de ambiente do bot.
 *
 * O resto do código NUNCA deve acessar `process.env` diretamente —
 * sempre importe `env` a partir daqui. Isso garante que, se faltar uma
 * variável obrigatória, o bot falha imediatamente ao iniciar com uma
 * mensagem clara, em vez de quebrar de forma confusa em algum ponto
 * aleatório de execução (ex: só quando alguém tenta fazer login).
 *
 * Para adicionar uma nova variável: declare-a no objeto `env` abaixo
 * (use `required` para variáveis obrigatórias) e documente-a também em
 * `.env.example`.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Variável de ambiente obrigatória ausente: "${name}". Confira seu arquivo .env (veja .env.example como referência).`,
    );
  }
  return value;
}

function integer(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Variável ${name} deve ser um inteiro entre ${minimum} e ${maximum}.`);
  }
  return value;
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!value.startsWith("file:")) return value;
  const path = value.slice(5);
  if (path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path)) return value.replaceAll("\\", "/");
  return `file:${resolve(process.cwd(), path).replaceAll("\\", "/")}`;
}

export const env = {
  DISCORD_TOKEN: required("DISCORD_TOKEN"),
  DISCORD_CLIENT_ID: required("DISCORD_CLIENT_ID"),

  DATABASE_URL: databaseUrl(),
  DEFAULT_PREFIX: process.env.DEFAULT_PREFIX ?? "b!",

  /** Quando definido, os Slash Commands são registrados só neste servidor
   *  (propaga em segundos — ideal para desenvolvimento). Deixe vazio em
   *  produção para registrar globalmente. */
  DEV_GUILD_ID: process.env.DEV_GUILD_ID ?? "",
  HEALTH_PORT: integer("PORT", integer("HEALTH_PORT", 3000, 1, 65_535), 1, 65_535),
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
