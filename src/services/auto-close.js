import { getOpenTickets, getSettings, updateTicket } from './repository.js';
import { card, payload } from '../ui/components.js';

export function startAutoClose(client) {
  const check = () => Promise.all(client.guilds.cache.map((guild) => checkGuild(guild)));
  check();
  setInterval(check, 60_000);
}

async function checkGuild(guild) {
  const settings = await getSettings(guild.id);
  if (!settings.autoCloseEnabled) return;
  const now = Date.now();
  for (const ticket of await getOpenTickets(guild.id)) {
    const idleMinutes = Math.floor((now - (ticket.lastActivity ?? ticket.createdAt)) / 60_000);
    const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
    if (!channel) {
      await updateTicket(guild.id, ticket.channelId, { status: 'deleted', deletedAt: now });
      continue;
    }
    if (idleMinutes >= settings.autoCloseMinutes) {
      await updateTicket(guild.id, ticket.channelId, { status: 'closed', closedAt: now, closedBy: 'auto' });
      await channel.send(payload(card('Atendimento encerrado', 'Este ticket foi encerrado automaticamente por inatividade.', 0xed4245))).catch(() => undefined);
      setTimeout(() => channel.delete('Inatividade do ticket').catch(() => undefined), 10_000);
      continue;
    }
    if (idleMinutes >= settings.inactivityWarningMinutes && !ticket.inactivityWarned) {
      await channel.send(payload(card('Ticket inativo', `Sem novas mensagens há ${idleMinutes} minuto(s). O ticket será encerrado automaticamente se permanecer inativo.`, 0xfee75c))).catch(() => undefined);
      await updateTicket(guild.id, ticket.channelId, { inactivityWarned: true });
    }
  }
}
