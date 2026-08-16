import {
  MessageFlags,
  SlashCommandBuilder,
  type GuildMember,
  type User,
} from "discord.js";
import { ModerationType } from "../../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { writeAudit } from "../../services/audit.js";
import { sendGuildLog } from "../../services/logs.js";
import { BOT_PERMISSIONS, botPermissionError, memberActionError } from "../../services/memberSafety.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed, createWarningEmbed } from "../../utils/embeds.js";
import { limitedJoin } from "../../utils/text.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Moderação segura com histórico e rastreabilidade.")
    .addSubcommand((sub) => memberReason(sub.setName("avisar").setDescription("Registra um aviso formal."), true))
    .addSubcommand((sub) =>
      memberReason(sub.setName("timeout").setDescription("Aplica um timeout temporário."), true).addIntegerOption((opt: any) =>
        opt.setName("minutos").setDescription("De 1 minuto a 28 dias").setMinValue(1).setMaxValue(40_320).setRequired(true),
      ),
    )
    .addSubcommand((sub) => memberReason(sub.setName("remover-timeout").setDescription("Encerra um timeout."), false))
    .addSubcommand((sub) => memberReason(sub.setName("expulsar").setDescription("Expulsa um membro."), true))
    .addSubcommand((sub) => memberReason(sub.setName("banir").setDescription("Bane um membro."), true))
    .addSubcommand((sub) =>
      sub
        .setName("desbanir")
        .setDescription("Remove o banimento pelo ID do usuário.")
        .addStringOption((opt) => opt.setName("id").setDescription("ID numérico do usuário").setMinLength(17).setMaxLength(20).setRequired(true))
        .addStringOption((opt) => opt.setName("motivo").setDescription("Motivo").setMinLength(5).setMaxLength(500).setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("historico")
        .setDescription("Mostra o histórico recente de um membro.")
        .addUserOption((opt) => opt.setName("membro").setDescription("Membro consultado").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("caso")
        .setDescription("Mostra os detalhes de um caso.")
        .addStringOption((opt) => opt.setName("id").setDescription("ID do caso").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("revogar")
        .setDescription("Marca um caso como revogado, sem apagar o histórico.")
        .addStringOption((opt) => opt.setName("id").setDescription("ID do caso").setRequired(true))
        .addStringOption((opt) => opt.setName("motivo").setDescription("Motivo da revogação").setMinLength(5).setMaxLength(500).setRequired(true)),
    ),
  category: CommandCategory.MODERATION,
  permissionLevel: (interaction) =>
    ["expulsar", "banir", "desbanir", "revogar"].includes(interaction.options.getSubcommand())
      ? PermissionLevel.ADMIN
      : PermissionLevel.MODERATOR,
  helpPermissionLevel: PermissionLevel.MODERATOR,
  cooldownSeconds: 2,
  async execute(interaction) {
    const guild = interaction.guild!;
    const guildId = interaction.guildId!;
    const moderator = interaction.member as GuildMember;
    const sub = interaction.options.getSubcommand();

    if (sub === "historico") {
      const user = interaction.options.getUser("membro", true);
      const cases = await prisma.moderationCase.findMany({
        where: { guildId, userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      const lines = cases.length
        ? cases.map((item) => `${item.active ? "🔸" : "▫️"} **${typeLabel(item.type)}** • \`${item.id}\` • <t:${unix(item.createdAt)}:R>\n${item.reason}`)
        : ["Nenhum caso registrado."];
      await interaction.reply({ embeds: [createInfoEmbed(limitedJoin(lines), `🛡️ Histórico — ${user.username}`)], flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "caso") {
      const id = interaction.options.getString("id", true);
      const item = await prisma.moderationCase.findFirst({ where: { id, guildId } });
      if (!item) return replyError(interaction, "Caso não encontrado neste servidor.");
      const embed = createInfoEmbed(item.reason, `🛡️ Caso ${item.id}`).addFields(
        { name: "Tipo", value: typeLabel(item.type), inline: true },
        { name: "Estado", value: item.active ? "Ativo" : "Revogado/encerrado", inline: true },
        { name: "Alvo", value: `<@${item.userId}>`, inline: true },
        { name: "Moderador", value: `<@${item.moderatorId}>`, inline: true },
        { name: "Criado", value: `<t:${unix(item.createdAt)}:F>`, inline: true },
        ...(item.evidenceUrl ? [{ name: "Evidência", value: item.evidenceUrl }] : []),
      );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === "revogar") {
      const id = interaction.options.getString("id", true);
      const reason = interaction.options.getString("motivo", true);
      const item = await prisma.moderationCase.findFirst({ where: { id, guildId } });
      if (!item) return replyError(interaction, "Caso não encontrado neste servidor.");
      if (!item.active) return replyError(interaction, "Esse caso já está encerrado ou revogado.");
      await prisma.moderationCase.update({ where: { id }, data: { active: false, revokedAt: new Date(), revokedBy: interaction.user.id } });
      await writeAudit({ guildId, actorId: interaction.user.id, action: "moderation.revoke", targetId: item.userId, entityType: "ModerationCase", entityId: id, details: { reason } });
      await interaction.reply({ embeds: [createSuccessEmbed(`O caso \`${id}\` foi revogado sem apagar o histórico.`)] });
      return;
    }

    if (sub === "desbanir") {
      const userId = interaction.options.getString("id", true);
      const reason = interaction.options.getString("motivo", true);
      if (!/^\d{17,20}$/.test(userId)) return replyError(interaction, "Informe um ID de usuário válido.");
      const permissionError = botPermissionError(moderator, BOT_PERMISSIONS.ban.bit, BOT_PERMISSIONS.ban.label);
      if (permissionError) return replyError(interaction, permissionError);
      try {
        await guild.bans.fetch(userId);
      } catch {
        return replyError(interaction, "Esse usuário não está banido neste servidor.");
      }
      await guild.members.unban(userId, reason);
      const item = await recordCase(guildId, userId, interaction.user.id, ModerationType.UNBAN, reason);
      await finish(interaction, item.id, userId, "desbanido", reason);
      return;
    }

    const user = interaction.options.getUser("membro", true);
    let target: GuildMember;
    try {
      target = await guild.members.fetch(user.id);
    } catch {
      return replyError(interaction, "Esse usuário não é membro atual do servidor.");
    }

    const targetError = memberActionError(moderator, target);
    if (targetError) return replyError(interaction, targetError);
    const reason = interaction.options.getString("motivo", true);
    const evidence = interaction.options.getString("evidencia");

    if (sub === "avisar") {
      const item = await recordCase(guildId, user.id, interaction.user.id, ModerationType.WARN, reason, undefined, evidence);
      await notify(user, guild.name, "aviso formal", reason);
      await finish(interaction, item.id, user.id, "avisado", reason);
      return;
    }

    if (sub === "timeout") {
      const permissionError = botPermissionError(moderator, BOT_PERMISSIONS.moderate.bit, BOT_PERMISSIONS.moderate.label);
      if (permissionError) return replyError(interaction, permissionError);
      if (!target.moderatable) return replyError(interaction, "O Discord informou que este membro não pode receber timeout pelo bot.");
      const minutes = interaction.options.getInteger("minutos", true);
      await notify(user, guild.name, `timeout de ${minutes} minuto(s)`, reason);
      await target.timeout(minutes * 60_000, reason);
      const item = await recordCase(guildId, user.id, interaction.user.id, ModerationType.TIMEOUT, reason, minutes * 60, evidence);
      await finish(interaction, item.id, user.id, `colocado em timeout por ${minutes} minuto(s)`, reason);
      return;
    }

    if (sub === "remover-timeout") {
      const permissionError = botPermissionError(moderator, BOT_PERMISSIONS.moderate.bit, BOT_PERMISSIONS.moderate.label);
      if (permissionError) return replyError(interaction, permissionError);
      await target.timeout(null, reason);
      const item = await recordCase(guildId, user.id, interaction.user.id, ModerationType.TIMEOUT_REMOVE, reason);
      await prisma.moderationCase.updateMany({ where: { guildId, userId: user.id, type: ModerationType.TIMEOUT, active: true }, data: { active: false, revokedAt: new Date(), revokedBy: interaction.user.id } });
      await finish(interaction, item.id, user.id, "retirado do timeout", reason);
      return;
    }

    if (sub === "expulsar") {
      const permissionError = botPermissionError(moderator, BOT_PERMISSIONS.kick.bit, BOT_PERMISSIONS.kick.label);
      if (permissionError) return replyError(interaction, permissionError);
      if (!target.kickable) return replyError(interaction, "O Discord informou que este membro não pode ser expulso pelo bot.");
      await notify(user, guild.name, "expulsão", reason);
      await target.kick(reason);
      const item = await recordCase(guildId, user.id, interaction.user.id, ModerationType.KICK, reason, undefined, evidence);
      await finish(interaction, item.id, user.id, "expulso", reason);
      return;
    }

    const permissionError = botPermissionError(moderator, BOT_PERMISSIONS.ban.bit, BOT_PERMISSIONS.ban.label);
    if (permissionError) return replyError(interaction, permissionError);
    if (!target.bannable) return replyError(interaction, "O Discord informou que este membro não pode ser banido pelo bot.");
    await notify(user, guild.name, "banimento", reason);
    await target.ban({ reason });
    const item = await recordCase(guildId, user.id, interaction.user.id, ModerationType.BAN, reason, undefined, evidence);
    await finish(interaction, item.id, user.id, "banido", reason);
  },
};

function memberReason(builder: any, evidence: boolean) {
  builder
    .addUserOption((opt: any) => opt.setName("membro").setDescription("Membro alvo").setRequired(true))
    .addStringOption((opt: any) => opt.setName("motivo").setDescription("Motivo objetivo").setMinLength(5).setMaxLength(500).setRequired(true));
  if (evidence) builder.addStringOption((opt: any) => opt.setName("evidencia").setDescription("Link de evidência").setMaxLength(500));
  return builder;
}

async function recordCase(
  guildId: string,
  userId: string,
  moderatorId: string,
  type: ModerationType,
  reason: string,
  durationSeconds?: number,
  evidenceUrl?: string | null,
) {
  return prisma.moderationCase.create({
    data: {
      guildId,
      userId,
      moderatorId,
      type,
      reason,
      durationSeconds,
      expiresAt: durationSeconds ? new Date(Date.now() + durationSeconds * 1_000) : undefined,
      evidenceUrl: evidenceUrl || undefined,
      active: !new Set<ModerationType>([
        ModerationType.KICK,
        ModerationType.UNBAN,
        ModerationType.TIMEOUT_REMOVE,
      ]).has(type),
    },
  });
}

async function finish(interaction: any, caseId: string, userId: string, action: string, reason: string) {
  const embed = createWarningEmbed(`<@${userId}> foi **${action}**.\n**Motivo:** ${reason}\n**Caso:** \`${caseId}\``, "🛡️ Ação de moderação");
  await writeAudit({ guildId: interaction.guildId, actorId: interaction.user.id, action: `moderation.${action}`, targetId: userId, entityType: "ModerationCase", entityId: caseId, details: { reason } });
  await sendGuildLog(interaction.client, interaction.guildId, "moderation", embed);
  await interaction.reply({ embeds: [createSuccessEmbed(`Ação concluída. Caso registrado como \`${caseId}\`.`)] });
}

async function notify(user: User, guildName: string, action: string, reason: string) {
  try {
    await user.send({ embeds: [createWarningEmbed(`Você recebeu **${action}** em **${guildName}**.\n**Motivo:** ${reason}`, "Aviso de moderação")] });
  } catch {
    // DMs podem estar fechadas; isso não deve impedir uma ação válida.
  }
}

async function replyError(interaction: any, message: string) {
  await interaction.reply({ embeds: [createErrorEmbed(message)], flags: MessageFlags.Ephemeral });
}

function unix(date: Date): number {
  return Math.floor(date.getTime() / 1_000);
}

function typeLabel(type: ModerationType): string {
  return ({ WARN: "Aviso", TIMEOUT: "Timeout", TIMEOUT_REMOVE: "Remoção de timeout", KICK: "Expulsão", BAN: "Banimento", UNBAN: "Desbanimento" } as const)[type];
}

export default command;
