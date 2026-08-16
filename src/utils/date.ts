export function parseDateOnly(value: string | null | undefined, fallback = new Date()): Date {
  if (!value) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Use a data no formato AAAA-MM-DD.");
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");
  return date;
}

export function unix(date: Date): number {
  return Math.floor(date.getTime() / 1_000);
}
