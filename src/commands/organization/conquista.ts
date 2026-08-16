import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../database/client.js";
import { writeAudit } from "../../services/audit.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { parseDateOnly, unix } from "../../utils/date.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from "../../utils/embeds.js";
import { limitedJoin } from "../../utils/text.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("conquista").setDescription("Momentos marcantes conquistados pela Boundless.")
    .addSubcommand((sub) => sub.setName("registrar").setDescription("Registra uma Conquista.")
      .addStringOption((opt) => opt.setName("titulo").setDescription("Título").setMinLength(3).setMaxLength(100).setRequired(true))
      .addStringOption((opt) => opt.setName("descricao").setDescription("O que foi conquistado").setMinLength(10).setMaxLength(1000).setRequired(true))
      .addStringOption((opt) => opt.setName("data").setDescription("AAAA-MM-DD; vazio usa hoje")))
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista as Conquistas registradas."))
    .addSubcommand((sub) => sub.setName("remover").setDescription("Remove um registro incorreto.")
      .addStringOption((opt) => opt.setName("id").setDescription("ID da Conquista").setRequired(true))),
  category: CommandCategory.ORGANIZATION,
  permissionLevel: (interaction) => interaction.options.getSubcommand() === "listar" ? PermissionLevel.MEMBER : PermissionLevel.ADMIN,
  helpPermissionLevel: PermissionLevel.MEMBER,
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === "listar") {
        const items = await prisma.conquest.findMany({ where: { guildId }, orderBy: { occurredAt: "desc" }, take: 20 });
        const lines = items.map((item) => `🏆 **${item.title}** • <t:${unix(item.occurredAt)}:D> • \`${item.id}\`\n${item.description}`);
        await interaction.reply({ embeds: [createInfoEmbed(limitedJoin(lines) || "Nenhuma Conquista registrada.", "🏆 Conquistas da Boundless")] });
        return;
      }
      if (sub === "registrar") {
        const title = interaction.options.getString("titulo", true);
        const description = interaction.options.getString("descricao", true);
        const occurredAt = parseDateOnly(interaction.options.getString("data"));
        const item = await prisma.conquest.create({ data: { guildId, title, description, occurredAt, createdBy: interaction.user.id } });
        await audit(interaction, "conquest.create", item.id, { title });
        await interaction.reply({ embeds: [createSuccessEmbed(`A Conquista **${title}** foi registrada. ID: \`${item.id}\``)] });
      } else {
        const id = interaction.options.getString("id", true);
        const item = await prisma.conquest.findFirst({ where: { id, guildId } });
        if (!item) throw new Error("Conquista não encontrada neste servidor.");
        await prisma.conquest.delete({ where: { id } });
        await audit(interaction, "conquest.remove", id, { title: item.title });
        await interaction.reply({ embeds: [createSuccessEmbed(`A Conquista **${item.title}** foi removida.`)] });
      }
    } catch (error) {
      await interaction.reply({ embeds: [createErrorEmbed(error instanceof Error ? error.message : "Não foi possível processar a Conquista.")], flags: MessageFlags.Ephemeral });
    }
  },
};

async function audit(interaction: any, action: string, entityId: string, details: Record<string, unknown>) {
  await writeAudit({ guildId: interaction.guildId, actorId: interaction.user.id, action, entityType: "Conquest", entityId, details });
}

export default command;
