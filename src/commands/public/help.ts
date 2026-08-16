import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { PermissionLevel } from "../../services/permissions.js";
import { createInfoEmbed } from "../../utils/embeds.js";

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  [CommandCategory.PUBLIC]: "👤 Membro",
  [CommandCategory.ADMINISTRATION]: "⚙️ Administração",
  [CommandCategory.MODERATION]: "🛡️ Moderação",
  [CommandCategory.ROLES]: "🎭 Cargos",
  [CommandCategory.LEVELS]: "⭐ Níveis",
  [CommandCategory.PANELS]: "🧭 Painéis",
  [CommandCategory.ECONOMY]: "💰 Economia",
  [CommandCategory.ORGANIZATION]: "⚓ Organização Boundless",
  [CommandCategory.PRESTIGE]: "🏅 Prestígio",
};

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("help").setDescription("Mostra os comandos disponíveis para você."),
  category: CommandCategory.PUBLIC,
  permissionLevel: PermissionLevel.MEMBER,
  async execute(interaction, ctx) {
    // A lista de comandos é montada DINAMICAMENTE a partir do que está
    // carregado em client.commands — nunca escreva a lista à mão aqui.
    // Assim, o /help nunca fica desatualizado: basta adicionar um novo
    // arquivo em src/commands/ que ele já aparece automaticamente.
    const porCategoria = new Map<CommandCategory, string[]>();

    for (const cmd of interaction.client.commands.values()) {
      const requiredLevel = cmd.helpPermissionLevel ??
        (typeof cmd.permissionLevel === "function" ? PermissionLevel.MEMBER : cmd.permissionLevel);
      if (ctx.level < requiredLevel) continue; // esconde o que o usuário não pode usar

      const lista = porCategoria.get(cmd.category) ?? [];
      lista.push(`\`/${cmd.data.name}\` — ${cmd.data.description}`);
      porCategoria.set(cmd.category, lista);
    }

    const embed = createInfoEmbed(
      "Comandos disponíveis para o seu nível de permissão:",
      "⚓ Central de Ajuda — Boundless Core",
    );

    for (const [categoria, comandos] of porCategoria) {
      embed.addFields({ name: CATEGORY_LABELS[categoria], value: comandos.join("\n") });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
