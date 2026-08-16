import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../database/client.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { createInfoEmbed } from "../../utils/embeds.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("ranking").setDescription("Ranking de atividade ou de Prestígio.")
    .addStringOption((opt) => opt.setName("tipo").setDescription("Sistema consultado").setRequired(true)
      .addChoices({ name: "XP e nível", value: "xp" }, { name: "Prestígio (PP)", value: "pp" })),
  category: CommandCategory.LEVELS,
  permissionLevel: PermissionLevel.MEMBER,
  cooldownSeconds: 5,
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const type = interaction.options.getString("tipo", true);
    if (type === "xp") {
      const items = await prisma.user.findMany({ where: { guildId }, orderBy: { xp: "desc" }, take: 10 });
      const lines = items.map((item, i) => `**${i + 1}.** <@${item.userId}> — nível **${item.level}** • ${item.xp} XP`);
      await interaction.reply({ embeds: [createInfoEmbed(lines.join("\n") || "Ainda não há atividade registrada.", "⭐ Ranking de atividade")] });
    } else {
      const items = await prisma.prestigeBalance.findMany({ where: { guildId }, orderBy: { balance: "desc" }, take: 10 });
      const lines = items.map((item, i) => `**${i + 1}.** <@${item.userId}> — **${item.balance} PP**`);
      await interaction.reply({ embeds: [createInfoEmbed(lines.join("\n") || "Ainda não há Prestígio aprovado.", "🏅 Ranking de Prestígio")] });
    }
  },
};
export default command;
