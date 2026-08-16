import { EmbedBuilder } from "discord.js";

/**
 * Paleta de cores central do Boundless Core.
 *
 * Se um dia a identidade visual do bot mudar, troque as cores AQUI —
 * nenhum comando deve ter um código de cor "solto" no meio da lógica.
 *
 * `primary` é um azul-petróleo bem escuro (maritime/elegante, item 30
 * da especificação) e `accent` é um dourado que ecoa as dragonas da
 * farda da tripulação — usado em destaques especiais (ex: subida de
 * nível), não em toda mensagem.
 */
export const COLORS = {
  primary: 0x0b3d42,
  accent: 0xc9a227,
  success: 0x2ecc71,
  error: 0xe74c3c,
  warning: 0xf1c40f,
  info: 0x3a6ea5,
} as const;

function baseEmbed(): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.primary).setTimestamp();
}

export function createSuccessEmbed(description: string, title = "✅ Sucesso"): EmbedBuilder {
  return baseEmbed().setColor(COLORS.success).setTitle(title).setDescription(description);
}

export function createErrorEmbed(description: string, title = "❌ Erro"): EmbedBuilder {
  return baseEmbed().setColor(COLORS.error).setTitle(title).setDescription(description);
}

export function createWarningEmbed(description: string, title = "⚠️ Atenção"): EmbedBuilder {
  return baseEmbed().setColor(COLORS.warning).setTitle(title).setDescription(description);
}

export function createInfoEmbed(description: string, title = "ℹ️ Informação"): EmbedBuilder {
  return baseEmbed().setColor(COLORS.info).setTitle(title).setDescription(description);
}

// Novos estilos devem ser construídos sobre baseEmbed() para manter
// a identidade visual consistente.
