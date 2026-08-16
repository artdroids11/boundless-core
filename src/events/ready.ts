import { Events, type Client } from "discord.js";
import type { BotEvent } from "../types/event.js";
import { logger } from "../utils/logger.js";

const event: BotEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client<true>) {
    logger.success(`Conectado como ${client.user.tag} — pronto para navegar pelos mares.`);
    logger.info(`Servindo ${client.guilds.cache.size} servidor(es).`);
  },
};

export default event;
