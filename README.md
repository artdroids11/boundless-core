# Boundless Core 1.0

Bot oficial da **Boundless Pirates**, criado para administração do servidor e para os sistemas próprios da tripulação. A versão 1.0 substitui a antiga fundação da Fase 1 por uma base compilável, auditável, multi-servidor e preparada para hospedagem contínua.

## O que está pronto

- 16 slash commands carregados automaticamente;
- permissões centralizadas: Membro, Suporte, Moderador, Administrador e Dono;
- moderação com aviso, timeout, expulsão, banimento, desbanimento, histórico e revogação;
- proteção de alvo, hierarquia de cargos e checagem das permissões do próprio bot;
- logs de moderação, administração e sistema;
- XP com cooldown, bloqueio de mensagem repetida, níveis e recompensas por cargo;
- Prestígio com categorias, motivo, evidência, aprovação, antifarm, histórico e ranking;
- Hierarquia, Conselhos, Especializações e Profundidade como sistemas independentes;
- Divisões, Frotas Afiliadas, Conquistas, Registro da Frota e Expedições;
- auditoria administrativa;
- boas-vindas e cargo inicial;
- SQLite separado por servidor;
- endpoint `/health`, Docker, Docker Compose e configuração Railway;
- encerramento seguro em reinícios da hospedagem.

## Regra estrutural da Boundless

| Sistema | O que representa |
|---|---|
| Hierarquia | autoridade e responsabilidade |
| Conselho | responsabilidade administrativa |
| Especialização | conhecimento e área de atuação |
| Profundidade | domínio T1–T5 em uma área |
| Prestígio | feitos e contribuição reconhecida |
| XP | atividade no Discord |
| Divisão | operação interna da Boundless |
| Frota Afiliada | grupo com capitão, identidade e autonomia próprios |
| Conquista | momento marcante alcançado |
| Registro | história e memória oficial |

Nenhum desses sistemas substitui ou calcula automaticamente outro.

## Início rápido no Windows

1. Instale o Node.js 24 LTS.
2. Copie `.env.example` para `.env` e preencha token, Client ID e ID do servidor.
3. Abra o **Prompt de Comando** na pasta do projeto.
4. Execute:

```bat
npm.cmd install
npm.cmd run setup
npm.cmd start
```

O uso de `npm.cmd` evita o erro do PowerShell que bloqueia `npm.ps1`.

Depois, no Discord:

```text
/config cargo
/config canal
/config diagnostico
/status
```

## Documentação

- [GUIA-INSTALACAO.md](GUIA-INSTALACAO.md): criação da aplicação, permissões, `.env` e primeira execução.
- [GUIA-HOSPEDAGEM-24H.md](GUIA-HOSPEDAGEM-24H.md): Railway, VPS/Docker, banco persistente e backups.
- [COMANDOS-E-PERMISSOES.md](COMANDOS-E-PERMISSOES.md): todos os comandos e quem pode usá-los.

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` | desenvolvimento com reinício automático |
| `npm run typecheck` | verifica os tipos sem gerar build |
| `npm run build` | gera Prisma Client e compila TypeScript |
| `npm run db:setup` | cria ou sincroniza o SQLite |
| `npm run deploy-commands` | registra os slash commands |
| `npm run setup` | prepara banco, comandos e build |
| `npm start` | executa a versão compilada |

## Segurança

- O token só pode existir no `.env` local ou nas variáveis secretas da hospedagem.
- Nunca publique `.env`, `dev.db` ou `boundless.db` no GitHub.
- Não conceda `Administrador` ao bot; use apenas as permissões listadas no guia.
- O cargo do Boundless Core precisa ficar acima dos cargos que ele gerencia.
- Se o token aparecer em print, vídeo, repositório ou mensagem, redefina-o imediatamente no Developer Portal.

## Tecnologias

Node.js 24, TypeScript, discord.js 14, Prisma ORM 7, SQLite e Docker.
