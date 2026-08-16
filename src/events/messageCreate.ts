import { Events, type Message } from "discord.js";
import type { BotEvent } from "../types/event.js";
import { getGuildConfig } from "../services/guildConfig.js";
import { resolvePermissionLevel, permissionLevelLabel } from "../services/permissions.js";
import { logger } from "../utils/logger.js";
import { processXpMessage } from "../services/xp.js";

const event: BotEvent = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    // Ignora bots/webhooks e mensagens fora de servidores (DMs).
    if (message.author.bot || !message.inGuild()) return;

    const guildConfig = await getGuildConfig(message.guildId);
    const prefix = guildConfig.prefix;

    try {
      await processXpMessage(message, guildConfig);
    } catch (error) {
      logger.warn(`Falha ao processar XP de ${message.author.id}:`, error);
    }

    if (!guildConfig.legacyPrefixEnabled || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command =
      message.client.prefixCommands.get(commandName) ??
      [...message.client.prefixCommands.values()].find((c) => c.aliases?.includes(commandName));

    if (!command) return;

    const member = message.member;
    if (!member) return;

    try {
      const level = resolvePermissionLevel(member, guildConfig, message.guild.ownerId);

      if (level < command.permissionLevel) {
        await message.reply(
          `Você precisa do nível **${permissionLevelLabel(command.permissionLevel)}** ou superior para usar este comando.`,
        );
        return;
      }

      await command.execute(message, args, { level, guildConfig });
    } catch (error) {
      logger.error(`Erro ao executar comando de prefixo "${commandName}":`, error);
      await message.reply("❌ Não foi possível executar esta ação. O erro foi registrado para a equipe.");
    }
  },
};

export default event;
