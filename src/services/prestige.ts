import { PrestigeStatus, type PrestigeCategory } from "../../generated/prisma/client.js";
import { prisma } from "../database/client.js";

const TRANSACTION_LIMIT = 100;

export interface PrestigeRequest {
  guildId: string;
  userId: string;
  amount: number;
  category: PrestigeCategory;
  reason: string;
  evidenceUrl?: string | null;
  requestedBy: string;
  autoApprove: boolean;
  rollingDailyLimit: number;
}

export async function requestPrestige(input: PrestigeRequest) {
  if (input.userId === input.requestedBy) throw new Error("Você não pode conceder PP a si mesmo.");
  if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > TRANSACTION_LIMIT) {
    throw new Error(`Cada concessão deve ter entre 1 e ${TRANSACTION_LIMIT} PP.`);
  }
  if (input.reason.trim().length < 10) throw new Error("Explique o feito em pelo menos 10 caracteres.");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1_000);
  const duplicate = await prisma.prestigeTransaction.findFirst({
    where: {
      guildId: input.guildId,
      userId: input.userId,
      category: input.category,
      reason: input.reason.trim(),
      status: { in: [PrestigeStatus.PENDING, PrestigeStatus.APPROVED] },
      createdAt: { gte: since },
    },
  });
  if (duplicate) throw new Error(`Uma concessão igual já existe (\`${duplicate.id}\`).`);

  if (input.autoApprove) await assertWithinLimit(input.guildId, input.userId, input.amount, input.rollingDailyLimit);

  return prisma.$transaction(async (tx) => {
    const item = await tx.prestigeTransaction.create({
      data: {
        guildId: input.guildId,
        userId: input.userId,
        amount: input.amount,
        category: input.category,
        reason: input.reason.trim(),
        evidenceUrl: input.evidenceUrl || undefined,
        requestedBy: input.requestedBy,
        status: input.autoApprove ? PrestigeStatus.APPROVED : PrestigeStatus.PENDING,
        validatedBy: input.autoApprove ? input.requestedBy : undefined,
        reviewedAt: input.autoApprove ? new Date() : undefined,
      },
    });
    if (input.autoApprove) {
      await tx.prestigeBalance.upsert({
        where: { guildId_userId: { guildId: input.guildId, userId: input.userId } },
        create: { guildId: input.guildId, userId: input.userId, balance: input.amount, lifetimeEarned: input.amount },
        update: { balance: { increment: input.amount }, lifetimeEarned: { increment: input.amount } },
      });
    }
    return item;
  });
}

export async function approvePrestige(id: string, guildId: string, reviewerId: string, dailyLimit: number) {
  const item = await prisma.prestigeTransaction.findFirst({ where: { id, guildId } });
  if (!item) throw new Error("Solicitação de Prestígio não encontrada neste servidor.");
  if (item.status !== PrestigeStatus.PENDING) throw new Error("Essa solicitação já foi analisada.");
  if (item.requestedBy === reviewerId) throw new Error("Quem propôs a concessão não pode aprová-la.");
  await assertWithinLimit(guildId, item.userId, item.amount, dailyLimit);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.prestigeTransaction.update({
      where: { id },
      data: { status: PrestigeStatus.APPROVED, validatedBy: reviewerId, reviewedAt: new Date() },
    });
    await tx.prestigeBalance.upsert({
      where: { guildId_userId: { guildId, userId: item.userId } },
      create: { guildId, userId: item.userId, balance: item.amount, lifetimeEarned: item.amount },
      update: { balance: { increment: item.amount }, lifetimeEarned: { increment: item.amount } },
    });
    return updated;
  });
}

export async function rejectPrestige(id: string, guildId: string, reviewerId: string, note: string) {
  const item = await prisma.prestigeTransaction.findFirst({ where: { id, guildId } });
  if (!item) throw new Error("Solicitação de Prestígio não encontrada neste servidor.");
  if (item.status !== PrestigeStatus.PENDING) throw new Error("Essa solicitação já foi analisada.");
  return prisma.prestigeTransaction.update({
    where: { id },
    data: { status: PrestigeStatus.REJECTED, validatedBy: reviewerId, reviewNote: note, reviewedAt: new Date() },
  });
}

export async function removePrestige(
  guildId: string,
  userId: string,
  amount: number,
  category: PrestigeCategory,
  reason: string,
  actorId: string,
) {
  if (userId === actorId) throw new Error("Você não pode alterar seu próprio Prestígio.");
  if (amount < 1 || amount > TRANSACTION_LIMIT) throw new Error(`A retirada deve ter entre 1 e ${TRANSACTION_LIMIT} PP.`);
  const balance = await prisma.prestigeBalance.findUnique({ where: { guildId_userId: { guildId, userId } } });
  if (!balance || balance.balance < amount) throw new Error("O membro não possui PP suficiente para essa retirada.");

  return prisma.$transaction(async (tx) => {
    const item = await tx.prestigeTransaction.create({
      data: {
        guildId,
        userId,
        amount: -amount,
        category,
        reason,
        requestedBy: actorId,
        validatedBy: actorId,
        status: PrestigeStatus.APPROVED,
        reviewedAt: new Date(),
      },
    });
    await tx.prestigeBalance.update({
      where: { guildId_userId: { guildId, userId } },
      data: { balance: { decrement: amount }, lifetimeLost: { increment: amount } },
    });
    return item;
  });
}

async function assertWithinLimit(guildId: string, userId: string, amount: number, dailyLimit: number) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1_000);
  const aggregate = await prisma.prestigeTransaction.aggregate({
    where: { guildId, userId, status: PrestigeStatus.APPROVED, amount: { gt: 0 }, reviewedAt: { gte: since } },
    _sum: { amount: true },
  });
  if ((aggregate._sum.amount ?? 0) + amount > dailyLimit) {
    throw new Error(`A concessão ultrapassaria o limite de ${dailyLimit} PP em 24 horas para este membro.`);
  }
}
