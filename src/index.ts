import { Client, Collection, GatewayIntentBits } from "discord.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { loadCommands } from "./handlers/loadCommands.js";
import { loadPrefixCommands } from "./handlers/loadPrefixCommands.js";
import { loadEvents } from "./handlers/loadEvents.js";
import { startHealthServer } from "./services/healthServer.js";
import { prisma } from "./database/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Intents do Gateway do Discord.
 *
 * GuildMembers e MessageContent são "intents privilegiadas": além de
 * ativadas aqui no código, também precisam ser ativadas manualmente em
 * Discord Developer Portal > (seu app) > Bot > Privileged Gateway
 * Intents. Sem isso, o bot conecta normalmente, mas os eventos
 * relacionados (cargos de membro, conteúdo de mensagens) simplesmente
 * não chegam — veja o passo a passo no README.
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
});

client.commands = new Collection();
client.prefixCommands = new Collection();

async function main() {
  await loadCommands(client, join(__dirname, "commands"));
  await loadPrefixCommands(client, join(__dirname, "prefixCommands"));
  await loadEvents(client, join(__dirname, "events"));

  startHealthServer(client);
  await client.login(env.DISCORD_TOKEN);
}

let shuttingDown = false;
async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} recebido. Encerrando conexões com segurança...`);
  client.destroy();
  await prisma.$disconnect();
  process.exit(exitCode);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// Rejeições são registradas. Exceções não recuperáveis encerram com código
// de falha para que Docker/Railway reinicie o processo de forma limpa.
process.on("unhandledRejection", (error) => {
  logger.error("Rejeição de Promise não tratada:", error);
});

process.on("uncaughtException", (error) => {
  logger.error("Exceção não tratada:", error);
  void shutdown("uncaughtException", 1);
});

main().catch((error) => {
  logger.error("Falha crítica ao iniciar o bot:", error);
  process.exit(1);
});
