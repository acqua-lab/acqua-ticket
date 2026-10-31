import { guildRecord, read, transact } from '../storage/store.js';

export const defaultSettings = () => ({
  staffRoleId: null,
  categoryId: null,
  logChannelId: null,
  panelChannelId: null,
  panelMessageId: null,
  counter: 0,
  topics: [],
  maxOpenTickets: 1,
  inactivityWarningMinutes: 1440,
  autoCloseMinutes: 2880,
  autoCloseEnabled: true,
  blockedUserIds: [],
  statuses: []
});

export async function getSettings(guildId) {
  return read((data) => ({ ...defaultSettings(), ...(data.guilds[guildId]?.settings ?? {}) }));
}

export async function updateSettings(guildId, changes) {
  return transact((data) => {
    const guild = guildRecord(data, guildId);
    guild.settings = { ...defaultSettings(), ...guild.settings, ...changes };
    return guild.settings;
  });
}

export async function addTopic(guildId, topic) {
  return transact((data) => {
    const settings = guildRecord(data, guildId).settings;
    settings.topics ??= [];
    settings.topics.push(topic);
    return settings.topics;
  });
}

export async function removeTopic(guildId, key) {
  return transact((data) => {
    const settings = guildRecord(data, guildId).settings;
    settings.topics = (settings.topics ?? []).filter((topic) => topic.key !== key);
    return settings.topics;
  });
}

export async function createTicket(guildId, payload) {
  return transact((data) => {
    const guild = guildRecord(data, guildId);
    guild.settings.counter = (guild.settings.counter ?? 0) + 1;
    const ticket = { id: guild.settings.counter, status: 'open', createdAt: Date.now(), claimedBy: null, ...payload };
    guild.tickets[payload.channelId] = ticket;
    return ticket;
  });
}

export async function getTicket(guildId, channelId) {
  return read((data) => data.guilds[guildId]?.tickets[channelId] ?? null);
}

export async function findOpenByUser(guildId, userId) {
  return read((data) => Object.values(data.guilds[guildId]?.tickets ?? {}).find((ticket) => ticket.userId === userId && ticket.status === 'open') ?? null);
}

export async function countOpenByUser(guildId, userId) {
  return read((data) => Object.values(data.guilds[guildId]?.tickets ?? {}).filter((ticket) => ticket.userId === userId && ticket.status === 'open').length);
}

export async function getOpenTickets(guildId) {
  return read((data) => Object.values(data.guilds[guildId]?.tickets ?? {}).filter((ticket) => ticket.status === 'open'));
}

export async function updateTicket(guildId, channelId, changes) {
  return transact((data) => {
    const ticket = guildRecord(data, guildId).tickets[channelId];
    if (!ticket) return null;
    Object.assign(ticket, changes);
    return ticket;
  });
}

export async function listTicketsByUser(guildId, userId) {
  return read((data) => Object.values(data.guilds[guildId]?.tickets ?? {}).filter((ticket) => ticket.userId === userId));
}
