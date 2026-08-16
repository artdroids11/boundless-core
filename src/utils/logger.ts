/**
 * Logger simples e sem dependências externas.
 *
 * Logs técnicos do processo ficam no console. Logs operacionais enviados
 * ao Discord passam por services/logs.ts e nunca carregam o token.
 */

const RESET = "\x1b[0m";
const COLORS = {
  info: "\x1b[36m", // ciano
  success: "\x1b[32m", // verde
  warn: "\x1b[33m", // amarelo
  error: "\x1b[31m", // vermelho
};

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function print(level: keyof typeof COLORS, label: string, args: unknown[]): void {
  const color = COLORS[level];
  console.log(`${color}[${timestamp()}] ${label}${RESET}`, ...args);
}

export const logger = {
  info: (...args: unknown[]) => print("info", "INFO ", args),
  success: (...args: unknown[]) => print("success", "OK   ", args),
  warn: (...args: unknown[]) => print("warn", "WARN ", args),
  error: (...args: unknown[]) => print("error", "ERROR", args),
};
