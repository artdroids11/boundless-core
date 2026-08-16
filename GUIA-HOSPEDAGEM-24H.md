# Guia para manter o Boundless Core online 24 horas

## O que “24/7” realmente exige

Executar `npm start` no computador funciona apenas enquanto o computador estiver ligado, conectado à internet e sem suspender. Para presença contínua, use um serviço de hospedagem ou um VPS.

Para o Boundless Core, a hospedagem precisa oferecer:

- processo Node.js permanente;
- reinício automático em falhas;
- variáveis secretas;
- disco persistente para o SQLite;
- apenas uma réplica do bot.

Sem disco persistente, todos os PP, XP, punições, Divisões e registros podem desaparecer em um novo deploy.

## Opção recomendada: Railway com Docker

O projeto já possui `Dockerfile`, `railway.json`, endpoint `/health` e encerramento seguro.

### 1. Colocar no GitHub

Crie um repositório privado e envie a pasta do projeto. Confirme antes do envio:

- `.env` não aparece no repositório;
- `prisma/dev.db` não aparece;
- `node_modules` não aparece.

### 2. Criar o serviço

1. Entre no Railway e crie um projeto.
2. Escolha **Deploy from GitHub repo**.
3. Selecione o repositório do Boundless Core.
4. O Railway identificará o `Dockerfile`.

### 3. Adicionar variáveis

No serviço, abra **Variables** e adicione:

```env
DISCORD_TOKEN=seu_token
DISCORD_CLIENT_ID=seu_application_id
DEV_GUILD_ID=id_do_servidor_boundless
DATABASE_URL=file:/data/boundless.db
DEFAULT_PREFIX=b!
NODE_ENV=production
PORT=3000
AUTO_DEPLOY_COMMANDS=true
```

Deixe `AUTO_DEPLOY_COMMANDS=true` no primeiro deploy. Depois que os comandos aparecerem, ele pode voltar para `false`. Ao adicionar ou alterar slash commands no futuro, ative-o por um deploy e desative novamente.

### 4. Criar o volume persistente

1. Abra as configurações do serviço.
2. Entre em **Volumes**.
3. Crie um volume montado exatamente em `/data`.

Esse passo é obrigatório porque `DATABASE_URL` aponta para `/data/boundless.db`. Os volumes do Railway persistem entre deploys e reinícios: <https://docs.railway.com/volumes>.

### 5. Conferir o deploy

Nos logs, procure:

```text
16 slash command(s) carregado(s).
Conectado como Boundless Core...
Health check disponível na porta 3000.
```

No Discord, use `/status` e `/config diagnostico`.

### Regras importantes no Railway

- mantenha apenas **uma réplica**, porque o SQLite e o Gateway do Discord não devem ser duplicados nessa arquitetura;
- nunca coloque o token diretamente no repositório;
- não remova o volume sem antes obter uma cópia do banco;
- confira os limites e valores do plano atual antes de contratar. Se houver cobrança, faça isso com a participação de um responsável.

## Opção com mais controle: VPS e Docker Compose

Essa opção é boa quando já existe um servidor Linux.

Pré-requisitos no VPS:

- Docker Engine;
- plugin Docker Compose;
- Git;
- pelo menos 1 GB de RAM para uma operação confortável.

Depois de clonar o projeto:

```bash
cp .env.example .env
nano .env
docker compose up -d --build
docker compose logs -f boundless-core
```

O `docker-compose.yml` já configura:

- reinício `unless-stopped`;
- volume `boundless-data`;
- banco em `/data/boundless.db`;
- porta de saúde 3000.

Para atualizar:

```bash
git pull
docker compose up -d --build
```

Para parar e ligar:

```bash
docker compose stop
docker compose start
```

### Backup no VPS

Pare o bot para garantir uma cópia consistente:

```bash
docker compose stop
docker compose cp boundless-core:/data/boundless.db ./boundless-backup.db
docker compose start
```

Guarde o backup em outro local seguro. Para restaurar, pare o serviço, substitua o arquivo do volume e inicie novamente.

## Rodar 24 horas no próprio computador

É possível usar o Docker Compose da mesma forma:

```bat
docker compose up -d --build
```

Porém, o bot ficará offline quando o Windows atualizar, o computador desligar, entrar em suspensão, perder internet ou quando o Docker Desktop não iniciar. Use essa opção para testes ou enquanto a hospedagem não estiver pronta.

## Por que não usar Render gratuito para este bot

O Render informa que serviços web gratuitos entram em suspensão após 15 minutos sem tráfego de entrada e que o sistema de arquivos local gratuito é efêmero. Um bot do Discord precisa manter conexão contínua e o SQLite precisa sobreviver a reinícios, portanto essa combinação não atende ao objetivo 24/7. Referência: <https://render.com/docs/free>.

## Segurança e manutenção

- redefina o token imediatamente se ele for exposto;
- faça backup antes de atualizações importantes;
- acompanhe os logs quando o bot reiniciar;
- use `/status` para Discord, banco, latência e tempo online;
- use `/auditoria` para alterações administrativas;
- use `/config diagnostico` depois de mudar cargos ou permissões;
- não rode duas cópias do bot com o mesmo token e o mesmo SQLite.
