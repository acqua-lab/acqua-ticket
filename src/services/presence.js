import { ActivityType } from 'discord.js';

let timer;

export async function startPresence(client) {
  const guild = client.guilds.cache.first();
  const statuses = guild ? (await (await import('./repository.js')).getSettings(guild.id)).statuses : [];
  applyPresence(client, statuses);
}

export function applyPresence(client, statuses) {
  clearInterval(timer);
  const activities = statuses.length ? statuses : [{ name: 'Atendimento ativo', type: ActivityType.Watching }];
  let index = 0;
  const set = () => client.user.setPresence({ activities: [activities[index]], status: 'online' });
  set();
  timer = setInterval(() => {
    index = (index + 1) % activities.length;
    set();
  }, 30_000);
}
