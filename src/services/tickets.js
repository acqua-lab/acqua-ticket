import { AttachmentBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { countOpenByUser, createTicket, findOpenByUser, getSettings, getTicket, updateTicket } from './repository.js';
import { card, controls, payload, rating } from '../ui/components.js';

export async function openTicket(interaction, topicKey) {
  const settings = await getSettings(interaction.guildId);
  const topic = settings.topics.find((entry) => entry.key === topicKey);
  if (!topic) return interaction.reply(payload(card('Assunto indisponível', 'Esse assunto não existe mais. Atualize o painel.', 0xed4245), true));
  if (settings.blockedUserIds.includes(interaction.user.id)) return interaction.reply(payload(card('Acesso indisponível', 'Você não pode abrir tickets nesta central.', 0xed4245), true));
  const existing = await findOpenByUser(interaction.guildId, interaction.user.id);
  const openCount = await countOpenByUser(interaction.guildId, interaction.user.id);
  if (openCount >= settings.maxOpenTickets) return interaction.reply(payload(card('Limite de tickets atingido', existing ? `Continue em <#${existing.channelId}> antes de abrir outro.` : 'Você já atingiu seu limite de tickets abertos.', 0xfee75c), true));
  const channel = await interaction.guild.channels.create({
    name: `ticket-${String(Date.now()).slice(-5)}`,
    type: ChannelType.GuildText,
    parent: settings.categoryId || undefined,
    topic: `Ticket de ${interaction.user.id}`,
    permissionOverwrites: [
      { id: interaction.guildId, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...(settings.staffRoleId ? [{ id: settings.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : [])
    ]
  });
  const ticket = await createTicket(interaction.guildId, { channelId: channel.id, userId: interaction.user.id, topicKey, topicName: topic.name, priority: 'normal' });
  await channel.setName(`ticket-${ticket.id}`);
  await channel.send(payload(controls(ticket)));
  await interaction.reply(payload(card('Ticket criado', `Seu espaço de atendimento está pronto: ${channel}`, 0x57f287), true));
  await log(interaction.guild, settings, `Ticket #${ticket.id} aberto por ${interaction.user} em ${channel}.`);
}

export async function claimTicket(interaction) {
  const ticket = await getTicket(interaction.guildId, interaction.channelId);
  if (!ticket || ticket.status !== 'open') return interaction.reply(payload(card('Ticket indisponível', 'Este canal não possui um ticket aberto.', 0xed4245), true));
  if (ticket.claimedBy) return interaction.reply(payload(card('Já assumido', `Este ticket já pertence a <@${ticket.claimedBy}>.`, 0xfee75c), true));
  await updateTicket(interaction.guildId, interaction.channelId, { claimedBy: interaction.user.id, claimedAt: Date.now() });
  await interaction.reply(payload(card('Ticket assumido', `${interaction.user} agora é responsável por este atendimento.`, 0x57f287)));
}

export async function closeTicket(interaction) {
  const ticket = await getTicket(interaction.guildId, interaction.channelId);
  if (!ticket || ticket.status !== 'open') return interaction.reply(payload(card('Ticket indisponível', 'Este canal não possui um ticket aberto.', 0xed4245), true));
  const transcript = await createTranscript(interaction.channel, ticket);
  await updateTicket(interaction.guildId, interaction.channelId, { status: 'closed', closedBy: interaction.user.id, closedAt: Date.now() });
  await interaction.reply(payload(card('Atendimento encerrado', `Encerrado por ${interaction.user}. Este canal será removido em 10 segundos.`, 0xed4245)));
  const settings = await getSettings(interaction.guildId);
  await log(interaction.guild, settings, `Ticket #${ticket.id} encerrado por ${interaction.user}.`, transcript);
  await requestRating(interaction.client, ticket, interaction.guild.name, interaction.guildId, interaction.channelId);
  setTimeout(() => interaction.channel.delete('Ticket encerrado').catch(() => undefined), 10_000);
}

export async function setPriority(interaction, priority) {
  const ticket = await getTicket(interaction.guildId, interaction.channelId);
  if (!ticket || ticket.status !== 'open') return interaction.reply(payload(card('Ticket indisponível', 'Este canal não possui um ticket aberto.', 0xed4245), true));
  await updateTicket(interaction.guildId, interaction.channelId, { priority, priorityUpdatedBy: interaction.user.id });
  await interaction.reply(payload(card('Prioridade atualizada', `A prioridade agora é **${priority}**.`, 0x57f287)));
}

export async function transferTicket(interaction, user) {
  const ticket = await getTicket(interaction.guildId, interaction.channelId);
  if (!ticket || ticket.status !== 'open') return interaction.reply(payload(card('Ticket indisponível', 'Este canal não possui um ticket aberto.', 0xed4245), true));
  await updateTicket(interaction.guildId, interaction.channelId, { claimedBy: user.id, claimedAt: Date.now(), transferredBy: interaction.user.id });
  await interaction.reply(payload(card('Ticket transferido', `${user} agora é responsável por este atendimento.`, 0x57f287)));
}

export async function removeParticipant(interaction, user) {
  const ticket = await getTicket(interaction.guildId, interaction.channelId);
  if (!ticket || ticket.status !== 'open') return interaction.reply(payload(card('Ticket indisponível', 'Este canal não possui um ticket aberto.', 0xed4245), true));
  if (user.id === ticket.userId) return interaction.reply(payload(card('Ação bloqueada', 'Não é possível remover o criador do ticket.', 0xed4245), true));
  await interaction.channel.permissionOverwrites.delete(user.id);
  await interaction.reply(payload(card('Participante removido', `${user} não tem mais acesso a este atendimento.`, 0x57f287)));
}

export async function sendTranscript(interaction) {
  const ticket = await getTicket(interaction.guildId, interaction.channelId);
  if (!ticket) return interaction.reply(payload(card('Ticket indisponível', 'Este canal não possui um ticket registrado.', 0xed4245), true));
  await interaction.deferReply({ ephemeral: true });
  const file = await createTranscript(interaction.channel, ticket);
  await interaction.editReply({ ...payload(card('Transcript gerado', `Histórico do ticket #${ticket.id}.`), true), files: [file] });
}

export async function rateTicket(interaction, guildId, channelId, score) {
  const ticket = await getTicket(guildId, channelId);
  if (!ticket || ticket.userId !== interaction.user.id) return interaction.reply({ content: 'Esta avaliação não está disponível.', ephemeral: true });
  if (ticket.rating) return interaction.reply({ content: 'Você já avaliou este atendimento.', ephemeral: true });
  await updateTicket(guildId, channelId, { rating: Number(score), ratedAt: Date.now() });
  await interaction.reply({ content: `Obrigado pela avaliação: ${score}/5.`, ephemeral: true });
  const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
  if (guild) await log(guild, await getSettings(guildId), `Ticket #${ticket.id} recebeu avaliação ${score}/5 de <@${ticket.userId}>.`);
}

export async function addParticipant(interaction, user) {
  const ticket = await getTicket(interaction.guildId, interaction.channelId);
  if (!ticket || ticket.status !== 'open') return interaction.reply(payload(card('Ticket indisponível', 'Este canal não possui um ticket aberto.', 0xed4245), true));
  await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  await interaction.reply(payload(card('Participante adicionado', `${user} agora pode acompanhar este atendimento.`, 0x57f287)));
}

async function createTranscript(channel, ticket) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const lines = [...messages.values()].reverse().map((message) => `[${message.createdAt.toISOString()}] ${message.author.tag}\n${message.content || '[sem texto]'}${message.attachments.size ? `\nAnexos: ${[...message.attachments.values()].map((attachment) => attachment.url).join(', ')}` : ''}`);
  const output = [`ACQUA TICKET #${ticket.id}`, `Assunto: ${ticket.topicName}`, `Criado por: ${ticket.userId}`, '', ...lines].join('\n\n');
  return new AttachmentBuilder(Buffer.from(output, 'utf8'), { name: `acqua-ticket-${ticket.id}.txt` });
}

async function requestRating(client, ticket, guildName, guildId, channelId) {
  const user = await client.users.fetch(ticket.userId).catch(() => null);
  if (!user) return;
  await user.send(payload(rating(guildId, channelId))).catch(() => undefined);
}

async function log(guild, settings, content, transcript) {
  if (!settings.logChannelId) return;
  const channel = await guild.channels.fetch(settings.logChannelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ content, files: transcript ? [transcript] : [] });
}
