import { Events, MessageFlags, type GuildMember, type Interaction } from "discord.js";
import type { BotEvent } from "../types/event.js";
import { getGuildConfig } from "../services/guildConfig.js";
import { resolvePermissionLevel, permissionLevelLabel } from "../services/permissions.js";
import { createErrorEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const cooldowns = new Map<string, number>();

const event: BotEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // A versão atual usa Slash Commands. Botões, menus e modais são
    // ignorados até que um painel declare explicitamente seu handler.
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Comando desconhecido recebido: /${interaction.commandName}`);
      return;
    }

    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [createErrorEmbed("Este comando só pode ser usado dentro de um servidor.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const guildConfig = await getGuildConfig(interaction.guildId);
      const member = interaction.member as GuildMember;
      const level = resolvePermissionLevel(member, guildConfig, interaction.guild!.ownerId);
      const requiredLevel =
        typeof command.permissionLevel === "function"
          ? command.permissionLevel(interaction)
          : command.permissionLevel;

      // Verificação central de permissão (itens 4 e 26 da especificação)
      // — nenhum comando faz essa checagem sozinho.
      if (level < requiredLevel) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              `Você precisa do nível **${permissionLevelLabel(requiredLevel)}** ou superior para usar este comando.`,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (command.cooldownSeconds) {
        const key = `${interaction.guildId}:${interaction.user.id}:${command.data.name}`;
        const availableAt = cooldowns.get(key) ?? 0;
        const remaining = availableAt - Date.now();
        if (remaining > 0) {
          await interaction.reply({
            embeds: [createErrorEmbed(`Aguarde **${Math.ceil(remaining / 1_000)}s** antes de usar este comando novamente.`)],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        cooldowns.set(key, Date.now() + command.cooldownSeconds * 1_000);
      }

      await command.execute(interaction, { level, guildConfig });
    } catch (error) {
      logger.error(`Erro ao executar /${interaction.commandName}:`, error);

      const errorEmbed = createErrorEmbed("Não foi possível executar esta ação. O erro foi registrado para a equipe.");

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  },
};

export default event;
