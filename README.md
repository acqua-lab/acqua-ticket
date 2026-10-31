# Acqua Ticket

Bot de tickets para Discord, inteiramente operado dentro do servidor. Não há dashboard nem banco externo: a configuração e os dados ficam no próprio projeto, separados por servidor.

## Recursos

- Comando `/ticket` com subcomandos para configuração e operação
- Painel elegante feito com Discord Components V2
- Vários assuntos de atendimento em um seletor
- Permissões privadas para cliente e equipe
- Assumir, transferir, prioridade e participantes por componentes
- Transcript automático no fechamento e sob demanda
- Avaliação por DM após o encerramento
- Logs de abertura, encerramento e avaliações
- Central `/botconfig` para identidade, presença, regras e bloqueios
- Aviso e encerramento automático por inatividade
- Persistência local, atômica e sem dependência de banco de dados

## Requisitos

- Node.js 20.19 ou superior
- Uma aplicação criada no [Discord Developer Portal](https://discord.com/developers/applications)
- O bot adicionado ao servidor com os escopos `bot` e `applications.commands`
- Permissões de Gerenciar Canais, Gerenciar Cargos, Ver Canal, Enviar Mensagens e Ler Histórico de Mensagens

No Developer Portal, habilite o **Guilds Intent** e o **Guild Messages Intent** em **Bot > Privileged Gateway Intents**. O segundo é necessário para o encerramento automático por inatividade.

## Instalação

Clone o repositório e instale as dependências:

```bash
npm install
```

Crie o arquivo de ambiente:

```powershell
Copy-Item .env.example .env
```

No Linux ou macOS:

```bash
cp .env.example .env
```

Preencha o arquivo `.env`:

```env
DISCORD_TOKEN=token_do_bot
DISCORD_CLIENT_ID=id_da_aplicacao
DISCORD_GUILD_ID=id_do_servidor_de_teste
```

`DISCORD_GUILD_ID` é opcional, mas recomendado durante o desenvolvimento: o comando aparece no servidor de teste imediatamente. Sem ele, o registro é global e pode levar até uma hora para aparecer.

Publique os comandos e inicie o bot:

```bash
npm run deploy
npm start
```

Para desenvolvimento com reinício automático:

```bash
npm run dev
```

## Configuração inicial

1. Execute `/ticket setup` e informe o cargo da equipe, a categoria e o canal de logs.
2. Crie as opções do seletor com `/ticket assunto-adicionar`.
3. Use `/ticket painel` no canal onde deseja disponibilizar a central.
4. Use `/botconfig` para ajustar presença, limites, inatividade e bloqueios.

O arquivo persistente é criado em `data/tickets.json`. Faça backup desse diretório em produção; ele já está ignorado pelo Git para não publicar dados do servidor.

## Comandos

| Comando | Uso |
| --- | --- |
| `/ticket setup` | Define equipe, categoria e logs |
| `/ticket assunto-adicionar` | Cria uma opção no painel |
| `/ticket assunto-remover` | Remove uma opção usando sua chave |
| `/ticket assuntos` | Exibe as opções e respectivas chaves |
| `/ticket painel` | Publica uma nova central de atendimento |
| `/ticket adicionar` | Inclui uma pessoa no ticket atual |
| `/ticket remover` | Revoga o acesso de uma pessoa |
| `/ticket transferir` | Define outro responsável |
| `/ticket prioridade` | Define baixa, normal, alta ou crítica |
| `/ticket transcript` | Gera um arquivo com o histórico |
| `/ticket info` | Mostra o estado do ticket atual |
| `/ticket encerrar` | Encerra o ticket atual |
| `/botconfig` | Central administrativa do bot |

## Central administrativa

`/botconfig` exige Administrador e mantém tudo dentro do Discord. Ela permite alterar nome, avatar e banner da aplicação, definir quatro status rotativos, ajustar o limite de tickets por pessoa, os tempos de aviso e fechamento por inatividade e bloquear ou liberar usuários pelo ID.

As alterações de nome, avatar e banner são globais para a aplicação e podem sofrer limites impostos pelo Discord.

## Estrutura

```text
src/
  commands/    comandos slash
  events/      roteamento de interações
  services/    tickets, permissões, presença e automações
  storage/     persistência local
  ui/          Components V2
scripts/       publicação de comandos
```

## Publicação

Para hospedar, configure as mesmas variáveis do `.env`, execute `npm ci`, `npm run deploy` uma vez e mantenha `npm start` em execução. O processo precisa de armazenamento persistente para preservar `data/tickets.json`.
