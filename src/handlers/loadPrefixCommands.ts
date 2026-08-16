import { pathToFileURL } from "node:url";
import type { Client } from "discord.js";
import type { PrefixCommand } from "../types/command.js";
import { findTsFiles } from "../utils/fileWalker.js";
import { logger } from "../utils/logger.js";

/**
 * Carrega todos os comandos de prefixo em src/prefixCommands/**.
 *
 * Nem todo Slash Command precisa ter uma versão de prefixo — comandos
 * com várias opções (a maioria dos administrativos/moderação) ficam
 * bem mais difíceis de usar quando digitados manualmente, então
 * reserve o prefixo para comandos simples (ping, level, rank...), como
 * a especificação original já sugeria ao tratar o prefixo como um
 * método secundário.
 *
 * COMO ADICIONAR: crie um arquivo em src/prefixCommands/<categoria>/
 * que exporte, como `default`, um objeto no formato PrefixCommand.
 */
export async function loadPrefixCommands(client: Client, commandsDir: string): Promise<void> {
  const files = findTsFiles(commandsDir);
  let loaded = 0;

  for (const file of files) {
    const imported = await import(pathToFileURL(file).href);
    const command: PrefixCommand | undefined = imported.default;

    if (!command?.name || !command.execute) {
      logger.warn(`Comando de prefixo ignorado (formato inválido): ${file}`);
      continue;
    }

    client.prefixCommands.set(command.name, command);
    loaded++;
  }

  logger.info(`${loaded} comando(s) de prefixo carregado(s).`);
}
