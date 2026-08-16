import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../database/client.js";
import { writeAudit } from "../../services/audit.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from "../../utils/embeds.js";
import { limitedJoin, truncate } from "../../utils/text.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("divisao")
    .setDescription("Divisões operacionais que pertencem à Boundless.")
    .addSubcommand((sub) => sub.setName("criar").setDescription("Cria uma Divisão.")
      .addStringOption((opt) => opt.setName("nome").setDescription("Nome oficial").setMinLength(2).setMaxLength(80).setRequired(true))
      .addStringOption((opt) => opt.setName("descricao").setDescription("Missão operacional").setMinLength(10).setMaxLength(500).setRequired(true))
      .addUserOption((opt) => opt.setName("lider").setDescription("Líder inicial")))
    .addSubcommand((sub) => sub.setName("adicionar").setDescription("Adiciona um membro a uma Divisão.")
      .addStringOption((opt) => opt.setName("divisao").setDescription("Nome exato").setRequired(true))
      .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true))
      .addStringOption((opt) => opt.setName("funcao").setDescription("Função operacional").setMaxLength(80)))
    .addSubcommand((sub) => sub.setName("remover-membro").setDescription("Remove um membro de sua Divisão.")
      .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true)))
    .addSubcommand((sub) => sub.setName("lider").setDescription("Define o líder de uma Divisão.")
      .addStringOption((opt) => opt.setName("divisao").setDescription("Nome exato").setRequired(true))
      .addUserOption((opt) => opt.setName("membro").setDescription("Novo líder").setRequired(true)))
    .addSubcommand((sub) => sub.setName("ver").setDescription("Mostra uma Divisão e seus membros.")
      .addStringOption((opt) => opt.setName("divisao").setDescription("Nome exato").setRequired(true)))
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista todas as Divisões."))
    .addSubcommand((sub) => sub.setName("excluir").setDescription("Exclui uma Divisão e seus vínculos.")
      .addStringOption((opt) => opt.setName("divisao").setDescription("Nome exato").setRequired(true))),
  category: CommandCategory.ORGANIZATION,
  permissionLevel: (interaction) => ["ver", "listar"].includes(interaction.options.getSubcommand()) ? PermissionLevel.MEMBER : PermissionLevel.ADMIN,
  helpPermissionLevel: PermissionLevel.MEMBER,
  cooldownSeconds: 2,
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === "listar") {
        const items = await prisma.division.findMany({ where: { guildId }, include: { _count: { select: { members: true } } }, orderBy: { name: "asc" } });
        const lines = items.map((item) => `**${item.name}** — ${item._count.members} membro(s)${item.leaderId ? ` • líder <@${item.leaderId}>` : ""}\n${item.description}`);
        await interaction.reply({ embeds: [createInfoEmbed(limitedJoin(lines) || "Nenhuma Divisão criada.", "⚓ Divisões operacionais")] });
        return;
      }
      if (sub === "ver") {
        const item = await findDivision(guildId, interaction.options.getString("divisao", true));
        const members = truncate(item.members.map((member) => `<@${member.userId}> — ${member.role}`).join("\n") || "Nenhum membro.");
        await interaction.reply({ embeds: [createInfoEmbed(item.description, `⚓ ${item.name}`).addFields({ name: "Líder", value: item.leaderId ? `<@${item.leaderId}>` : "Não definido" }, { name: "Membros", value: members })] });
        return;
      }
      if (sub === "criar") {
        const name = interaction.options.getString("nome", true).trim();
        const description = interaction.options.getString("descricao", true);
        const leader = interaction.options.getUser("lider");
        const item = await prisma.$transaction(async (tx) => {
          const division = await tx.division.create({ data: { guildId, name, description, leaderId: leader?.id, createdBy: interaction.user.id } });
          if (leader) await tx.divisionMember.create({ data: { guildId, divisionId: division.id, userId: leader.id, role: "Líder" } });
          return division;
        });
        await audit(interaction, "division.create", leader?.id, item.id, { name });
        await interaction.reply({ embeds: [createSuccessEmbed(`A Divisão **${name}** foi criada. ID: \`${item.id}\``)] });
        return;
      }
      const name = interaction.options.getString("divisao");
      if (sub === "adicionar") {
        const item = await findDivision(guildId, name!);
        const user = interaction.options.getUser("membro", true);
        const role = interaction.options.getString("funcao")?.trim() || "Membro";
        await prisma.divisionMember.create({ data: { guildId, divisionId: item.id, userId: user.id, role } });
        await audit(interaction, "division.member_add", user.id, item.id, { role });
        await interaction.reply({ embeds: [createSuccessEmbed(`${user} entrou em **${item.name}** como **${role}**.`)] });
      } else if (sub === "remover-membro") {
        const user = interaction.options.getUser("membro", true);
        const membership = await prisma.divisionMember.findUnique({ where: { guildId_userId: { guildId, userId: user.id } }, include: { division: true } });
        if (!membership) throw new Error("Esse membro não pertence a uma Divisão.");
        await prisma.$transaction([
          prisma.divisionMember.delete({ where: { id: membership.id } }),
          ...(membership.division.leaderId === user.id ? [prisma.division.update({ where: { id: membership.divisionId }, data: { leaderId: null } })] : []),
        ]);
        await audit(interaction, "division.member_remove", user.id, membership.divisionId, {});
        await interaction.reply({ embeds: [createSuccessEmbed(`${user} foi removido de **${membership.division.name}**.`)] });
      } else if (sub === "lider") {
        const item = await findDivision(guildId, name!);
        const user = interaction.options.getUser("membro", true);
        await prisma.$transaction(async (tx) => {
          await tx.divisionMember.upsert({ where: { guildId_userId: { guildId, userId: user.id } }, create: { guildId, divisionId: item.id, userId: user.id, role: "Líder" }, update: { divisionId: item.id, role: "Líder" } });
          if (item.leaderId && item.leaderId !== user.id) await tx.divisionMember.updateMany({ where: { divisionId: item.id, userId: item.leaderId }, data: { role: "Membro" } });
          await tx.division.update({ where: { id: item.id }, data: { leaderId: user.id } });
        });
        await audit(interaction, "division.leader", user.id, item.id, {});
        await interaction.reply({ embeds: [createSuccessEmbed(`${user} agora lidera **${item.name}**.`)] });
      } else {
        const item = await findDivision(guildId, name!);
        await prisma.division.delete({ where: { id: item.id } });
        await audit(interaction, "division.delete", undefined, item.id, { name: item.name });
        await interaction.reply({ embeds: [createSuccessEmbed(`A Divisão **${item.name}** foi excluída.`)] });
      }
    } catch (error) {
      const message = error instanceof Error && error.message.includes("Unique constraint") ? "Esse membro já pertence a uma Divisão ou esse nome já existe." : error instanceof Error ? error.message : "Não foi possível processar a Divisão.";
      await interaction.reply({ embeds: [createErrorEmbed(message)], flags: MessageFlags.Ephemeral });
    }
  },
};

async function findDivision(guildId: string, name: string) {
  const item = await prisma.division.findUnique({ where: { guildId_name: { guildId, name: name.trim() } }, include: { members: { orderBy: { joinedAt: "asc" } } } });
  if (!item) throw new Error("Divisão não encontrada; use o nome exato.");
  return item;
}

async function audit(interaction: any, action: string, targetId: string | undefined, entityId: string, details: Record<string, unknown>) {
  await writeAudit({ guildId: interaction.guildId, actorId: interaction.user.id, action, targetId, entityType: "Division", entityId, details });
}

export default command;
