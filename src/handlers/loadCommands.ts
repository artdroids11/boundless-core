import { pathToFileURL } from "node:url";
import type { Client } from "discord.js";
import type { SlashCommand } from "../types/command.js";
import { findTsFiles } from "../utils/fileWalker.js";
import { logger } from "../utils/logger.js";

/**
 * Carrega todos os Slash Commands em src/commands/** e os registra na
 * Collection client.commands, indexados pelo nome do comando.
 *
 * COMO ADICIONAR UM NOVO COMANDO:
 * Crie um arquivo .ts dentro de src/commands/<categoria>/ (crie a pasta
 * da categoria se ainda não existir) que exporte, como `default`, um
 * objeto no formato da interface SlashCommand (veja src/types/command.ts
 * e os comandos existentes como exemplo). Nenhuma outra alteração é
 * necessária — este carregador encontra o arquivo sozinho.
 *
 * Lembrete: criar o comando aqui NÃO o registra no Discord. Depois de
 * criar ou alterar um comando, rode `npm run deploy-commands`.
 */
export async function loadCommands(client: Client, commandsDir: string): Promise<void> {
  const files = findTsFiles(commandsDir);
  let loaded = 0;

  for (const file of files) {
    const imported = await import(pathToFileURL(file).href);
    const command: SlashCommand | undefined = imported.default;

    if (!command?.data || !command.execute) {
      logger.warn(`Comando ignorado (formato inválido): ${file}`);
      continue;
    }

    client.commands.set(command.data.name, command);
    loaded++;
  }

  logger.info(`${loaded} slash command(s) carregado(s).`);
}
