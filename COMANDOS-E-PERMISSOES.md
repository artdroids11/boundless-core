# Comandos e permissões

## Níveis internos

| Nível | Origem |
|---|---|
| Dono | dono real do servidor Discord |
| Administrador | cargo configurado ou permissão nativa Administrador para a configuração inicial |
| Moderador | cargo configurado em `/config cargo` |
| Suporte | cargo configurado em `/config cargo` |
| Membro | qualquer membro do servidor |

O bot verifica esse nível antes de entrar na lógica do comando. Subcomandos sensíveis podem exigir um nível maior.

## Público e diagnóstico

| Comando | Nível | Função |
|---|---:|---|
| `/ping` | Membro | latência da API e WebSocket |
| `/status` | Membro | conexão, banco, tempo online e servidores |
| `/help` | Membro | lista apenas o que a pessoa pode usar |
| `/perfil` | Membro | XP, nível e PP apresentados separadamente |
| `/ranking` | Membro | ranking de XP ou PP |
| `b!ping` | Membro | compatibilidade com o prefixo legado |

## Configuração e auditoria

| Comando | Nível | Função |
|---|---:|---|
| `/config cargo` | Administrador | cargos de Admin, Moderador, Suporte ou membro inicial |
| `/config canal` | Administrador | logs e boas-vindas |
| `/config prefixo` | Administrador | altera o prefixo legado |
| `/config legado` | Administrador | ativa/desativa comandos por texto |
| `/config xp` | Administrador | estado, cooldown e faixa de XP |
| `/config limite-pp` | Administrador | limite de PP aprovado em 24 horas |
| `/config ver` | Administrador | configuração atual |
| `/config diagnostico` | Administrador | banco, cargos e permissões |
| `/auditoria` | Administrador | últimas alterações administrativas |

## Moderação

| Subcomando | Nível | Observação |
|---|---:|---|
| `/mod avisar` | Moderador | registra aviso e tenta avisar por DM |
| `/mod timeout` | Moderador | de 1 minuto a 28 dias |
| `/mod remover-timeout` | Moderador | encerra timeout e fecha os casos ativos |
| `/mod historico` | Moderador | últimos 10 casos do membro |
| `/mod caso` | Moderador | detalhes e evidência de um caso |
| `/mod expulsar` | Administrador | exige permissão Expulsar Membros |
| `/mod banir` | Administrador | exige permissão Banir Membros |
| `/mod desbanir` | Administrador | usa o ID numérico do usuário |
| `/mod revogar` | Administrador | preserva o histórico e marca o caso como revogado |

Proteções: ninguém age em si mesmo, no dono, em bots ou em alvo de cargo igual/superior. O cargo do Boundless Core também precisa estar acima do alvo.

## Prestígio

| Subcomando | Nível | Função |
|---|---:|---|
| `/prestigio perfil` | Membro | saldo, total conquistado e retirado |
| `/prestigio historico` | Membro | propostas, aprovações, rejeições e retiradas |
| `/prestigio ranking` | Membro | maiores saldos de PP |
| `/prestigio conceder` | Moderador | Moderador cria proposta; Admin concede diretamente |
| `/prestigio pendentes` | Moderador | fila aguardando validação |
| `/prestigio aprovar` | Administrador | exige validador diferente do proponente |
| `/prestigio rejeitar` | Administrador | registra a justificativa sem apagar |
| `/prestigio retirar` | Administrador | consequência registrada, sem saldo negativo |

Antifarm: máximo de 100 PP por operação, motivo mínimo, bloqueio de autofavorecimento, duplicidade em 24 horas, limite configurável por membro e dupla validação quando um Moderador propõe.

Categorias: Militar, Exploração, Naval, Logística, Relações, Comunidade e Conquista.

## Organização Boundless

### `/boundless`

| Grupo | Leitura | Alteração | Representa |
|---|---:|---:|---|
| `hierarquia` | Membro | Administrador | autoridade e responsabilidade |
| `conselho` | Membro | Administrador | responsabilidade administrativa |
| `especializacao` | Membro | Administrador | conhecimento e atuação |
| `profundidade` | Membro | Administrador | domínio T1–T5 por área |
| `resumo` | Membro | — | visão conjunta sem fundir os dados |

Conselhos disponíveis: Militar, Exploração, Naval, Logística e Relações.

### Divisões e Frotas Afiliadas

| Comando | Leitura | Alteração |
|---|---:|---:|
| `/divisao listar`, `/divisao ver` | Membro | — |
| `/divisao criar`, `adicionar`, `remover-membro`, `lider`, `excluir` | — | Administrador |
| `/frota listar` | Membro | — |
| `/frota registrar`, `status`, `remover` | — | Administrador |

Divisão é uma unidade operacional interna. Frota Afiliada mantém capitão, identidade e autonomia próprias.

### Conquistas e Registro

| Comando | Leitura | Alteração |
|---|---:|---:|
| `/conquista listar` | Membro | — |
| `/conquista registrar`, `remover` | — | Administrador |
| `/registro listar` | Membro | — |
| `/registro adicionar`, `remover` | — | Administrador |

Conquista é um feito marcante. Registro é a memória oficial e pode ser História, Decisão, Evento, Mudança ou Memória.

### Expedições

| Subcomando | Nível |
|---|---:|
| `listar`, `ver`, `participar`, `sair` | Membro |
| `criar`, `iniciar`, `concluir`, `cancelar` | Moderador |

Estados: Planejada, Ativa, Concluída e Cancelada.

## XP e recompensas

| Comando | Nível | Função |
|---|---:|---|
| `/recompensa listar` | Membro | cargos por nível |
| `/recompensa adicionar` | Administrador | define cargo abaixo do cargo do bot |
| `/recompensa remover` | Administrador | remove regra de recompensa |

O XP ignora comandos, mensagens muito curtas, repetição imediata e mensagens durante o cooldown configurado. Prestígio nunca é concedido automaticamente por XP.
