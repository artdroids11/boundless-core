import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../database/client.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { unix } from "../../utils/date.js";
import { createInfoEmbed } from "../../utils/embeds.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("auditoria").setDescription("Consulta alterações administrativas registradas.")
    .addUserOption((opt) => opt.setName("responsavel").setDescription("Filtrar pelo responsável"))
    .addStringOption((opt) => opt.setName("acao").setDescription("Trecho da ação, como prestige ou division").setMaxLength(50)),
  category: CommandCategory.ADMINISTRATION,
  permissionLevel: PermissionLevel.ADMIN,
  cooldownSeconds: 3,
  async execute(interaction) {
    const actor = interaction.options.getUser("responsavel");
    const action = interaction.options.getString("acao")?.trim();
    const items = await prisma.auditLog.findMany({
      where: { guildId: interaction.guildId!, ...(actor ? { actorId: actor.id } : {}), ...(action ? { action: { contains: action } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    const lines = items.map((item) => `• **${item.action}** • <@${item.actorId}> • <t:${unix(item.createdAt)}:R>\n${item.targetId ? `Alvo: <@${item.targetId}> • ` : ""}ID: \`${item.entityId ?? item.id}\``);
    await interaction.reply({ embeds: [createInfoEmbed(lines.join("\n\n") || "Nenhuma alteração encontrada.", "🔎 Auditoria administrativa")], flags: MessageFlags.Ephemeral });
  },
};
export default command;
