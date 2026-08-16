/**
 * Formato de um arquivo de evento em src/events/.
 *
 * O tipo de `args` é intencionalmente genérico aqui (`any[]`) porque o
 * mesmo carregador (src/handlers/loadEvents.ts) lida com eventos de
 * formatos bem diferentes entre si — `ready` recebe um Client,
 * `interactionCreate` recebe uma Interaction, `messageCreate` recebe
 * uma Message. Cada arquivo de evento individual DEVE tipar seu
 * próprio `execute` com o parâmetro correto (veja os exemplos em
 * src/events/) — é ali que a segurança de tipos realmente importa,
 * não neste contrato genérico do carregador.
 */
export interface BotEvent {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void> | void;
}
