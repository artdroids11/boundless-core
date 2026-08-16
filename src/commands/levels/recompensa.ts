import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../database/client.js";
import { writeAudit } from "../../services/audit.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from "../../utils/embeds.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("recompensa").setDescription("Configura cargos concedidos por nível.")
    .addSubcommand((sub) => sub.setName("adicionar").setDescription("Adiciona uma recompensa de nível.")
      .addIntegerOption((opt) => opt.setName("nivel").setDescription("Nível necessário").setMinValue(2).setMaxValue(500).setRequired(true))
      .addRoleOption((opt) => opt.setName("cargo").setDescription("Cargo concedido").setRequired(true)))
    .addSubcommand((sub) => sub.setName("remover").setDescription("Remove uma recompensa.")
      .addIntegerOption((opt) => opt.setName("nivel").setDescription("Nível").setMinValue(2).setMaxValue(500).setRequired(true))
      .addRoleOption((opt) => opt.setName("cargo").setDescription("Cargo").setRequired(true)))
    .addSubcommand((sub) => sub.setName("listar").setDescription("Lista as recompensas configuradas.")),
  category: CommandCategory.LEVELS,
  permissionLevel: (interaction) => interaction.options.getSubcommand() === "listar" ? PermissionLevel.MEMBER : PermissionLevel.ADMIN,
  helpPermissionLevel: PermissionLevel.MEMBER,
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();
    if (sub === "listar") {
      const items = await prisma.levelReward.findMany({ where: { guildId }, orderBy: { level: "asc" } });
      await interaction.reply({ embeds: [createInfoEmbed(items.map((item) => `Nível **${item.level}** → <@&${item.roleId}>`).join("\n") || "Nenhuma recompensa configurada.", "⭐ Recompensas por nível")] });
      return;
    }
    const level = interaction.options.getInteger("nivel", true);
    const role = interaction.options.getRole("cargo", true);
    if (role.id === guildId || role.managed || role.position >= (interaction.guild!.members.me?.roles.highest.position ?? 0)) {
      await interaction.reply({ embeds: [createErrorEmbed("Escolha um cargo comum que esteja abaixo do cargo do Boundless Core.")], flags: MessageFlags.Ephemeral });
      return;
    }
    if (sub === "adicionar") {
      await prisma.levelReward.create({ data: { guildId, level, roleId: role.id } });
      await writeAudit({ guildId, actorId: interaction.user.id, action: "level_reward.add", entityType: "LevelReward", details: { level, roleId: role.id } });
      await interaction.reply({ embeds: [createSuccessEmbed(`${role} será concedido no **nível ${level}**.`)] });
    } else {
      const result = await prisma.levelReward.deleteMany({ where: { guildId, level, roleId: role.id } });
      if (!result.count) {
        await interaction.reply({ embeds: [createErrorEmbed("Essa recompensa não existe.")], flags: MessageFlags.Ephemeral });
        return;
      }
      await writeAudit({ guildId, actorId: interaction.user.id, action: "level_reward.remove", entityType: "LevelReward", details: { level, roleId: role.id } });
      await interaction.reply({ embeds: [createSuccessEmbed("Recompensa removida.")] });
    }
  },
};
export default command;
