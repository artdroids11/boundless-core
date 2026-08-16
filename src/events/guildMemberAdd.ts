import { Events, type GuildMember } from "discord.js";
import type { BotEvent } from "../types/event.js";
import { getGuildConfig } from "../services/guildConfig.js";
import { createInfoEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const event: BotEvent = {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    const config = await getGuildConfig(member.guild.id);

    if (config.memberRoleId) {
      try {
        await member.roles.add(config.memberRoleId, "Cargo inicial configurado no Boundless Core");
      } catch (error) {
        logger.warn(`Não foi possível adicionar o cargo inicial a ${member.id}:`, error);
      }
    }

    if (!config.welcomeChannelId) return;
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!channel?.isTextBased() || channel.isDMBased()) return;
    await channel.send({
      embeds: [
        createInfoEmbed(
          `${member}, bem-vindo(a) à **${member.guild.name}**. Leia os canais de orientação e comece sua jornada na tripulação.`,
          "⚓ Novo membro a bordo",
        ).setThumbnail(member.user.displayAvatarURL()),
      ],
    });
  },
};

export default event;
