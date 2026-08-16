export function limitedJoin(items: string[], separator = "\n\n", limit = 3_800): string {
  if (!items.length) return "";
  let output = "";
  for (const item of items) {
    const candidate = output ? `${output}${separator}${item}` : item;
    if (candidate.length > limit) return `${output}${separator}…mais itens omitidos.`;
    output = candidate;
  }
  return output;
}

export function truncate(value: string, limit = 1_000): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}
