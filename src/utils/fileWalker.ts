import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Percorre recursivamente um diretório e retorna os caminhos absolutos
 * de todos os arquivos ".ts" encontrados (ignorando arquivos de
 * definição ".d.ts").
 *
 * Usado pelos três carregadores (comandos, comandos de prefixo, eventos)
 * e pelo script de registro de Slash Commands — a lógica de "encontrar
 * arquivos" existe em um único lugar em vez de duplicada em cada um.
 */
export function findCodeFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findCodeFiles(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

/** Compatibilidade com imports da Fase 1. */
export const findTsFiles = findCodeFiles;
