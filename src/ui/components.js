import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder
} from 'discord.js';
import { config } from '../config.js';

export const componentFlags = MessageFlags.IsComponentsV2;

export function card(title, body, color = config.accentColor) {
  return new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${title}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
}

export function panel(topics) {
  const container = card('Central de atendimento', 'Selecione o assunto que melhor descreve o seu contato. Nossa equipe será avisada assim que o ticket for aberto.');
  if (topics.length) {
    container.addSeparatorComponents(new SeparatorBuilder()).addActionRowComponents((row) => row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ticket:open')
        .setPlaceholder('Como podemos ajudar?')
        .addOptions(topics.map((topic) => ({ label: topic.name, description: topic.description, value: topic.key })))
    ));
  } else {
    container.addSeparatorComponents(new SeparatorBuilder()).addTextDisplayComponents(new TextDisplayBuilder().setContent('-# A equipe ainda não configurou os assuntos de atendimento.'));
  }
  return container;
}

export function controls(ticket) {
  return new ContainerBuilder()
    .setAccentColor(config.accentColor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Ticket #${ticket.id}`))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Assunto:** ${ticket.topicName}\n**Criado por:** <@${ticket.userId}>\n**Prioridade:** ${ticket.priority ?? 'normal'}\n**Status:** aberto`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents((row) => row.addComponents(
      new ButtonBuilder().setCustomId('ticket:claim').setLabel('Assumir').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket:add').setLabel('Adicionar pessoa').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket:transfer').setLabel('Transferir').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket:close').setLabel('Encerrar').setStyle(ButtonStyle.Danger)
    ))
    .addActionRowComponents((row) => row.addComponents(
      new StringSelectMenuBuilder().setCustomId('ticket:priority').setPlaceholder('Alterar prioridade').addOptions([
        { label: 'Baixa', value: 'baixa' },
        { label: 'Normal', value: 'normal' },
        { label: 'Alta', value: 'alta' },
        { label: 'Crítica', value: 'critica' }
      ])
    ));
}

export function payload(container, ephemeral = false) {
  return { components: [container], flags: componentFlags, ephemeral };
}

export function rating(guildId, channelId) {
  return new ContainerBuilder()
    .setAccentColor(config.accentColor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Como foi o atendimento?'))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Escolha uma nota de 1 a 5 para nos ajudar a melhorar.'))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents((row) => row.addComponents(
      ...[1, 2, 3, 4, 5].map((score) => new ButtonBuilder().setCustomId(`ticket:rate:${guildId}:${channelId}:${score}`).setLabel(`${score}/5`).setStyle(ButtonStyle.Secondary))
    ));
}
