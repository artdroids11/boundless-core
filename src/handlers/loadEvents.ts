import { pathToFileURL } from "node:url";
import type { Client } from "discord.js";
import type { BotEvent } from "../types/event.js";
import { findTsFiles } from "../utils/fileWalker.js";
import { logger } from "../utils/logger.js";

/**
 * Carrega todos os eventos em src/events/ e os liga (bind) ao client.
 *
 * COMO ADICIONAR: crie um arquivo em src/events/ que exporte, como
 * `default`, um objeto BotEvent — `name` é o nome do evento do
 * discord.js (use o enum `Events`, ex: Events.GuildMemberAdd), `once`
 * indica se deve rodar só na primeira vez, e `execute` é a função a
 * ser chamada.
 */
export async function loadEvents(client: Client, eventsDir: string): Promise<void> {
  const files = findTsFiles(eventsDir);

  for (const file of files) {
    const imported = await import(pathToFileURL(file).href);
    const event: BotEvent | undefined = imported.default;

    if (!event?.name || !event.execute) {
      logger.warn(`Evento ignorado (formato inválido): ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  logger.info(`${files.length} evento(s) carregado(s).`);
}
