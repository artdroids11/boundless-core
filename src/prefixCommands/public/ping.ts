import { CommandCategory, type PrefixCommand } from "../../types/command.js";
import { PermissionLevel } from "../../services/permissions.js";
import { createInfoEmbed } from "../../utils/embeds.js";

const command: PrefixCommand = {
  name: "ping",
  category: CommandCategory.PUBLIC,
  permissionLevel: PermissionLevel.MEMBER,
  async execute(message) {
    const enviada = await message.reply({ embeds: [createInfoEmbed("Calculando...", "🏓 Pong!")] });
    const latencia = enviada.createdTimestamp - message.createdTimestamp;

    await enviada.edit({
      embeds: [createInfoEmbed(`🏓 **Latência:** ${latencia}ms\n📡 **WebSocket:** ${message.client.ws.ping}ms`, "Pong!")],
    });
  },
};

export default command;
