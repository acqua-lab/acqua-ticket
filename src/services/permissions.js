import { PermissionFlagsBits } from 'discord.js';
import { getSettings } from './repository.js';

export async function isStaff(member) {
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
  const settings = await getSettings(member.guild.id);
  return Boolean(settings.staffRoleId && member.roles.cache.has(settings.staffRoleId));
}

export async function requireStaff(interaction) {
  if (await isStaff(interaction.member)) return true;
  await interaction.reply({ content: 'Você não tem permissão para esta ação.', ephemeral: true });
  return false;
}
