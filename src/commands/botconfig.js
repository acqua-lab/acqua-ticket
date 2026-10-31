import { ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getSettings, updateSettings } from '../services/repository.js';
import { card, payload } from '../ui/components.js';
import { applyPresence } from '../services/presence.js';

export const data = new SlashCommandBuilder()
  .setName('botconfig')
  .setDescription('Abre a central administrativa do Acqua Ticket')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Você não tem permissão para esta ação.', ephemeral: true });
  await interaction.reply(payload(await home(interaction.client, interaction.guildId), true));
}

export async function select(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Você não tem permissão para esta ação.', ephemeral: true });
  const action = interaction.values[0];
  if (action === 'identity') return interaction.update(payload(identity()));
  if (action === 'presence') return interaction.showModal(presenceModal(await getSettings(interaction.guildId)));
  if (action === 'rules') return interaction.showModal(rulesModal(await getSettings(interaction.guildId)));
  if (action === 'block') return interaction.showModal(blockModal());
}

export async function button(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Você não tem permissão para esta ação.', ephemeral: true });
  const action = interaction.customId.replace('botconfig:', '');
  if (action === 'home') return interaction.update(payload(await home(interaction.client, interaction.guildId)));
  if (action === 'name') return interaction.showModal(singleInput('name', 'Nome do bot', 'Nome visível', interaction.client.user.username, 32));
  if (action === 'avatar') return interaction.showModal(singleInput('avatar', 'Avatar do bot', 'URL da imagem', 'https://', 400));
  if (action === 'banner') return interaction.showModal(singleInput('banner', 'Banner do bot', 'URL da imagem ou remover', 'https://', 400));
}

export async function modal(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Você não tem permissão para esta ação.', ephemeral: true });
  const action = interaction.customId.replace('botconfig:', '');
  if (action === 'name') await interaction.client.user.setUsername(interaction.fields.getTextInputValue('value'));
  if (action === 'avatar') await interaction.client.user.setAvatar(interaction.fields.getTextInputValue('value'));
  if (action === 'banner') {
    const value = interaction.fields.getTextInputValue('value');
    await interaction.client.user.edit({ banner: value.toLowerCase() === 'remover' ? null : value });
  }
  if (action === 'presence') {
    const statuses = [1, 2, 3, 4].map((index) => parseStatus(interaction.fields.getTextInputValue(`status-${index}`)));
    await updateSettings(interaction.guildId, { statuses });
    await applyPresence(interaction.client, statuses);
  }
  if (action === 'rules') {
    const maximum = Number(interaction.fields.getTextInputValue('maximum'));
    const warning = Number(interaction.fields.getTextInputValue('warning'));
    const close = Number(interaction.fields.getTextInputValue('close'));
    if (![maximum, warning, close].every((value) => Number.isInteger(value) && value > 0) || close <= warning) return interaction.reply({ content: 'Use números positivos e um fechamento maior que o aviso.', ephemeral: true });
    await updateSettings(interaction.guildId, { maxOpenTickets: maximum, inactivityWarningMinutes: warning, autoCloseMinutes: close });
  }
  if (action === 'block') {
    const userId = interaction.fields.getTextInputValue('value').trim();
    const settings = await getSettings(interaction.guildId);
    const blockedUserIds = settings.blockedUserIds.includes(userId) ? settings.blockedUserIds.filter((id) => id !== userId) : [...settings.blockedUserIds, userId];
    await updateSettings(interaction.guildId, { blockedUserIds });
  }
  await interaction.reply(payload(card('Configuração salva', 'As alterações foram aplicadas.', 0x57f287), true));
}

async function home(client, guildId) {
  const settings = await getSettings(guildId);
  return card('Acqua Ticket', `**Identidade:** ${client.user.username}\n**Equipe:** ${settings.staffRoleId ? `<@&${settings.staffRoleId}>` : 'não configurada'}\n**Assuntos:** ${settings.topics.length}\n**Limite por usuário:** ${settings.maxOpenTickets}\n**Auto-close:** ${settings.autoCloseMinutes} min`).addActionRowComponents((row) => row.addComponents(
    new StringSelectMenuBuilder().setCustomId('botconfig:select').setPlaceholder('Gerenciar configuração').addOptions(
      { label: 'Identidade', description: 'Nome, avatar e banner', value: 'identity' },
      { label: 'Presença', description: 'Status rotativos do bot', value: 'presence' },
      { label: 'Regras', description: 'Limites e inatividade', value: 'rules' },
      { label: 'Bloqueios', description: 'Bloquear ou liberar usuário por ID', value: 'block' }
    )
  ));
}

function identity() {
  return card('Identidade do bot', 'Mudanças de identidade são globais para a aplicação e podem sofrer limite do Discord.').addActionRowComponents((row) => row.addComponents(
    new ButtonBuilder().setCustomId('botconfig:name').setLabel('Nome').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('botconfig:avatar').setLabel('Avatar').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('botconfig:banner').setLabel('Banner').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('botconfig:home').setLabel('Voltar').setStyle(ButtonStyle.Primary)
  ));
}

function singleInput(action, title, label, placeholder, maxLength) {
  return new ModalBuilder().setCustomId(`botconfig:${action}`).setTitle(title).addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('value').setLabel(label).setStyle(TextInputStyle.Short).setPlaceholder(placeholder).setMaxLength(maxLength).setRequired(true)
  ));
}

function presenceModal(settings) {
  const current = settings.statuses.length ? settings.statuses : [{ name: 'Atendimento ativo', type: ActivityType.Watching }];
  return new ModalBuilder().setCustomId('botconfig:presence').setTitle('Status rotativos').addComponents(...[1, 2, 3, 4].map((index) => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(`status-${index}`).setLabel(`Status ${index}: tipo:texto`).setStyle(TextInputStyle.Short).setValue(formatStatus(current[index - 1] ?? current[0])).setRequired(true)
  )));
}

function rulesModal(settings) {
  return new ModalBuilder().setCustomId('botconfig:rules').setTitle('Regras de atendimento').addComponents(
    input('maximum', 'Máximo de tickets abertos por usuário', settings.maxOpenTickets),
    input('warning', 'Aviso de inatividade em minutos', settings.inactivityWarningMinutes),
    input('close', 'Fechamento por inatividade em minutos', settings.autoCloseMinutes)
  );
}

function blockModal() {
  return singleInput('block', 'Bloqueios', 'ID do usuário para bloquear ou liberar', '000000000000000000', 20);
}

function input(id, label, value) {
  return new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setValue(String(value)).setRequired(true));
}

function parseStatus(value) {
  const [type, ...parts] = value.split(':');
  const types = { jogando: ActivityType.Playing, ouvindo: ActivityType.Listening, assistindo: ActivityType.Watching, competindo: ActivityType.Competing };
  return { type: types[type.trim().toLowerCase()] ?? ActivityType.Watching, name: parts.join(':').trim() || value };
}

function formatStatus(status) {
  const names = { [ActivityType.Playing]: 'jogando', [ActivityType.Listening]: 'ouvindo', [ActivityType.Watching]: 'assistindo', [ActivityType.Competing]: 'competindo' };
  return `${names[status.type] ?? 'assistindo'}:${status.name}`;
}
