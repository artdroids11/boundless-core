import { prisma } from "../database/client.js";

export interface AuditEntry {
  guildId: string;
  actorId: string;
  action: string;
  targetId?: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  const details = typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details ?? {});
  await prisma.auditLog.create({ data: { ...entry, details } });
}
