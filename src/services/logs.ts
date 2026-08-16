import type { Client, EmbedBuilder, GuildTextBasedChannel } from "discord.js";
import { getGuildConfig } from "./guildConfig.js";
import { logger } from "../utils/logger.js";

export type LogKind = "moderation" | "admin" | "system";

export async function sendGuildLog(
  client: Client,
  guildId: string,
  kind: LogKind,
  embed: EmbedBuilder,
): Promise<void> {
  try {
    const config = await getGuildConfig(guildId);
    const channelId =
      kind === "moderation"
        ? config.logChannelModerationId
        : kind === "admin"
          ? config.logChannelAdminId
          : config.logChannelSystemId;

    if (!channelId) return;
    const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
    const channel = guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId));
    if (!channel?.isTextBased() || channel.isDMBased()) return;

    await (channel as GuildTextBasedChannel).send({ embeds: [embed] });
  } catch (error) {
    logger.warn(`Não foi possível enviar log ${kind} no servidor ${guildId}:`, error);
  }
}
