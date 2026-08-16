CREATE TABLE "guild_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'b!',
    "legacyPrefixEnabled" BOOLEAN NOT NULL DEFAULT true,
    "adminRoleId" TEXT,
    "moderatorRoleId" TEXT,
    "supportRoleId" TEXT,
    "logChannelModerationId" TEXT,
    "logChannelAdminId" TEXT,
    "logChannelSystemId" TEXT,
    "welcomeChannelId" TEXT,
    "memberRoleId" TEXT,
    "xpEnabled" BOOLEAN NOT NULL DEFAULT true,
    "xpCooldownSeconds" INTEGER NOT NULL DEFAULT 60,
    "xpMin" INTEGER NOT NULL DEFAULT 10,
    "xpMax" INTEGER NOT NULL DEFAULT 18,
    "prestigeDailyLimit" INTEGER NOT NULL DEFAULT 150,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "lastXpAt" DATETIME,
    "lastMessageHash" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "moderation_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "expiresAt" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "evidenceUrl" TEXT,
    "revokedAt" DATETIME,
    "revokedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "hierarchy_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "council_memberships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "council" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'Conselheiro',
    "appointedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "specialization_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "depth_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "prestige_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeLost" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "prestige_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "validatedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "divisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "leaderId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "division_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Membro',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "division_members_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "affiliate_fleets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captainId" TEXT,
    "description" TEXT NOT NULL,
    "contact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "conquests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "fleet_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "expeditions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" DATETIME,
    "completedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "expedition_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expeditionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Participante',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expedition_members_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "expeditions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "role_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleIds" TEXT NOT NULL,
    "maxRoles" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "level_rewards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL
);

CREATE UNIQUE INDEX "guild_configs_guildId_key" ON "guild_configs"("guildId");
CREATE INDEX "users_guildId_xp_idx" ON "users"("guildId", "xp");
CREATE UNIQUE INDEX "users_userId_guildId_key" ON "users"("userId", "guildId");
CREATE INDEX "moderation_cases_guildId_userId_createdAt_idx" ON "moderation_cases"("guildId", "userId", "createdAt");
CREATE INDEX "moderation_cases_guildId_active_idx" ON "moderation_cases"("guildId", "active");
CREATE INDEX "audit_logs_guildId_createdAt_idx" ON "audit_logs"("guildId", "createdAt");
CREATE INDEX "hierarchy_assignments_guildId_rank_idx" ON "hierarchy_assignments"("guildId", "rank");
CREATE UNIQUE INDEX "hierarchy_assignments_guildId_userId_key" ON "hierarchy_assignments"("guildId", "userId");
CREATE INDEX "council_memberships_guildId_council_idx" ON "council_memberships"("guildId", "council");
CREATE UNIQUE INDEX "council_memberships_guildId_userId_council_key" ON "council_memberships"("guildId", "userId", "council");
CREATE INDEX "specialization_assignments_guildId_name_idx" ON "specialization_assignments"("guildId", "name");
CREATE UNIQUE INDEX "specialization_assignments_guildId_userId_name_key" ON "specialization_assignments"("guildId", "userId", "name");
CREATE INDEX "depth_assignments_guildId_tier_idx" ON "depth_assignments"("guildId", "tier");
CREATE UNIQUE INDEX "depth_assignments_guildId_userId_area_key" ON "depth_assignments"("guildId", "userId", "area");
CREATE INDEX "prestige_balances_guildId_balance_idx" ON "prestige_balances"("guildId", "balance");
CREATE UNIQUE INDEX "prestige_balances_guildId_userId_key" ON "prestige_balances"("guildId", "userId");
CREATE INDEX "prestige_transactions_guildId_userId_createdAt_idx" ON "prestige_transactions"("guildId", "userId", "createdAt");
CREATE INDEX "prestige_transactions_guildId_status_createdAt_idx" ON "prestige_transactions"("guildId", "status", "createdAt");
CREATE INDEX "divisions_guildId_idx" ON "divisions"("guildId");
CREATE UNIQUE INDEX "divisions_guildId_name_key" ON "divisions"("guildId", "name");
CREATE INDEX "division_members_divisionId_idx" ON "division_members"("divisionId");
CREATE UNIQUE INDEX "division_members_guildId_userId_key" ON "division_members"("guildId", "userId");
CREATE INDEX "affiliate_fleets_guildId_status_idx" ON "affiliate_fleets"("guildId", "status");
CREATE UNIQUE INDEX "affiliate_fleets_guildId_name_key" ON "affiliate_fleets"("guildId", "name");
CREATE INDEX "conquests_guildId_occurredAt_idx" ON "conquests"("guildId", "occurredAt");
CREATE INDEX "fleet_records_guildId_occurredAt_idx" ON "fleet_records"("guildId", "occurredAt");
CREATE INDEX "expeditions_guildId_status_createdAt_idx" ON "expeditions"("guildId", "status", "createdAt");
CREATE INDEX "expedition_members_userId_idx" ON "expedition_members"("userId");
CREATE UNIQUE INDEX "expedition_members_expeditionId_userId_key" ON "expedition_members"("expeditionId", "userId");
CREATE UNIQUE INDEX "role_groups_guildId_name_key" ON "role_groups"("guildId", "name");
CREATE UNIQUE INDEX "level_rewards_guildId_level_roleId_key" ON "level_rewards"("guildId", "level", "roleId");
