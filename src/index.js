import { Client, Events, GatewayIntentBits } from 'discord.js';
import { validateConfig, config } from './config.js';
import { onInteraction } from './events/interaction-create.js';
import { startPresence } from './services/presence.js';
import { startAutoClose } from './services/auto-close.js';
import { getTicket, updateTicket } from './services/repository.js';

validateConfig();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Acqua Ticket conectado como ${readyClient.user.tag}`);
  startPresence(readyClient);
  startAutoClose(readyClient);
});

client.on(Events.InteractionCreate, onInteraction);
client.on(Events.MessageCreate, async (message) => {
  if (!message.guildId || message.author.bot) return;
  const ticket = await getTicket(message.guildId, message.channelId);
  if (ticket?.status === 'open') await updateTicket(message.guildId, message.channelId, { lastActivity: Date.now(), inactivityWarned: false });
});
client.login(config.token);
