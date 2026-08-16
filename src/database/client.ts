import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";

/**
 * Instância única (singleton) do Prisma Client, compartilhada por todo
 * o bot — sempre importe `prisma` a partir daqui, nunca crie um
 * `new PrismaClient()` em outro arquivo.
 *
 * SOBRE O ADAPTER: a partir do Prisma ORM 7, o SQLite deixou de aceitar
 * a URL de conexão direto pelo bloco `datasource` do schema.prisma — o
 * Prisma Client passou a exigir um "driver adapter" explícito. É por
 * isso que importamos @prisma/adapter-better-sqlite3 abaixo: é a forma
 * atual e correta de conectar ao SQLite nesta versão do Prisma, não
 * uma escolha nossa arbitrária. Veja prisma/schema.prisma para o
 * restante da configuração do banco.
 */
const adapter = new PrismaBetterSqlite3({ url: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
