import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { CouncilType, DepthTier } from "../../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { writeAudit } from "../../services/audit.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from "../../utils/embeds.js";
import { truncate } from "../../utils/text.js";

const COUNCILS = [
  { name: "Militar", value: CouncilType.MILITAR },
  { name: "Exploração", value: CouncilType.EXPLORACAO },
  { name: "Naval", value: CouncilType.NAVAL },
  { name: "Logística", value: CouncilType.LOGISTICA },
  { name: "Relações", value: CouncilType.RELACOES },
] as const;

const TIERS = [
  { name: "T1 — Introdução", value: DepthTier.T1 },
  { name: "T2 — Fundamentos", value: DepthTier.T2 },
  { name: "T3 — Domínio operacional", value: DepthTier.T3 },
  { name: "T4 — Domínio avançado", value: DepthTier.T4 },
  { name: "T5 — Referência", value: DepthTier.T5 },
] as const;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("boundless")
    .setDescription("Organização interna da Boundless, sem misturar autoridade e mérito.")
    .addSubcommandGroup((group) =>
      group.setName("hierarquia").setDescription("Autoridade e responsabilidade.")
        .addSubcommand((sub) => sub.setName("definir").setDescription("Define a posição hierárquica de um membro.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true))
          .addStringOption((opt) => opt.setName("patente").setDescription("Nome oficial da posição").setMinLength(2).setMaxLength(80).setRequired(true))
          .addStringOption((opt) => opt.setName("motivo").setDescription("Motivo da mudança").setMaxLength(300)))
        .addSubcommand((sub) => sub.setName("remover").setDescription("Remove uma atribuição hierárquica.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true)))
        .addSubcommand((sub) => sub.setName("ver").setDescription("Mostra a hierarquia ou a posição de um membro.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro opcional"))),
    )
    .addSubcommandGroup((group) =>
      group.setName("conselho").setDescription("Responsabilidade administrativa, não segunda hierarquia.")
        .addSubcommand((sub) => sub.setName("nomear").setDescription("Nomeia um membro para um Conselho.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Pessoa de confiança").setRequired(true))
          .addStringOption((opt) => opt.setName("conselho").setDescription("Conselho").setRequired(true).addChoices(...COUNCILS))
          .addStringOption((opt) => opt.setName("funcao").setDescription("Função dentro do Conselho").setMaxLength(80)))
        .addSubcommand((sub) => sub.setName("remover").setDescription("Remove uma nomeação de Conselho.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true))
          .addStringOption((opt) => opt.setName("conselho").setDescription("Conselho").setRequired(true).addChoices(...COUNCILS)))
        .addSubcommand((sub) => sub.setName("ver").setDescription("Lista Conselhos e responsáveis.")
          .addStringOption((opt) => opt.setName("conselho").setDescription("Filtrar por Conselho").addChoices(...COUNCILS))),
    )
    .addSubcommandGroup((group) =>
      group.setName("especializacao").setDescription("Conhecimento e área de atuação.")
        .addSubcommand((sub) => sub.setName("definir").setDescription("Adiciona uma especialização.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true))
          .addStringOption((opt) => opt.setName("nome").setDescription("Especialização").setMinLength(2).setMaxLength(80).setRequired(true))
          .addStringOption((opt) => opt.setName("observacao").setDescription("Observação").setMaxLength(300)))
        .addSubcommand((sub) => sub.setName("remover").setDescription("Remove uma especialização.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true))
          .addStringOption((opt) => opt.setName("nome").setDescription("Nome exato").setRequired(true)))
        .addSubcommand((sub) => sub.setName("ver").setDescription("Mostra as especializações de um membro.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro; vazio mostra você"))),
    )
    .addSubcommandGroup((group) =>
      group.setName("profundidade").setDescription("Domínio T1–T5 dentro de uma área.")
        .addSubcommand((sub) => sub.setName("definir").setDescription("Define a profundidade em uma área.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true))
          .addStringOption((opt) => opt.setName("area").setDescription("Área avaliada").setMinLength(2).setMaxLength(80).setRequired(true))
          .addStringOption((opt) => opt.setName("nivel").setDescription("Profundidade").setRequired(true).addChoices(...TIERS))
          .addStringOption((opt) => opt.setName("observacao").setDescription("Observação").setMaxLength(300)))
        .addSubcommand((sub) => sub.setName("remover").setDescription("Remove uma avaliação de profundidade.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true))
          .addStringOption((opt) => opt.setName("area").setDescription("Nome exato da área").setRequired(true)))
        .addSubcommand((sub) => sub.setName("ver").setDescription("Mostra as profundidades de um membro.")
          .addUserOption((opt) => opt.setName("membro").setDescription("Membro; vazio mostra você"))),
    )
    .addSubcommand((sub) => sub.setName("resumo").setDescription("Resume os sistemas organizacionais de um membro.")
      .addUserOption((opt) => opt.setName("membro").setDescription("Membro; vazio mostra você"))),
  category: CommandCategory.ORGANIZATION,
  permissionLevel: (interaction) => ["ver", "resumo"].includes(interaction.options.getSubcommand()) ? PermissionLevel.MEMBER : PermissionLevel.ADMIN,
  helpPermissionLevel: PermissionLevel.MEMBER,
  cooldownSeconds: 2,
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    try {
      if (!group && sub === "resumo") {
        const user = interaction.options.getUser("membro") ?? interaction.user;
        const [hierarchy, councils, specs, depths, prestige, division] = await Promise.all([
          prisma.hierarchyAssignment.findUnique({ where: { guildId_userId: { guildId, userId: user.id } } }),
          prisma.councilMembership.findMany({ where: { guildId, userId: user.id } }),
          prisma.specializationAssignment.findMany({ where: { guildId, userId: user.id } }),
          prisma.depthAssignment.findMany({ where: { guildId, userId: user.id } }),
          prisma.prestigeBalance.findUnique({ where: { guildId_userId: { guildId, userId: user.id } } }),
          prisma.divisionMember.findUnique({ where: { guildId_userId: { guildId, userId: user.id } }, include: { division: true } }),
        ]);
        const embed = createInfoEmbed("Cada campo mede uma coisa diferente dentro da Boundless.", `⚓ Registro de ${user.username}`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: "Hierarquia · autoridade", value: hierarchy?.rank ?? "Não definida", inline: true },
            { name: "Prestígio · feitos", value: `${prestige?.balance ?? 0} PP`, inline: true },
            { name: "Divisão · operação", value: division?.division.name ?? "Nenhuma", inline: true },
            { name: "Conselhos · responsabilidade", value: truncate(councils.map((item) => `${councilLabel(item.council)} (${item.position})`).join("\n") || "Nenhum") },
            { name: "Especializações · atuação", value: truncate(specs.map((item) => item.name).join(", ") || "Nenhuma") },
            { name: "Profundidade · domínio", value: truncate(depths.map((item) => `${item.area}: **${item.tier}**`).join("\n") || "Nenhuma") },
          );
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (group === "hierarquia") await hierarchy(interaction, guildId, sub);
      else if (group === "conselho") await council(interaction, guildId, sub);
      else if (group === "especializacao") await specialization(interaction, guildId, sub);
      else if (group === "profundidade") await depth(interaction, guildId, sub);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir a alteração.";
      await interaction.reply({ embeds: [createErrorEmbed(message)], flags: MessageFlags.Ephemeral });
    }
  },
};

async function hierarchy(interaction: any, guildId: string, sub: string) {
  if (sub === "ver") {
    const user = interaction.options.getUser("membro");
    const items = await prisma.hierarchyAssignment.findMany({ where: { guildId, ...(user ? { userId: user.id } : {}) }, orderBy: { rank: "asc" }, take: 25 });
    const lines = items.map((item) => `<@${item.userId}> — **${item.rank}**`);
    await interaction.reply({ embeds: [createInfoEmbed(lines.join("\n") || "Nenhuma atribuição.", "⚓ Hierarquia · autoridade") ] });
    return;
  }
  const user = interaction.options.getUser("membro", true);
  if (sub === "definir") {
    const rank = interaction.options.getString("patente", true).trim();
    const reason = interaction.options.getString("motivo");
    const item = await prisma.hierarchyAssignment.upsert({ where: { guildId_userId: { guildId, userId: user.id } }, create: { guildId, userId: user.id, rank, grantedBy: interaction.user.id, reason }, update: { rank, grantedBy: interaction.user.id, reason } });
    await audited(interaction, "hierarchy.set", user.id, "HierarchyAssignment", item.id, { rank, reason });
    await interaction.reply({ embeds: [createSuccessEmbed(`${user} agora ocupa **${rank}** na hierarquia.`)] });
  } else {
    const result = await prisma.hierarchyAssignment.deleteMany({ where: { guildId, userId: user.id } });
    if (!result.count) throw new Error("Esse membro não possui atribuição hierárquica.");
    await audited(interaction, "hierarchy.remove", user.id, "HierarchyAssignment", undefined, {});
    await interaction.reply({ embeds: [createSuccessEmbed(`A atribuição hierárquica de ${user} foi removida.`)] });
  }
}

async function council(interaction: any, guildId: string, sub: string) {
  if (sub === "ver") {
    const selected = interaction.options.getString("conselho") as CouncilType | null;
    const items = await prisma.councilMembership.findMany({ where: { guildId, ...(selected ? { council: selected } : {}) }, orderBy: [{ council: "asc" }, { createdAt: "asc" }], take: 25 });
    const lines = items.map((item) => `**${councilLabel(item.council)}** · <@${item.userId}> — ${item.position}`);
    await interaction.reply({ embeds: [createInfoEmbed(lines.join("\n") || "Nenhum conselheiro nomeado.", "🧭 Conselhos · responsabilidade") ] });
    return;
  }
  const user = interaction.options.getUser("membro", true);
  const selected = interaction.options.getString("conselho", true) as CouncilType;
  if (sub === "nomear") {
    const position = interaction.options.getString("funcao")?.trim() || "Conselheiro";
    const item = await prisma.councilMembership.upsert({ where: { guildId_userId_council: { guildId, userId: user.id, council: selected } }, create: { guildId, userId: user.id, council: selected, position, appointedBy: interaction.user.id }, update: { position, appointedBy: interaction.user.id } });
    await audited(interaction, "council.appoint", user.id, "CouncilMembership", item.id, { council: selected, position });
    await interaction.reply({ embeds: [createSuccessEmbed(`${user} foi nomeado para o Conselho de **${councilLabel(selected)}**.`)] });
  } else {
    const result = await prisma.councilMembership.deleteMany({ where: { guildId, userId: user.id, council: selected } });
    if (!result.count) throw new Error("Essa nomeação não existe.");
    await audited(interaction, "council.remove", user.id, "CouncilMembership", undefined, { council: selected });
    await interaction.reply({ embeds: [createSuccessEmbed(`${user} foi removido do Conselho de **${councilLabel(selected)}**.`)] });
  }
}

async function specialization(interaction: any, guildId: string, sub: string) {
  const user = interaction.options.getUser("membro") ?? interaction.user;
  if (sub === "ver") {
    const items = await prisma.specializationAssignment.findMany({ where: { guildId, userId: user.id }, orderBy: { name: "asc" } });
    await interaction.reply({ embeds: [createInfoEmbed(items.map((item) => `• **${item.name}**${item.notes ? ` — ${item.notes}` : ""}`).join("\n") || "Nenhuma especialização.", `🧰 Especializações — ${user.username}`)] });
    return;
  }
  const name = interaction.options.getString("nome", true).trim();
  if (sub === "definir") {
    const notes = interaction.options.getString("observacao");
    const item = await prisma.specializationAssignment.upsert({ where: { guildId_userId_name: { guildId, userId: user.id, name } }, create: { guildId, userId: user.id, name, notes, grantedBy: interaction.user.id }, update: { notes, grantedBy: interaction.user.id } });
    await audited(interaction, "specialization.set", user.id, "SpecializationAssignment", item.id, { name });
    await interaction.reply({ embeds: [createSuccessEmbed(`**${name}** foi registrada para ${user}.`)] });
  } else {
    const result = await prisma.specializationAssignment.deleteMany({ where: { guildId, userId: user.id, name } });
    if (!result.count) throw new Error("Especialização não encontrada; use o nome exato.");
    await audited(interaction, "specialization.remove", user.id, "SpecializationAssignment", undefined, { name });
    await interaction.reply({ embeds: [createSuccessEmbed(`**${name}** foi removida de ${user}.`)] });
  }
}

async function depth(interaction: any, guildId: string, sub: string) {
  const user = interaction.options.getUser("membro") ?? interaction.user;
  if (sub === "ver") {
    const items = await prisma.depthAssignment.findMany({ where: { guildId, userId: user.id }, orderBy: { area: "asc" } });
    await interaction.reply({ embeds: [createInfoEmbed(items.map((item) => `• **${item.area}: ${item.tier}**${item.notes ? ` — ${item.notes}` : ""}`).join("\n") || "Nenhuma profundidade avaliada.", `🌊 Profundidade — ${user.username}`)] });
    return;
  }
  const area = interaction.options.getString("area", true).trim();
  if (sub === "definir") {
    const tier = interaction.options.getString("nivel", true) as DepthTier;
    const notes = interaction.options.getString("observacao");
    const item = await prisma.depthAssignment.upsert({ where: { guildId_userId_area: { guildId, userId: user.id, area } }, create: { guildId, userId: user.id, area, tier, notes, grantedBy: interaction.user.id }, update: { tier, notes, grantedBy: interaction.user.id } });
    await audited(interaction, "depth.set", user.id, "DepthAssignment", item.id, { area, tier });
    await interaction.reply({ embeds: [createSuccessEmbed(`${user} recebeu **${tier}** em **${area}**.`)] });
  } else {
    const result = await prisma.depthAssignment.deleteMany({ where: { guildId, userId: user.id, area } });
    if (!result.count) throw new Error("Área não encontrada; use o nome exato.");
    await audited(interaction, "depth.remove", user.id, "DepthAssignment", undefined, { area });
    await interaction.reply({ embeds: [createSuccessEmbed(`A profundidade de ${user} em **${area}** foi removida.`)] });
  }
}

async function audited(interaction: any, action: string, targetId: string, entityType: string, entityId: string | undefined, details: Record<string, unknown>) {
  await writeAudit({ guildId: interaction.guildId, actorId: interaction.user.id, action, targetId, entityType, entityId, details });
}

function councilLabel(value: CouncilType): string {
  return ({ MILITAR: "Militar", EXPLORACAO: "Exploração", NAVAL: "Naval", LOGISTICA: "Logística", RELACOES: "Relações" } as const)[value];
}

export default command;
