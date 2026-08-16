import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrestigeCategory } from "../generated/prisma/client.js";
import { prisma } from "../src/database/client.js";
import { requestPrestige } from "../src/services/prestige.js";
import type { SlashCommand } from "../src/types/command.js";
import { findCodeFiles } from "../src/utils/fileWalker.js";

const here = dirname(fileURLToPath(import.meta.url));
const guildId = "__BOUNDLESS_SMOKE_GUILD__";
const userId = "__BOUNDLESS_SMOKE_MEMBER__";

async function main() {
  const names = new Set<string>();
  for (const file of findCodeFiles(join(here, "..", "src", "commands"))) {
    const imported = await import(pathToFileURL(file).href);
    const command = imported.default as SlashCommand;
    const json = command.data.toJSON();
    if (names.has(json.name)) throw new Error(`Comando duplicado: ${json.name}`);
    names.add(json.name);
  }

  await cleanup();
  const item = await requestPrestige({
    guildId,
    userId,
    amount: 25,
    category: PrestigeCategory.COMUNIDADE,
    reason: "Teste automatizado de contribuição",
    requestedBy: "__BOUNDLESS_SMOKE_ADMIN__",
    autoApprove: true,
    rollingDailyLimit: 150,
  });
  const balance = await prisma.prestigeBalance.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });
  if (item.status !== "APPROVED" || balance?.balance !== 25) {
    throw new Error("O fluxo de Prestígio não atualizou o saldo corretamente.");
  }
  await cleanup();
  console.log(`OK: ${names.size} comandos e banco/Prestígio validados.`);
}

async function cleanup() {
  await prisma.prestigeTransaction.deleteMany({ where: { guildId } });
  await prisma.prestigeBalance.deleteMany({ where: { guildId } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
