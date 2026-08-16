import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { AffiliateStatus } from "../../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { writeAudit } from "../../services/audit.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from "../../utils/embeds.js";
import { limitedJoin } from "../../utils/text.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("frota").setDescription("Frotas Afiliadas: identidade própria vinculada à Boundless.")
    .addSubcommand((sub) => sub.setName("registrar").setDescription("Registra uma Frota Afiliada.")
      .addStringOption((opt) => opt.setName("nome").setDescription("Nome oficial").setMinLength(2).setMaxLength(80).setRequired(true))
      .addStringOption((opt) => opt.setName("descricao").setDescription("Identidade e vínculo").setMinLength(10).setMaxLength(500).setRequired(true))
      .addUserOption((opt) => opt.setName("capitao").setDescription("Capitão responsável"))
      .addStringOption((opt) => opt.setName("contato").setDescription("Contato ou referência").setMaxLength(120)))
    .addSubcommand((sub) => sub.setName("status").setDescription("Atualiza o estado de uma Frota Afiliada.")
      .addStringOption((opt) => opt.setName("nome").setDescription("Nome exato").setRequired(true))
      .addStringOption((opt) => opt.setName("estado").setDescription("Estado").setRequired(true).addChoices({ name: "Ativa", value: AffiliateStatus.ACTIVE }, { name: "Inativa", value: AffiliateStatus.INACTIVE })))
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista as Frotas Afiliadas."))
    .addSubcommand((sub) => sub.setName("remover").setDescription("Remove o vínculo registrado.")
      .addStringOption((opt) => opt.setName("nome").setDescription("Nome exato").setRequired(true))),
  category: CommandCategory.ORGANIZATION,
  permissionLevel: (interaction) => interaction.options.getSubcommand() === "listar" ? PermissionLevel.MEMBER : PermissionLevel.ADMIN,
  helpPermissionLevel: PermissionLevel.MEMBER,
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === "listar") {
        const items = await prisma.affiliateFleet.findMany({ where: { guildId }, orderBy: [{ status: "asc" }, { name: "asc" }] });
        const lines = items.map((item) => `${item.status === AffiliateStatus.ACTIVE ? "🟢" : "⚪"} **${item.name}**${item.captainId ? ` • capitão <@${item.captainId}>` : ""}\n${item.description}`);
        await interaction.reply({ embeds: [createInfoEmbed(limitedJoin(lines) || "Nenhuma Frota Afiliada registrada.", "🏴‍☠️ Frotas Afiliadas")] });
        return;
      }
      const name = interaction.options.getString("nome", true).trim();
      if (sub === "registrar") {
        const description = interaction.options.getString("descricao", true);
        const captain = interaction.options.getUser("capitao");
        const contact = interaction.options.getString("contato");
        const item = await prisma.affiliateFleet.create({ data: { guildId, name, description, captainId: captain?.id, contact, createdBy: interaction.user.id } });
        await log(interaction, "affiliate.create", item.id, captain?.id, { name });
        await interaction.reply({ embeds: [createSuccessEmbed(`A Frota Afiliada **${name}** foi registrada. ID: \`${item.id}\``)] });
      } else {
        const item = await prisma.affiliateFleet.findUnique({ where: { guildId_name: { guildId, name } } });
        if (!item) throw new Error("Frota Afiliada não encontrada; use o nome exato.");
        if (sub === "status") {
          const status = interaction.options.getString("estado", true) as AffiliateStatus;
          await prisma.affiliateFleet.update({ where: { id: item.id }, data: { status } });
          await log(interaction, "affiliate.status", item.id, item.captainId ?? undefined, { status });
          await interaction.reply({ embeds: [createSuccessEmbed(`**${item.name}** agora está **${status === AffiliateStatus.ACTIVE ? "ativa" : "inativa"}**.`)] });
        } else {
          await prisma.affiliateFleet.delete({ where: { id: item.id } });
          await log(interaction, "affiliate.remove", item.id, item.captainId ?? undefined, { name });
          await interaction.reply({ embeds: [createSuccessEmbed(`O vínculo de **${item.name}** foi removido.`)] });
        }
      }
    } catch (error) {
      const message = error instanceof Error && error.message.includes("Unique constraint") ? "Já existe uma Frota Afiliada com esse nome." : error instanceof Error ? error.message : "Não foi possível processar a Frota.";
      await interaction.reply({ embeds: [createErrorEmbed(message)], flags: MessageFlags.Ephemeral });
    }
  },
};

async function log(interaction: any, action: string, entityId: string, targetId: string | undefined, details: Record<string, unknown>) {
  await writeAudit({ guildId: interaction.guildId, actorId: interaction.user.id, action, targetId, entityType: "AffiliateFleet", entityId, details });
}

export default command;
