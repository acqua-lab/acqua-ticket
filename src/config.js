import 'dotenv/config';

const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];

export const config = Object.freeze({
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  accentColor: 0x5865f2
});

export function validateConfig() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Variáveis ausentes: ${missing.join(', ')}`);
}
