import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { config, validateConfig } from '../src/config.js';
import { data } from '../src/commands/ticket.js';
import { data as botConfig } from '../src/commands/botconfig.js';

validateConfig();

const rest = new REST({ version: '10' }).setToken(config.token);
const route = config.guildId
  ? Routes.applicationGuildCommands(config.clientId, config.guildId)
  : Routes.applicationCommands(config.clientId);

await rest.put(route, { body: [data.toJSON(), botConfig.toJSON()] });
console.log(config.guildId ? 'Comandos publicados no servidor.' : 'Comandos globais publicados.');
