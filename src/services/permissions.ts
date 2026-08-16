import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { GuildConfig } from "../../generated/prisma/client.js";

export enum PermissionLevel {
  MEMBER = 0,
  SUPPORT = 1,
  MODERATOR = 2,
  ADMIN = 3,
  OWNER = 4,
}

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  [PermissionLevel.MEMBER]: "Membro",
  [PermissionLevel.SUPPORT]: "Equipe de Suporte",
  [PermissionLevel.MODERATOR]: "Moderador",
  [PermissionLevel.ADMIN]: "Administrador",
  [PermissionLevel.OWNER]: "Dono",
};

export function permissionLevelLabel(level: PermissionLevel): string {
  return LEVEL_LABELS[level];
}

/**
 * Ponto ÚNICO de verificação de permissões do bot (item 4 da
 * especificação: "sistema centralizado e reutilizável", nunca
 * `if (user.id === ...)` espalhado pelos comandos).
 *
 * Ordem de resolução, da mais alta para a mais baixa:
 *  1. Dono do servidor (guild.ownerId)                 → OWNER
 *  2. Cargo de Administrador configurado                → ADMIN
 *  3. Permissão nativa "Administrador" do Discord        → ADMIN
 *     (bootstrap: permite configurar o bot pela primeira vez em um
 *     servidor novo, antes de qualquer cargo ter sido definido)
 *  4. Cargo de Moderador configurado                    → MODERATOR
 *  5. Cargo de Suporte configurado                       → SUPPORT
 *  6. Nenhuma das anteriores                             → MEMBER
 *
 * Esta função é chamada centralmente em src/events/interactionCreate.ts
 * e src/events/messageCreate.ts — nenhum comando deve reimplementar
 * essa lógica.
 */
export function resolvePermissionLevel(
  member: GuildMember,
  guildConfig: Pick<GuildConfig, "adminRoleId" | "moderatorRoleId" | "supportRoleId">,
  guildOwnerId: string,
): PermissionLevel {
  if (member.id === guildOwnerId) return PermissionLevel.OWNER;

  if (guildConfig.adminRoleId && member.roles.cache.has(guildConfig.adminRoleId)) {
    return PermissionLevel.ADMIN;
  }

  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return PermissionLevel.ADMIN;
  }

  if (guildConfig.moderatorRoleId && member.roles.cache.has(guildConfig.moderatorRoleId)) {
    return PermissionLevel.MODERATOR;
  }

  if (guildConfig.supportRoleId && member.roles.cache.has(guildConfig.supportRoleId)) {
    return PermissionLevel.SUPPORT;
  }

  return PermissionLevel.MEMBER;
}
