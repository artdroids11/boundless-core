import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { FleetRecordType } from "../../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { writeAudit } from "../../services/audit.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { parseDateOnly, unix } from "../../utils/date.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from "../../utils/embeds.js";
import { limitedJoin } from "../../utils/text.js";

const TYPES = [
  { name: "História", value: FleetRecordType.HISTORIA }, { name: "Decisão", value: FleetRecordType.DECISAO },
  { name: "Evento", value: FleetRecordType.EVENTO }, { name: "Mudança", value: FleetRecordType.MUDANCA },
  { name: "Memória", value: FleetRecordType.MEMORIA },
] as const;

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("registro").setDescription("Memória e história oficial da frota.")
    .addSubcommand((sub) => sub.setName("adicionar").setDescription("Adiciona um Registro da Frota.")
      .addStringOption((opt) => opt.setName("tipo").setDescription("Tipo do registro").setRequired(true).addChoices(...TYPES))
      .addStringOption((opt) => opt.setName("titulo").setDescription("Título").setMinLength(3).setMaxLength(100).setRequired(true))
      .addStringOption((opt) => opt.setName("conteudo").setDescription("Registro factual").setMinLength(10).setMaxLength(1500).setRequired(true))
      .addStringOption((opt) => opt.setName("data").setDescription("AAAA-MM-DD; vazio usa hoje")))
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista os registros recentes.")
      .addStringOption((opt) => opt.setName("tipo").setDescription("Filtrar por tipo").addChoices(...TYPES)))
    .addSubcommand((sub) => sub.setName("remover").setDescription("Remove um registro incorreto.")
      .addStringOption((opt) => opt.setName("id").setDescription("ID do Registro").setRequired(true))),
  category: CommandCategory.ORGANIZATION,
  permissionLevel: (interaction) => interaction.options.getSubcommand() === "listar" ? PermissionLevel.MEMBER : PermissionLevel.ADMIN,
  helpPermissionLevel: PermissionLevel.MEMBER,
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === "listar") {
        const type = interaction.options.getString("tipo") as FleetRecordType | null;
        const items = await prisma.fleetRecord.findMany({ where: { guildId, ...(type ? { type } : {}) }, orderBy: { occurredAt: "desc" }, take: 20 });
        const lines = items.map((item) => `📜 **${item.title}** • ${typeLabel(item.type)} • <t:${unix(item.occurredAt)}:D> • \`${item.id}\`\n${item.content}`);
        await interaction.reply({ embeds: [createInfoEmbed(limitedJoin(lines) || "Nenhum Registro da Frota.", "📜 Registro da Frota")] });
        return;
      }
      if (sub === "adicionar") {
        const type = interaction.options.getString("tipo", true) as FleetRecordType;
        const title = interaction.options.getString("titulo", true);
        const content = interaction.options.getString("conteudo", true);
        const occurredAt = parseDateOnly(interaction.options.getString("data"));
        const item = await prisma.fleetRecord.create({ data: { guildId, type, title, content, occurredAt, createdBy: interaction.user.id } });
        await audit(interaction, "record.create", item.id, { type, title });
        await interaction.reply({ embeds: [createSuccessEmbed(`O registro **${title}** foi adicionado. ID: \`${item.id}\``)] });
      } else {
        const id = interaction.options.getString("id", true);
        const item = await prisma.fleetRecord.findFirst({ where: { id, guildId } });
        if (!item) throw new Error("Registro não encontrado neste servidor.");
        await prisma.fleetRecord.delete({ where: { id } });
        await audit(interaction, "record.remove", id, { title: item.title });
        await interaction.reply({ embeds: [createSuccessEmbed(`O registro **${item.title}** foi removido.`)] });
      }
    } catch (error) {
      await interaction.reply({ embeds: [createErrorEmbed(error instanceof Error ? error.message : "Não foi possível processar o Registro.")], flags: MessageFlags.Ephemeral });
    }
  },
};

function typeLabel(type: FleetRecordType): string {
  return ({ HISTORIA: "História", DECISAO: "Decisão", EVENTO: "Evento", MUDANCA: "Mudança", MEMORIA: "Memória" } as const)[type];
}
async function audit(interaction: any, action: string, entityId: string, details: Record<string, unknown>) {
  await writeAudit({ guildId: interaction.guildId, actorId: interaction.user.id, action, entityType: "FleetRecord", entityId, details });
}
export default command;
