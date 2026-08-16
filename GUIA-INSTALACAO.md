# Guia de instalação e configuração no Discord

## 1. O que precisa estar no computador

Obrigatório:

- Windows 10 ou 11 de 64 bits;
- Node.js 24 LTS, que já inclui o npm;
- acesso ao servidor Discord com **Gerenciar Servidor**;
- uma pasta para o Boundless Core.

Recomendado:

- Visual Studio Code para editar o `.env`;
- Git para enviar o projeto ao GitHub e facilitar a hospedagem;
- 1 GB de espaço livre durante a instalação.

Somente se `npm install` mostrar erro de `node-gyp` ou compilação nativa: instale o **Visual Studio Build Tools**, marcando “Desenvolvimento para desktop com C++”. Normalmente o `better-sqlite3` baixa um binário pronto e isso não é necessário.

Baixe o Node pela página oficial: <https://nodejs.org/en/download>.

## 2. Conferir o Node

Abra o **Prompt de Comando** (`cmd.exe`), entre na pasta do projeto e execute:

```bat
node --version
npm.cmd --version
```

O primeiro comando deve mostrar `v24` ou mais recente.

### Erro “npm.ps1 não pode ser carregado”

Esse é o erro de política do PowerShell que apareceu na instalação anterior. Não é um defeito no bot. Use uma destas formas:

1. abra o **Prompt de Comando**, não o PowerShell; ou
2. escreva `npm.cmd` e `npx.cmd` nos comandos.

Não é necessário desativar a segurança do Windows nem usar `Unrestricted`.

## 3. Criar a aplicação no Discord

1. Abra <https://discord.com/developers/applications>.
2. Clique em **New Application** e use o nome `Boundless Core`.
3. Em **General Information**, copie o **Application ID**. Ele será o `DISCORD_CLIENT_ID`.
4. Entre em **Bot**, escolha o nome e a imagem do bot.
5. Em **Token**, use **Reset Token** e copie o novo token. Ele será o `DISCORD_TOKEN`.
6. Em **Privileged Gateway Intents**, ative:
   - **Server Members Intent**;
   - **Message Content Intent**.

O primeiro é necessário para cargos, boas-vindas e informações de membros. O segundo é necessário para XP por mensagem e para o prefixo legado `b!`.

## 4. Convidar o bot com as permissões certas

Na página **Installation** ou em **OAuth2 → URL Generator**:

1. selecione os escopos `bot` e `applications.commands`;
2. marque as permissões:
   - View Channels;
   - Send Messages;
   - Embed Links;
   - Read Message History;
   - Manage Roles;
   - Moderate Members;
   - Kick Members;
   - Ban Members;
3. copie o link, abra-o e escolha o servidor da Boundless.

Não marque `Administrator`. O diagnóstico interno mostra exatamente o que estiver faltando.

No Discord, abra **Configurações do Servidor → Cargos** e arraste o cargo `Boundless Core` para cima dos cargos que o bot deverá atribuir ou moderar. O bot nunca consegue agir em alguém cujo cargo mais alto esteja igual ou acima do cargo dele.

## 5. Copiar os IDs

No Discord, abra **Configurações de Usuário → Avançado** e ative o **Modo Desenvolvedor**.

Depois clique com o botão direito no ícone do servidor e escolha **Copiar ID do Servidor**. Esse valor será o `DEV_GUILD_ID`.

## 6. Criar o arquivo `.env`

No Prompt de Comando, dentro da pasta do projeto:

```bat
copy .env.example .env
```

Abra `.env` no Bloco de Notas ou VS Code e preencha:

```env
DISCORD_TOKEN=COLE_O_TOKEN_AQUI
DISCORD_CLIENT_ID=COLE_O_APPLICATION_ID_AQUI
DEV_GUILD_ID=COLE_O_ID_DO_SERVIDOR_AQUI
DATABASE_URL="file:./prisma/dev.db"
DEFAULT_PREFIX=b!
PORT=3000
NODE_ENV=development
AUTO_DEPLOY_COMMANDS=false
```

Não coloque aspas no token nem espaços antes ou depois do `=`. Nunca envie esse arquivo para alguém e nunca faça upload dele no GitHub.

## 7. Instalar e preparar

Execute, nesta ordem:

```bat
npm.cmd install
npm.cmd run setup
```

O `setup` executa quatro tarefas:

1. gera o cliente do Prisma;
2. cria/sincroniza o banco SQLite;
3. registra os slash commands no servidor indicado;
4. compila o TypeScript.

## 8. Ligar o bot

Para teste com atualização automática:

```bat
npm.cmd run dev
```

Para a versão compilada:

```bat
npm.cmd start
```

O terminal deverá informar a quantidade de comandos e depois `Conectado como Boundless Core`.

## 9. Primeira configuração dentro do Discord

Crie três cargos de equipe: Administrador, Moderador e Suporte. Depois use:

```text
/config cargo tipo:Administrador cargo:@Administrador
/config cargo tipo:Moderador cargo:@Moderador
/config cargo tipo:Suporte cargo:@Suporte
```

Crie os canais de log e configure:

```text
/config canal tipo:Log de moderação canal:#logs-moderacao
/config canal tipo:Log administrativo canal:#logs-admin
/config canal tipo:Log de sistema canal:#logs-sistema
/config canal tipo:Boas-vindas canal:#boas-vindas
```

Finalize com:

```text
/config diagnostico
/config ver
/status
/ping
```

Todos os itens importantes do diagnóstico devem ficar com `✅`.

## 10. Ordem recomendada de configuração

1. cargos de permissão;
2. canais de log;
3. cargo inicial de membro, se desejado;
4. XP e recompensas;
5. Hierarquia e Conselhos;
6. Especializações e Profundidade;
7. Divisões, Frotas Afiliadas e Expedições;
8. Prestígio, depois de explicar as categorias à equipe.

## 11. Erros comuns

| Erro | Causa provável | Correção |
|---|---|---|
| `TokenInvalid` | token errado, antigo ou com espaços | gere outro token e atualize `.env` |
| comandos `/` não aparecem | comandos ainda não registrados | rode `npm.cmd run deploy-commands` |
| `Used disallowed intents` | intent ativado no código, mas desligado no portal | ative Members e Message Content |
| `Missing Permissions` | permissão ou posição de cargo insuficiente | rode `/config diagnostico` e reposicione o cargo |
| `npm.ps1 ... desabilitada` | PowerShell bloqueou o script | use `npm.cmd` ou o Prompt de Comando |
| `node-gyp` | faltou binário pronto ou ferramentas C++ | confirme Node LTS e instale Build Tools se o erro pedir |
| banco não abre | caminho sem permissão de escrita | mantenha o padrão local ou use `/data` com volume na hospedagem |

## 12. Atualizar o projeto

Depois de substituir os arquivos por uma versão nova:

```bat
npm.cmd install
npm.cmd run db:setup
npm.cmd run deploy-commands
npm.cmd run build
npm.cmd start
```

Antes de uma atualização importante, faça uma cópia de `prisma\dev.db` com o bot desligado.
