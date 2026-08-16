import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { ExpeditionStatus } from "../../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { writeAudit } from "../../services/audit.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { parseDateOnly, unix } from "../../utils/date.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from "../../utils/embeds.js";
import { truncate } from "../../utils/text.js";

const STATUS_CHOICES = [
  { name: "Planejada", value: ExpeditionStatus.PLANNED }, { name: "Ativa", value: ExpeditionStatus.ACTIVE },
  { name: "Concluída", value: ExpeditionStatus.COMPLETED }, { name: "Cancelada", value: ExpeditionStatus.CANCELLED },
] as const;

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("expedicao").setDescription("Planejamento e participação em Expedições.")
    .addSubcommand((sub) => sub.setName("criar").setDescription("Cria uma Expedição planejada.")
      .addStringOption((opt) => opt.setName("titulo").setDescription("Título").setMinLength(3).setMaxLength(100).setRequired(true))
      .addStringOption((opt) => opt.setName("descricao").setDescription("Objetivo e contexto").setMinLength(10).setMaxLength(1000).setRequired(true))
      .addUserOption((opt) => opt.setName("lider").setDescription("Líder; vazio usa você"))
      .addStringOption((opt) => opt.setName("data").setDescription("AAAA-MM-DD; opcional")))
    .addSubcommand((sub) => sub.setName("participar").setDescription("Entra em uma Expedição aberta.")
      .addStringOption((opt) => opt.setName("id").setDescription("ID da Expedição").setRequired(true))
      .addStringOption((opt) => opt.setName("funcao").setDescription("Sua função").setMaxLength(80)))
    .addSubcommand((sub) => sub.setName("sair").setDescription("Sai de uma Expedição.")
      .addStringOption((opt) => opt.setName("id").setDescription("ID da Expedição").setRequired(true)))
    .addSubcommand((sub) => sub.setName("iniciar").setDescription("Marca uma Expedição como ativa.")
      .addStringOption((opt) => opt.setName("id").setDescription("ID da Expedição").setRequired(true)))
    .addSubcommand((sub) => sub.setName("concluir").setDescription("Conclui uma Expedição.")
      .addStringOption((opt) => opt.setName("id").setDescription("ID da Expedição").setRequired(true)))
    .addSubcommand((sub) => sub.setName("cancelar").setDescription("Cancela uma Expedição.")
      .addStringOption((opt) => opt.setName("id").setDescription("ID da Expedição").setRequired(true)))
    .addSubcommand((sub) => sub.setName("ver").setDescription("Mostra detalhes e participantes.")
      .addStringOption((opt) => opt.setName("id").setDescription("ID da Expedição").setRequired(true)))
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista Expedições.")
      .addStringOption((opt) => opt.setName("estado").setDescription("Filtrar por estado").addChoices(...STATUS_CHOICES))),
  category: CommandCategory.ORGANIZATION,
  permissionLevel: (interaction) => ["criar", "iniciar", "concluir", "cancelar"].includes(interaction.options.getSubcommand()) ? PermissionLevel.MODERATOR : PermissionLevel.MEMBER,
  helpPermissionLevel: PermissionLevel.MEMBER,
  cooldownSeconds: 2,
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === "listar") {
        const status = interaction.options.getString("estado") as ExpeditionStatus | null;
        const items = await prisma.expedition.findMany({ where: { guildId, ...(status ? { status } : {}) }, include: { _count: { select: { members: true } } }, orderBy: { createdAt: "desc" }, take: 20 });
        const lines = items.map((item) => `${statusIcon(item.status)} **${item.title}** • ${statusLabel(item.status)} • ${item._count.members} participante(s) • \`${item.id}\`${item.scheduledAt ? `\nData: <t:${unix(item.scheduledAt)}:D>` : ""}`);
        await interaction.reply({ embeds: [createInfoEmbed(lines.join("\n\n") || "Nenhuma Expedição encontrada.", "🧭 Expedições") ] });
        return;
      }
      if (sub === "criar") {
        const title = interaction.options.getString("titulo", true);
        const description = interaction.options.getString("descricao", true);
        const leader = interaction.options.getUser("lider") ?? interaction.user;
        const scheduledAt = interaction.options.getString("data") ? parseDateOnly(interaction.options.getString("data")) : undefined;
        const item = await prisma.$transaction(async (tx) => {
          const expedition = await tx.expedition.create({ data: { guildId, title, description, leaderId: leader.id, scheduledAt, createdBy: interaction.user.id } });
          await tx.expeditionMember.create({ data: { expeditionId: expedition.id, userId: leader.id, role: "Líder" } });
          return expedition;
        });
        await audit(interaction, "expedition.create", item.id, leader.id, { title });
        await interaction.reply({ embeds: [createSuccessEmbed(`A Expedição **${title}** foi planejada. ID: \`${item.id}\``)] });
        return;
      }

      const id = interaction.options.getString("id", true);
      const item = await prisma.expedition.findFirst({ where: { id, guildId }, include: { members: { orderBy: { joinedAt: "asc" } } } });
      if (!item) throw new Error("Expedição não encontrada neste servidor.");

      if (sub === "ver") {
        const members = truncate(item.members.map((member) => `<@${member.userId}> — ${member.role}`).join("\n") || "Nenhum participante.");
        const embed = createInfoEmbed(item.description, `🧭 ${item.title}`).addFields(
          { name: "Estado", value: statusLabel(item.status), inline: true },
          { name: "Líder", value: `<@${item.leaderId}>`, inline: true },
          { name: "Data", value: item.scheduledAt ? `<t:${unix(item.scheduledAt)}:D>` : "Não definida", inline: true },
          { name: "Participantes", value: members },
        );
        await interaction.reply({ embeds: [embed] });
        return;
      }
      if (sub === "participar") {
        if (!new Set<ExpeditionStatus>([ExpeditionStatus.PLANNED, ExpeditionStatus.ACTIVE]).has(item.status)) throw new Error("Essa Expedição não aceita novas entradas.");
        const role = interaction.options.getString("funcao")?.trim() || "Participante";
        await prisma.expeditionMember.create({ data: { expeditionId: id, userId: interaction.user.id, role } });
        await audit(interaction, "expedition.join", id, interaction.user.id, { role });
        await interaction.reply({ embeds: [createSuccessEmbed(`Você entrou em **${item.title}** como **${role}**.`)] });
        return;
      }
      if (sub === "sair") {
        if (item.leaderId === interaction.user.id) throw new Error("O líder precisa transferir a liderança ou a equipe deve encerrar a Expedição.");
        const result = await prisma.expeditionMember.deleteMany({ where: { expeditionId: id, userId: interaction.user.id } });
        if (!result.count) throw new Error("Você não participa dessa Expedição.");
        await audit(interaction, "expedition.leave", id, interaction.user.id, {});
        await interaction.reply({ embeds: [createSuccessEmbed(`Você saiu de **${item.title}**.`)] });
        return;
      }

      const next = sub === "iniciar" ? ExpeditionStatus.ACTIVE : sub === "concluir" ? ExpeditionStatus.COMPLETED : ExpeditionStatus.CANCELLED;
      if (new Set<ExpeditionStatus>([ExpeditionStatus.COMPLETED, ExpeditionStatus.CANCELLED]).has(item.status)) throw new Error("Essa Expedição já está encerrada.");
      if (sub === "concluir" && item.status !== ExpeditionStatus.ACTIVE) throw new Error("Inicie a Expedição antes de concluí-la.");
      await prisma.expedition.update({ where: { id }, data: { status: next, completedAt: next === ExpeditionStatus.COMPLETED ? new Date() : undefined } });
      await audit(interaction, `expedition.${sub}`, id, item.leaderId, { from: item.status, to: next });
      await interaction.reply({ embeds: [createSuccessEmbed(`**${item.title}** agora está **${statusLabel(next)}**.`)] });
    } catch (error) {
      const message = error instanceof Error && error.message.includes("Unique constraint") ? "Você já participa dessa Expedição." : error instanceof Error ? error.message : "Não foi possível processar a Expedição.";
      await interaction.reply({ embeds: [createErrorEmbed(message)], flags: MessageFlags.Ephemeral });
    }
  },
};

function statusLabel(status: ExpeditionStatus): string {
  return ({ PLANNED: "Planejada", ACTIVE: "Ativa", COMPLETED: "Concluída", CANCELLED: "Cancelada" } as const)[status];
}
function statusIcon(status: ExpeditionStatus): string {
  return ({ PLANNED: "📅", ACTIVE: "🟢", COMPLETED: "✅", CANCELLED: "⚪" } as const)[status];
}
async function audit(interaction: any, action: string, entityId: string, targetId: string, details: Record<string, unknown>) {
  await writeAudit({ guildId: interaction.guildId, actorId: interaction.user.id, action, targetId, entityType: "Expedition", entityId, details });
}
export default command;
