import { createHash, randomInt } from "node:crypto";
import type { GuildMember, Message } from "discord.js";
import { prisma } from "../database/client.js";
import type { GuildConfig } from "../../generated/prisma/client.js";
import { createInfoEmbed } from "../utils/embeds.js";

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function xpForLevel(level: number): number {
  return Math.max(0, (level - 1) ** 2 * 100);
}

function fingerprint(content: string): string {
  return createHash("sha256").update(content.trim().toLowerCase()).digest("hex").slice(0, 24);
}

export async function processXpMessage(message: Message<true>, config: GuildConfig): Promise<void> {
  if (!config.xpEnabled || message.content.trim().length < 8 || message.content.startsWith(config.prefix)) return;

  const now = new Date();
  const current = await prisma.user.findUnique({
    where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
  });
  const hash = fingerprint(message.content);
  const onCooldown = current?.lastXpAt
    ? now.getTime() - current.lastXpAt.getTime() < config.xpCooldownSeconds * 1_000
    : false;
  const repeated = current?.lastMessageHash === hash;

  if (onCooldown || repeated) return;

  const min = Math.min(config.xpMin, config.xpMax);
  const max = Math.max(config.xpMin, config.xpMax);
  const gained = randomInt(min, max + 1);
  const oldLevel = current?.level ?? 1;
  const nextXp = (current?.xp ?? 0) + gained;
  const nextLevel = levelFromXp(nextXp);

  const profile = await prisma.user.upsert({
    where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
    create: {
      userId: message.author.id,
      guildId: message.guildId,
      xp: gained,
      level: nextLevel,
      messages: 1,
      lastXpAt: now,
      lastMessageHash: hash,
    },
    update: {
      xp: { increment: gained },
      level: nextLevel,
      messages: { increment: 1 },
      lastXpAt: now,
      lastMessageHash: hash,
    },
  });

  if (nextLevel <= oldLevel) return;
  await applyLevelRewards(message.member, profile.level);
  await message.channel.send({
    embeds: [createInfoEmbed(`${message.author} alcançou o **nível ${profile.level}**.`, "⭐ Novo nível")],
  });
}

async function applyLevelRewards(member: GuildMember | null, level: number): Promise<void> {
  if (!member) return;
  const rewards = await prisma.levelReward.findMany({
    where: { guildId: member.guild.id, level: { lte: level } },
  });
  const botPosition = member.guild.members.me?.roles.highest.position ?? 0;
  const missing = rewards
    .map((reward) => member.guild.roles.cache.get(reward.roleId))
    .filter((role) => role && !role.managed && role.position < botPosition && !member.roles.cache.has(role.id))
    .map((role) => role!.id);
  if (missing.length && member.manageable) await member.roles.add(missing, `Recompensas de nível ${level}`);
}
