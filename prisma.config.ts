// Configuração do Prisma ORM 7.
//
// A partir da versão 7, o Prisma parou de ler a URL do banco direto do
// bloco `datasource` dentro do schema.prisma — em vez disso, a CLI do
// Prisma (usada por `prisma migrate`, `prisma studio`, etc.) lê esse
// valor a partir deste arquivo. A aplicação em si (src/database/client.ts)
// lê a mesma variável de ambiente separadamente, através do adapter.
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolve } from "node:path";

function databaseUrl(): string {
  const value = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!value.startsWith("file:")) return value;
  const path = value.slice(5);
  if (path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path)) return value.replaceAll("\\", "/");
  return `file:${resolve(process.cwd(), path).replaceAll("\\", "/")}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl(),
  },
});
