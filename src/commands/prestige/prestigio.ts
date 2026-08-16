import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { PrestigeCategory, PrestigeStatus } from "../../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { writeAudit } from "../../services/audit.js";
import { sendGuildLog } from "../../services/logs.js";
import { PermissionLevel } from "../../services/permissions.js";
import { approvePrestige, rejectPrestige, removePrestige, requestPrestige } from "../../services/prestige.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from "../../utils/embeds.js";
import { limitedJoin } from "../../utils/text.js";

const CATEGORY_CHOICES = [
  { name: "Militar", value: PrestigeCategory.MILITAR },
  { name: "Exploração", value: PrestigeCategory.EXPLORACAO },
  { name: "Naval", value: PrestigeCategory.NAVAL },
  { name: "Logística", value: PrestigeCategory.LOGISTICA },
  { name: "Relações", value: PrestigeCategory.RELACOES },
  { name: "Comunidade", value: PrestigeCategory.COMUNIDADE },
  { name: "Conquista", value: PrestigeCategory.CONQUISTA },
] as const;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("prestigio")
    .setDescription("Prestígio por feitos, separado de XP e hierarquia.")
    .addSubcommand((sub) =>
      sub
        .setName("conceder")
        .setDescription("Propõe ou concede PP por um feito.")
        .addUserOption((opt) => opt.setName("membro").setDescription("Membro reconhecido").setRequired(true))
        .addIntegerOption((opt) => opt.setName("pontos").setDescription("De 1 a 100 PP").setMinValue(1).setMaxValue(100).setRequired(true))
        .addStringOption((opt) => opt.setName("categoria").setDescription("Categoria do feito").setRequired(true).addChoices(...CATEGORY_CHOICES))
        .addStringOption((opt) => opt.setName("motivo").setDescription("Feito que justifica o PP").setMinLength(10).setMaxLength(500).setRequired(true))
        .addStringOption((opt) => opt.setName("evidencia").setDescription("Link de evidência").setMaxLength(500)),
    )
    .addSubcommand((sub) =>
      sub.setName("aprovar").setDescription("Aprova uma proposta pendente.")
        .addStringOption((opt) => opt.setName("id").setDescription("ID da proposta").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName("rejeitar").setDescription("Rejeita uma proposta sem apagar o registro.")
        .addStringOption((opt) => opt.setName("id").setDescription("ID da proposta").setRequired(true))
        .addStringOption((opt) => opt.setName("motivo").setDescription("Justificativa da decisão").setMinLength(5).setMaxLength(500).setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName("retirar").setDescription("Retira PP com justificativa registrada.")
        .addUserOption((opt) => opt.setName("membro").setDescription("Membro").setRequired(true))
        .addIntegerOption((opt) => opt.setName("pontos").setDescription("De 1 a 100 PP").setMinValue(1).setMaxValue(100).setRequired(true))
        .addStringOption((opt) => opt.setName("categoria").setDescription("Categoria relacionada").setRequired(true).addChoices(...CATEGORY_CHOICES))
        .addStringOption((opt) => opt.setName("motivo").setDescription("Justificativa").setMinLength(10).setMaxLength(500).setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName("perfil").setDescription("Mostra o saldo e os totais de PP.")
        .addUserOption((opt) => opt.setName("membro").setDescription("Membro; vazio mostra você")),
    )
    .addSubcommand((sub) =>
      sub.setName("historico").setDescription("Mostra as últimas movimentações de PP.")
        .addUserOption((opt) => opt.setName("membro").setDescription("Membro; vazio mostra você")),
    )
    .addSubcommand((sub) => sub.setName("ranking").setDescription("Mostra os membros com mais PP."))
    .addSubcommand((sub) => sub.setName("pendentes").setDescription("Lista propostas aguardando validação.")),
  category: CommandCategory.PRESTIGE,
  permissionLevel: (interaction) => {
    const sub = interaction.options.getSubcommand();
    if (["aprovar", "rejeitar", "retirar"].includes(sub)) return PermissionLevel.ADMIN;
    if (["conceder", "pendentes"].includes(sub)) return PermissionLevel.MODERATOR;
    return PermissionLevel.MEMBER;
  },
  helpPermissionLevel: PermissionLevel.MEMBER,
  cooldownSeconds: 2,
  async execute(interaction, ctx) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();

    try {
      if (sub === "conceder") {
        const user = interaction.options.getUser("membro", true);
        const amount = interaction.options.getInteger("pontos", true);
        const category = interaction.options.getString("categoria", true) as PrestigeCategory;
        const reason = interaction.options.getString("motivo", true);
        const evidenceUrl = interaction.options.getString("evidencia");
        const autoApprove = ctx.level >= PermissionLevel.ADMIN;
        const item = await requestPrestige({ guildId, userId: user.id, amount, category, reason, evidenceUrl, requestedBy: interaction.user.id, autoApprove, rollingDailyLimit: ctx.guildConfig.prestigeDailyLimit });
        await writeAudit({ guildId, actorId: interaction.user.id, action: autoApprove ? "prestige.grant" : "prestige.request", targetId: user.id, entityType: "PrestigeTransaction", entityId: item.id, details: { amount, category, reason } });
        const status = autoApprove ? "aprovada e contabilizada" : "enviada para validação de outro Administrador";
        await interaction.reply({ embeds: [createSuccessEmbed(`Concessão de **${amount} PP** ${status}.\nID: \`${item.id}\``)] });
        return;
      }

      if (sub === "aprovar") {
        const id = interaction.options.getString("id", true);
        const item = await approvePrestige(id, guildId, interaction.user.id, ctx.guildConfig.prestigeDailyLimit);
        await writeAudit({ guildId, actorId: interaction.user.id, action: "prestige.approve", targetId: item.userId, entityType: "PrestigeTransaction", entityId: id, details: { amount: item.amount } });
        const embed = createSuccessEmbed(`<@${item.userId}> recebeu **${item.amount} PP** por **${categoryLabel(item.category)}**.\n${item.reason}`, "🏅 Prestígio aprovado");
        await sendGuildLog(interaction.client, guildId, "admin", embed);
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (sub === "rejeitar") {
        const id = interaction.options.getString("id", true);
        const note = interaction.options.getString("motivo", true);
        const item = await rejectPrestige(id, guildId, interaction.user.id, note);
        await writeAudit({ guildId, actorId: interaction.user.id, action: "prestige.reject", targetId: item.userId, entityType: "PrestigeTransaction", entityId: id, details: { note } });
        await interaction.reply({ embeds: [createSuccessEmbed(`A proposta \`${id}\` foi rejeitada e permaneceu no histórico.`)] });
        return;
      }

      if (sub === "retirar") {
        const user = interaction.options.getUser("membro", true);
        const amount = interaction.options.getInteger("pontos", true);
        const category = interaction.options.getString("categoria", true) as PrestigeCategory;
        const reason = interaction.options.getString("motivo", true);
        const item = await removePrestige(guildId, user.id, amount, category, reason, interaction.user.id);
        await writeAudit({ guildId, actorId: interaction.user.id, action: "prestige.remove", targetId: user.id, entityType: "PrestigeTransaction", entityId: item.id, details: { amount, category, reason } });
        await interaction.reply({ embeds: [createSuccessEmbed(`Foram retirados **${amount} PP** de ${user}. ID: \`${item.id}\``)] });
        return;
      }

      if (sub === "perfil") {
        const user = interaction.options.getUser("membro") ?? interaction.user;
        const balance = await prisma.prestigeBalance.findUnique({ where: { guildId_userId: { guildId, userId: user.id } } });
        const embed = createInfoEmbed(`O PP mede feitos e contribuição; não determina autoridade.`, `🏅 Prestígio — ${user.username}`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: "Saldo", value: `**${balance?.balance ?? 0} PP**`, inline: true },
            { name: "Conquistado", value: `${balance?.lifetimeEarned ?? 0} PP`, inline: true },
            { name: "Retirado", value: `${balance?.lifetimeLost ?? 0} PP`, inline: true },
          );
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (sub === "historico") {
        const user = interaction.options.getUser("membro") ?? interaction.user;
        const items = await prisma.prestigeTransaction.findMany({ where: { guildId, userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 });
        const lines = items.length ? items.map((item) => `${statusIcon(item.status)} **${signed(item.amount)} PP** • ${categoryLabel(item.category)} • \`${item.id}\`\n${item.reason}`) : ["Nenhuma movimentação registrada."];
        await interaction.reply({ embeds: [createInfoEmbed(limitedJoin(lines), `🏅 Histórico — ${user.username}`)], flags: MessageFlags.Ephemeral });
        return;
      }

      if (sub === "ranking") {
        const balances = await prisma.prestigeBalance.findMany({ where: { guildId }, orderBy: { balance: "desc" }, take: 10 });
        const lines = balances.length ? balances.map((item, index) => `**${index + 1}.** <@${item.userId}> — **${item.balance} PP**`) : ["Ainda não há PP aprovado."];
        await interaction.reply({ embeds: [createInfoEmbed(lines.join("\n"), "🏅 Ranking de Prestígio")] });
        return;
      }

      const pending = await prisma.prestigeTransaction.findMany({ where: { guildId, status: PrestigeStatus.PENDING }, orderBy: { createdAt: "asc" }, take: 15 });
      const lines = pending.length ? pending.map((item) => `\`${item.id}\` • <@${item.userId}> • **${item.amount} PP** (${categoryLabel(item.category)})\nProposto por <@${item.requestedBy}> — ${item.reason}`) : ["Nenhuma proposta pendente."];
      await interaction.reply({ embeds: [createInfoEmbed(limitedJoin(lines), "🏅 PP aguardando validação")], flags: MessageFlags.Ephemeral });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível processar o Prestígio.";
      await interaction.reply({ embeds: [createErrorEmbed(message)], flags: MessageFlags.Ephemeral });
    }
  },
};

function categoryLabel(category: PrestigeCategory): string {
  return ({ MILITAR: "Militar", EXPLORACAO: "Exploração", NAVAL: "Naval", LOGISTICA: "Logística", RELACOES: "Relações", COMUNIDADE: "Comunidade", CONQUISTA: "Conquista" } as const)[category];
}

function statusIcon(status: PrestigeStatus): string {
  return status === PrestigeStatus.APPROVED ? "✅" : status === PrestigeStatus.PENDING ? "⏳" : "❌";
}

function signed(amount: number): string {
  return amount > 0 ? `+${amount}` : String(amount);
}

export default command;
