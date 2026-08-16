import type { GuildConfig } from "../../generated/prisma/client.js";
import { prisma } from "../database/client.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

/**
 * Cache em memória da configuração de cada servidor.
 *
 * Evita consultar o banco a cada comando/mensagem, especialmente no
 * processamento de XP. O cache é
 * atualizado sempre que updateGuildConfig() é chamado, então nunca
 * fica desatualizado dentro do próprio processo do bot.
 */
const cache = new Map<string, GuildConfig>();

/**
 * Retorna a configuração do servidor, criando uma configuração padrão
 * (prefixo "b!", nenhum cargo definido) caso ele ainda não tenha uma
 * linha no banco — isso acontece automaticamente na primeira vez que
 * qualquer comando é usado em um servidor novo.
 */
export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  const cached = cache.get(guildId);
  if (cached) return cached;

  let config = await prisma.guildConfig.findUnique({ where: { guildId } });

  if (!config) {
    config = await prisma.guildConfig.create({ data: { guildId, prefix: env.DEFAULT_PREFIX } });
    logger.info(`Configuração padrão criada para o servidor ${guildId}.`);
  }

  cache.set(guildId, config);
  return config;
}

/**
 * Atualiza (ou cria, se ainda não existir) a configuração de um
 * servidor e mantém o cache em memória sincronizado.
 */
export async function updateGuildConfig(
  guildId: string,
  data: Partial<Omit<GuildConfig, "id" | "guildId" | "createdAt" | "updatedAt">>,
): Promise<GuildConfig> {
  const updated = await prisma.guildConfig.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  });

  cache.set(guildId, updated);
  return updated;
}
