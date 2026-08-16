import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../database/client.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { levelFromXp, xpForLevel } from "../../services/xp.js";
import { createInfoEmbed } from "../../utils/embeds.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("perfil").setDescription("Mostra XP, nível e Prestígio sem misturar os sistemas.")
    .addUserOption((opt) => opt.setName("membro").setDescription("Membro; vazio mostra você")),
  category: CommandCategory.LEVELS,
  permissionLevel: PermissionLevel.MEMBER,
  cooldownSeconds: 3,
  async execute(interaction) {
    const user = interaction.options.getUser("membro") ?? interaction.user;
    const guildId = interaction.guildId!;
    const [xp, pp] = await Promise.all([
      prisma.user.findUnique({ where: { userId_guildId: { guildId, userId: user.id } } }),
      prisma.prestigeBalance.findUnique({ where: { guildId_userId: { guildId, userId: user.id } } }),
    ]);
    const points = xp?.xp ?? 0;
    const level = xp?.level ?? levelFromXp(points);
    const currentFloor = xpForLevel(level);
    const next = xpForLevel(level + 1);
    const progress = Math.max(0, points - currentFloor);
    const needed = Math.max(1, next - currentFloor);
    const filled = Math.min(10, Math.floor((progress / needed) * 10));
    const bar = `${"▰".repeat(filled)}${"▱".repeat(10 - filled)}`;
    const embed = createInfoEmbed("XP mede atividade; PP mede feitos reconhecidos.", `⚓ Perfil — ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "Nível", value: `**${level}**`, inline: true },
        { name: "XP", value: `**${points}**`, inline: true },
        { name: "Prestígio", value: `**${pp?.balance ?? 0} PP**`, inline: true },
        { name: "Progresso", value: `${bar}\n${progress}/${needed} XP para o próximo nível` },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
export default command;
