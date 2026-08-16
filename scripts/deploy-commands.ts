import { REST, Routes } from "discord.js";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { env } from "../src/config/env.js";
import { logger } from "../src/utils/logger.js";
import { findTsFiles } from "../src/utils/fileWalker.js";
import type { SlashCommand } from "../src/types/command.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsDir = join(__dirname, "..", "src", "commands");

/**
 * Registra (ou atualiza) todos os Slash Commands junto ao Discord.
 *
 * Rode isso sempre que criar um comando novo ou mudar o nome/descrição/
 * opções de um comando já existente:
 *
 *   npm run deploy-commands
 *
 * Isso NÃO precisa ser rodado toda vez que o bot inicia — só quando a
 * "assinatura" de algum comando muda.
 */
async function main() {
  const files = findTsFiles(commandsDir);
  const body = [];

  for (const file of files) {
    const imported = await import(pathToFileURL(file).href);
    const command: SlashCommand | undefined = imported.default;

    if (!command?.data) {
      logger.warn(`Arquivo ignorado (sem "data" válido): ${file}`);
      continue;
    }

    body.push(command.data.toJSON());
  }

  const rest = new REST().setToken(env.DISCORD_TOKEN);

  if (env.DEV_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DEV_GUILD_ID), { body });
    logger.success(`${body.length} comando(s) registrado(s) no servidor de testes (${env.DEV_GUILD_ID}).`);
  } else {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
    logger.success(`${body.length} comando(s) registrado(s) globalmente (pode levar até 1h para propagar).`);
  }
}

main().catch((error) => {
  logger.error("Falha ao registrar comandos:", error);
  process.exit(1);
});
