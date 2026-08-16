import { PermissionFlagsBits, type GuildMember } from "discord.js";

export function memberActionError(actor: GuildMember, target: GuildMember): string | null {
  const bot = actor.guild.members.me;
  if (!bot) return "Não consegui localizar meu próprio membro no servidor.";
  if (target.id === actor.id) return "Você não pode aplicar essa ação em si mesmo.";
  if (target.id === actor.guild.ownerId) return "O dono do servidor é um alvo protegido.";
  if (target.user.bot) return "Bots são alvos protegidos por este comando.";

  const actorIsOwner = actor.id === actor.guild.ownerId;
  if (!actorIsOwner && actor.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    return "Seu cargo mais alto precisa estar acima do cargo mais alto do alvo.";
  }

  if (bot.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    return "O cargo do Boundless Core precisa ficar acima do cargo mais alto do alvo.";
  }
  return null;
}

export function botPermissionError(member: GuildMember, permission: bigint, label: string): string | null {
  const bot = member.guild.members.me;
  if (!bot?.permissions.has(permission)) return `O bot precisa da permissão **${label}** para executar essa ação.`;
  return null;
}

export const BOT_PERMISSIONS = {
  moderate: { bit: PermissionFlagsBits.ModerateMembers, label: "Moderar Membros" },
  kick: { bit: PermissionFlagsBits.KickMembers, label: "Expulsar Membros" },
  ban: { bit: PermissionFlagsBits.BanMembers, label: "Banir Membros" },
} as const;
