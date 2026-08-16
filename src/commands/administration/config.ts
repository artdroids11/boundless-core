import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { CommandCategory, type SlashCommand } from "../../types/command.js";
import { PermissionLevel } from "../../services/permissions.js";
import { getGuildConfig, updateGuildConfig } from "../../services/guildConfig.js";
import { writeAudit } from "../../services/audit.js";
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from "../../utils/embeds.js";

const ROLE_FIELDS = {
  support: "supportRoleId",
  moderator: "moderatorRoleId",
  admin: "adminRoleId",
  member: "memberRoleId",
} as const;

const CHANNEL_FIELDS = {
  "log-moderacao": "logChannelModerationId",
  "log-admin": "logChannelAdminId",
  "log-sistema": "logChannelSystemId",
  "boas-vindas": "welcomeChannelId",
} as const;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configura e diagnostica o Boundless Core.")
    .addSubcommand((sub) =>
      sub
        .setName("cargo")
        .setDescription("Associa um cargo a uma função do bot.")
        .addStringOption((opt) =>
          opt.setName("tipo").setDescription("Função do cargo").setRequired(true).addChoices(
            { name: "Administrador", value: "admin" },
            { name: "Moderador", value: "moderator" },
            { name: "Suporte", value: "support" },
            { name: "Cargo inicial de membro", value: "member" },
          ),
        )
        .addRoleOption((opt) => opt.setName("cargo").setDescription("Cargo a associar").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("canal")
        .setDescription("Define um canal operacional do bot.")
        .addStringOption((opt) =>
          opt.setName("tipo").setDescription("Finalidade do canal").setRequired(true).addChoices(
            { name: "Log de moderação", value: "log-moderacao" },
            { name: "Log administrativo", value: "log-admin" },
            { name: "Log de sistema", value: "log-sistema" },
            { name: "Boas-vindas", value: "boas-vindas" },
          ),
        )
        .addChannelOption((opt) =>
          opt
            .setName("canal")
            .setDescription("Canal de texto")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("prefixo")
        .setDescription("Muda o prefixo legado de comandos de texto.")
        .addStringOption((opt) =>
          opt.setName("valor").setDescription("Novo prefixo, como b!").setMinLength(1).setMaxLength(5).setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("legado")
        .setDescription("Ativa ou desativa comandos de texto com prefixo.")
        .addBooleanOption((opt) => opt.setName("ativo").setDescription("Estado desejado").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("xp")
        .setDescription("Configura o ganho de XP por mensagens.")
        .addBooleanOption((opt) => opt.setName("ativo").setDescription("Ativar XP").setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName("cooldown").setDescription("Intervalo em segundos").setMinValue(20).setMaxValue(600),
        )
        .addIntegerOption((opt) => opt.setName("minimo").setDescription("XP mínimo").setMinValue(1).setMaxValue(100))
        .addIntegerOption((opt) => opt.setName("maximo").setDescription("XP máximo").setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("limite-pp")
        .setDescription("Define o limite diário de PP concedido por membro.")
        .addIntegerOption((opt) =>
          opt.setName("pontos").setDescription("Limite entre 25 e 1000").setMinValue(25).setMaxValue(1000).setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName("ver").setDescription("Mostra a configuração atual."))
    .addSubcommand((sub) => sub.setName("diagnostico").setDescription("Verifica banco, cargos, canais e permissões do bot.")),
  category: CommandCategory.ADMINISTRATION,
  permissionLevel: PermissionLevel.ADMIN,
  cooldownSeconds: 2,
  async execute(interaction) {
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();

    if (sub === "cargo") {
      const type = interaction.options.getString("tipo", true) as keyof typeof ROLE_FIELDS;
      const role = interaction.options.getRole("cargo", true);
      if (role.id === guildId) {
        await interaction.reply({ embeds: [createErrorEmbed("O cargo @everyone não pode ser usado.")], flags: MessageFlags.Ephemeral });
        return;
      }
      await updateGuildConfig(guildId, { [ROLE_FIELDS[type]]: role.id });
      await changed(interaction.user.id, guildId, "config.role", { type, roleId: role.id });
      await interaction.reply({ embeds: [createSuccessEmbed(`O cargo ${role} foi associado a **${type}**.`)] });
      return;
    }

    if (sub === "canal") {
      const type = interaction.options.getString("tipo", true) as keyof typeof CHANNEL_FIELDS;
      const channel = interaction.options.getChannel("canal", true);
      await updateGuildConfig(guildId, { [CHANNEL_FIELDS[type]]: channel.id });
      await changed(interaction.user.id, guildId, "config.channel", { type, channelId: channel.id });
      await interaction.reply({ embeds: [createSuccessEmbed(`O canal ${channel} foi associado a **${type}**.`)] });
      return;
    }

    if (sub === "prefixo") {
      const prefix = interaction.options.getString("valor", true).trim();
      if (/\s/.test(prefix)) {
        await interaction.reply({ embeds: [createErrorEmbed("O prefixo não pode conter espaços.")], flags: MessageFlags.Ephemeral });
        return;
      }
      await updateGuildConfig(guildId, { prefix });
      await changed(interaction.user.id, guildId, "config.prefix", { prefix });
      await interaction.reply({ embeds: [createSuccessEmbed(`O prefixo legado agora é \`${prefix}\`.`)] });
      return;
    }

    if (sub === "legado") {
      const active = interaction.options.getBoolean("ativo", true);
      await updateGuildConfig(guildId, { legacyPrefixEnabled: active });
      await changed(interaction.user.id, guildId, "config.legacy", { active });
      await interaction.reply({ embeds: [createSuccessEmbed(`Comandos com prefixo foram **${active ? "ativados" : "desativados"}**.`)] });
      return;
    }

    if (sub === "xp") {
      const active = interaction.options.getBoolean("ativo", true);
      const cooldown = interaction.options.getInteger("cooldown");
      const min = interaction.options.getInteger("minimo");
      const max = interaction.options.getInteger("maximo");
      const current = await getGuildConfig(guildId);
      const nextMin = min ?? current.xpMin;
      const nextMax = max ?? current.xpMax;
      if (nextMin > nextMax) {
        await interaction.reply({ embeds: [createErrorEmbed("O XP mínimo não pode ser maior que o máximo.")], flags: MessageFlags.Ephemeral });
        return;
      }
      await updateGuildConfig(guildId, {
        xpEnabled: active,
        ...(cooldown !== null ? { xpCooldownSeconds: cooldown } : {}),
        ...(min !== null ? { xpMin: min } : {}),
        ...(max !== null ? { xpMax: max } : {}),
      });
      await changed(interaction.user.id, guildId, "config.xp", { active, cooldown, min, max });
      await interaction.reply({ embeds: [createSuccessEmbed("Configuração de XP atualizada.")] });
      return;
    }

    if (sub === "limite-pp") {
      const points = interaction.options.getInteger("pontos", true);
      await updateGuildConfig(guildId, { prestigeDailyLimit: points });
      await changed(interaction.user.id, guildId, "config.prestige_limit", { points });
      await interaction.reply({ embeds: [createSuccessEmbed(`O limite diário foi definido em **${points} PP** por membro.`)] });
      return;
    }

    const config = await getGuildConfig(guildId);
    if (sub === "ver") {
      const embed = createInfoEmbed("Configuração isolada deste servidor.", "⚙️ Configuração — Boundless Core")
        .addFields(
          { name: "Permissões", value: `Admin: ${mentionRole(config.adminRoleId)}\nModerador: ${mentionRole(config.moderatorRoleId)}\nSuporte: ${mentionRole(config.supportRoleId)}` },
          { name: "Canais", value: `Moderação: ${mentionChannel(config.logChannelModerationId)}\nAdmin: ${mentionChannel(config.logChannelAdminId)}\nSistema: ${mentionChannel(config.logChannelSystemId)}\nBoas-vindas: ${mentionChannel(config.welcomeChannelId)}` },
          { name: "XP", value: `Estado: **${config.xpEnabled ? "ativo" : "inativo"}**\nFaixa: **${config.xpMin}–${config.xpMax}**\nCooldown: **${config.xpCooldownSeconds}s**`, inline: true },
          { name: "Outros", value: `Prefixo: \`${config.prefix}\` (${config.legacyPrefixEnabled ? "ativo" : "inativo"})\nLimite PP: **${config.prestigeDailyLimit}/dia**`, inline: true },
        );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    const me = interaction.guild!.members.me;
    const checks: Array<[string, boolean]> = [
      ["Banco de dados", true],
      ["Cargo do bot acima dos membros administrados", Boolean(me && me.roles.highest.position > 1)],
      ["Gerenciar cargos", Boolean(me?.permissions.has(PermissionFlagsBits.ManageRoles))],
      ["Moderar membros", Boolean(me?.permissions.has(PermissionFlagsBits.ModerateMembers))],
      ["Expulsar membros", Boolean(me?.permissions.has(PermissionFlagsBits.KickMembers))],
      ["Banir membros", Boolean(me?.permissions.has(PermissionFlagsBits.BanMembers))],
      ["Enviar mensagens e embeds", Boolean(me?.permissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]))],
    ];
    const text = checks.map(([label, ok]) => `${ok ? "✅" : "❌"} ${label}`).join("\n");
    await interaction.reply({ embeds: [createInfoEmbed(text, "🩺 Diagnóstico do servidor")], flags: MessageFlags.Ephemeral });
  },
};

async function changed(actorId: string, guildId: string, action: string, details: Record<string, unknown>) {
  await writeAudit({ guildId, actorId, action, entityType: "GuildConfig", details });
}

function mentionRole(id: string | null): string {
  return id ? `<@&${id}>` : "_não definido_";
}

function mentionChannel(id: string | null): string {
  return id ? `<#${id}>` : "_não definido_";
}

export default command;
