import type { Collection } from "discord.js";
import type { SlashCommand, PrefixCommand } from "./command.js";

/**
 * Adiciona `commands` e `prefixCommands` ao tipo Client do discord.js.
 *
 * Sem isso, o TypeScript não saberia que `client.commands` existe (é
 * uma propriedade nossa, não algo nativo do discord.js) e precisaríamos
 * usar `as any` toda vez que fôssemos acessá-la — exatamente o tipo de
 * atalho perigoso que este projeto tenta evitar.
 */
declare module "discord.js" {
  interface Client {
    commands: Collection<string, SlashCommand>;
    prefixCommands: Collection<string, PrefixCommand>;
  }
}
