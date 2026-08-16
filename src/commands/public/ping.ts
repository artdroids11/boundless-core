import { SlashCommandBuilder } from "discord.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { PermissionLevel } from "../../services/permissions.js";
import { createInfoEmbed } from "../../utils/embeds.js";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Mostra a latência do Boundless Core."),
  category: CommandCategory.PUBLIC,
  permissionLevel: PermissionLevel.MEMBER,
  async execute(interaction) {
    // `withResponse` é a forma atual de obter a mensagem enviada pela
    // resposta — a opção antiga `fetchReply` foi descontinuada pelo
    // discord.js (e será removida na v15).
    const response = await interaction.reply({
      embeds: [createInfoEmbed("Calculando...", "🏓 Pong!")],
      withResponse: true,
    });

    const enviada = response.resource?.message;
    const latenciaApi = enviada
      ? enviada.createdTimestamp - interaction.createdTimestamp
      : Date.now() - interaction.createdTimestamp;
    const latenciaWs = interaction.client.ws.ping;

    await interaction.editReply({
      embeds: [createInfoEmbed(`🏓 **API:** ${latenciaApi}ms\n📡 **WebSocket:** ${latenciaWs}ms`, "Pong!")],
    });
  },
};

export default command;
