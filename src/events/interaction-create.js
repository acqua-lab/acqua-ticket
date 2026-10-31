import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } from 'discord.js';
import { execute as ticketCommand } from '../commands/ticket.js';
import { requireStaff } from '../services/permissions.js';
import { addParticipant, claimTicket, closeTicket, openTicket, rateTicket, setPriority, transferTicket } from '../services/tickets.js';
import { card, payload } from '../ui/components.js';
import * as botConfig from '../commands/botconfig.js';

export async function onInteraction(interaction) {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') return ticketCommand(interaction);
    if (interaction.isChatInputCommand() && interaction.commandName === 'botconfig') return botConfig.execute(interaction);
    if (interaction.isStringSelectMenu() && interaction.customId === 'botconfig:select') return botConfig.select(interaction);
    if (interaction.isButton() && interaction.customId.startsWith('botconfig:')) return botConfig.button(interaction);
    if (interaction.isModalSubmit() && interaction.customId.startsWith('botconfig:')) return botConfig.modal(interaction);
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:open') return openTicket(interaction, interaction.values[0]);
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:priority') {
      if (!(await requireStaff(interaction))) return;
      return setPriority(interaction, interaction.values[0]);
    }
    if (interaction.isButton() && interaction.customId === 'ticket:claim') {
      if (!(await requireStaff(interaction))) return;
      return claimTicket(interaction);
    }
    if (interaction.isButton() && interaction.customId === 'ticket:close') {
      if (!(await requireStaff(interaction))) return;
      return closeTicket(interaction);
    }
    if (interaction.isButton() && interaction.customId === 'ticket:add') {
      if (!(await requireStaff(interaction))) return;
      return interaction.showModal(new ModalBuilder().setCustomId('ticket:add-modal').setTitle('Adicionar participante').addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('user-id').setLabel('ID do usuário').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(17).setMaxLength(20))
      ));
    }
    if (interaction.isButton() && interaction.customId === 'ticket:transfer') {
      if (!(await requireStaff(interaction))) return;
      const container = card('Transferir ticket', 'Selecione o novo responsável.').addActionRowComponents((row) => row.addComponents(
        new UserSelectMenuBuilder().setCustomId('ticket:transfer-select').setPlaceholder('Novo responsável').setMaxValues(1)
      ));
      return interaction.reply(payload(container, true));
    }
    if (interaction.isUserSelectMenu() && interaction.customId === 'ticket:transfer-select') {
      if (!(await requireStaff(interaction))) return;
      return transferTicket(interaction, await interaction.client.users.fetch(interaction.values[0]));
    }
    if (interaction.isModalSubmit() && interaction.customId === 'ticket:add-modal') {
      if (!(await requireStaff(interaction))) return;
      const user = await interaction.client.users.fetch(interaction.fields.getTextInputValue('user-id')).catch(() => null);
      if (!user) return interaction.reply({ content: 'Não encontrei esse usuário.', ephemeral: true });
      return addParticipant(interaction, user);
    }
    if (interaction.isButton() && interaction.customId.startsWith('ticket:rate:')) {
      const [, , guildId, channelId, score] = interaction.customId.split(':');
      return rateTicket(interaction, guildId, channelId, score);
    }
  } catch (error) {
    console.error(error);
    const response = { content: 'Ocorreu um erro ao processar esta ação.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(response).catch(() => undefined);
    else await interaction.reply(response).catch(() => undefined);
  }
}
