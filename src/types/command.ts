import type {
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { PermissionLevel } from "../services/permissions.js";
import type { GuildConfig } from "../../generated/prisma/client.js";

/**
 * Categorias usadas para organizar dinamicamente o /help. Algumas ficam
 * reservadas para módulos que ainda não possuem comandos públicos.
 */
export enum CommandCategory {
  PUBLIC = "public",
  ADMINISTRATION = "administration",
  MODERATION = "moderation",
  ROLES = "roles",
  LEVELS = "levels",
  PANELS = "panels",
  ECONOMY = "economy",
  ORGANIZATION = "organization",
  PRESTIGE = "prestige",
}

/**
 * Contexto compartilhado, calculado UMA VEZ em interactionCreate.ts (ou
 * messageCreate.ts) e repassado para dentro do comando — assim, nenhum
 * comando individual precisa consultar o banco de novo só para saber a
 * configuração do servidor ou o nível de permissão de quem o executou.
 */
export interface CommandContext {
  level: PermissionLevel;
  guildConfig: GuildConfig;
}

export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  category: CommandCategory;
  /** Nível mínimo exigido para usar o comando. Nunca verifique cargos
   *  manualmente dentro do `execute` — isso já acontece antes, de
   *  forma centralizada, em src/events/interactionCreate.ts. */
  permissionLevel:
    | PermissionLevel
    | ((interaction: ChatInputCommandInteraction) => PermissionLevel);
  /** Menor nível que possui ao menos um subcomando, usado pelo /help. */
  helpPermissionLevel?: PermissionLevel;
  cooldownSeconds?: number;
  execute: (interaction: ChatInputCommandInteraction, ctx: CommandContext) => Promise<void>;
}

export interface PrefixCommand {
  name: string;
  aliases?: string[];
  category: CommandCategory;
  permissionLevel: PermissionLevel;
  execute: (message: Message, args: string[], ctx: CommandContext) => Promise<void>;
}
