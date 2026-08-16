import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../database/client.js";
import { PermissionLevel } from "../../services/permissions.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { createInfoEmbed } from "../../utils/embeds.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("status").setDescription("Mostra a saúde e o estado do Boundless Core."),
  category: CommandCategory.PUBLIC,
  permissionLevel: PermissionLevel.MEMBER,
  cooldownSeconds: 5,
  async execute(interaction) {
    let database = "✅ conectado";
    try { await prisma.$queryRaw`SELECT 1`; } catch { database = "❌ indisponível"; }
    const uptime = Math.floor(process.uptime());
    const embed = createInfoEmbed("Estado atual do serviço.", "⚓ Boundless Core")
      .addFields(
        { name: "Discord", value: interaction.client.isReady() ? "✅ conectado" : "⚠️ iniciando", inline: true },
        { name: "Banco", value: database, inline: true },
        { name: "WebSocket", value: `${interaction.client.ws.ping} ms`, inline: true },
        { name: "Tempo online", value: formatUptime(uptime), inline: true },
        { name: "Servidores", value: String(interaction.client.guilds.cache.size), inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};

function formatUptime(total: number): string {
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  return `${days}d ${hours}h ${minutes}min`;
}
export default command;
