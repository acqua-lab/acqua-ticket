import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { addTopic, getSettings, getTicket, removeTopic, updateSettings } from '../services/repository.js';
import { requireStaff } from '../services/permissions.js';
import { card, panel, payload } from '../ui/components.js';
import { addParticipant, closeTicket, removeParticipant, sendTranscript, setPriority, transferTicket } from '../services/tickets.js';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Central de atendimento')
  .addSubcommand((subcommand) => subcommand.setName('setup').setDescription('Configura a equipe e os canais')
    .addRoleOption((option) => option.setName('equipe').setDescription('Cargo da equipe').setRequired(true))
    .addChannelOption((option) => option.setName('categoria').setDescription('Categoria dos tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .addChannelOption((option) => option.setName('logs').setDescription('Canal de logs').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand((subcommand) => subcommand.setName('assunto-adicionar').setDescription('Adiciona uma opção ao painel')
    .addStringOption((option) => option.setName('nome').setDescription('Nome visível').setRequired(true).setMaxLength(100))
    .addStringOption((option) => option.setName('descricao').setDescription('Explicação curta').setRequired(true).setMaxLength(100)))
  .addSubcommand((subcommand) => subcommand.setName('assunto-remover').setDescription('Remove uma opção do painel')
    .addStringOption((option) => option.setName('chave').setDescription('Chave informada em /ticket assuntos').setRequired(true)))
  .addSubcommand((subcommand) => subcommand.setName('assuntos').setDescription('Lista os assuntos configurados'))
  .addSubcommand((subcommand) => subcommand.setName('painel').setDescription('Publica o painel de abertura'))
  .addSubcommand((subcommand) => subcommand.setName('adicionar').setDescription('Adiciona alguém ao ticket')
    .addUserOption((option) => option.setName('usuario').setDescription('Pessoa a adicionar').setRequired(true)))
  .addSubcommand((subcommand) => subcommand.setName('remover').setDescription('Remove alguém do ticket')
    .addUserOption((option) => option.setName('usuario').setDescription('Pessoa a remover').setRequired(true)))
  .addSubcommand((subcommand) => subcommand.setName('transferir').setDescription('Transfere a responsabilidade')
    .addUserOption((option) => option.setName('equipe').setDescription('Novo responsável').setRequired(true)))
  .addSubcommand((subcommand) => subcommand.setName('prioridade').setDescription('Define a prioridade')
    .addStringOption((option) => option.setName('nivel').setDescription('Nível').setRequired(true).addChoices({ name: 'Baixa', value: 'baixa' }, { name: 'Normal', value: 'normal' }, { name: 'Alta', value: 'alta' }, { name: 'Crítica', value: 'critica' })))
  .addSubcommand((subcommand) => subcommand.setName('transcript').setDescription('Gera o transcript do ticket atual'))
  .addSubcommand((subcommand) => subcommand.setName('info').setDescription('Exibe os dados do ticket atual'))
  .addSubcommand((subcommand) => subcommand.setName('encerrar').setDescription('Encerra o ticket atual'))
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);

const administration = new Set(['setup', 'assunto-adicionar', 'assunto-remover', 'assuntos', 'painel']);

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  if (administration.has(subcommand) && !(await requireStaff(interaction))) return;
  if (subcommand === 'setup') return setup(interaction);
  if (subcommand === 'assunto-adicionar') return addSubject(interaction);
  if (subcommand === 'assunto-remover') return removeSubject(interaction);
  if (subcommand === 'assuntos') return listSubjects(interaction);
  if (subcommand === 'painel') return deployPanel(interaction);
  if (subcommand === 'adicionar') {
    if (!(await requireStaff(interaction))) return;
    return addParticipant(interaction, interaction.options.getUser('usuario', true));
  }
  if (subcommand === 'remover') {
    if (!(await requireStaff(interaction))) return;
    return removeParticipant(interaction, interaction.options.getUser('usuario', true));
  }
  if (subcommand === 'transferir') {
    if (!(await requireStaff(interaction))) return;
    return transferTicket(interaction, interaction.options.getUser('equipe', true));
  }
  if (subcommand === 'prioridade') {
    if (!(await requireStaff(interaction))) return;
    return setPriority(interaction, interaction.options.getString('nivel', true));
  }
  if (subcommand === 'transcript') {
    if (!(await requireStaff(interaction))) return;
    return sendTranscript(interaction);
  }
  if (subcommand === 'info') return showInfo(interaction);
  if (subcommand === 'encerrar') {
    if (!(await requireStaff(interaction))) return;
    return closeTicket(interaction);
  }
}

async function setup(interaction) {
  const settings = await updateSettings(interaction.guildId, {
    staffRoleId: interaction.options.getRole('equipe', true).id,
    categoryId: interaction.options.getChannel('categoria', true).id,
    logChannelId: interaction.options.getChannel('logs', true).id
  });
  await interaction.reply(payload(card('Central configurada', `**Equipe:** <@&${settings.staffRoleId}>\n**Categoria:** <#${settings.categoryId}>\n**Logs:** <#${settings.logChannelId}>`, 0x57f287), true));
}

async function addSubject(interaction) {
  const settings = await getSettings(interaction.guildId);
  if (settings.topics.length >= 25) return interaction.reply(payload(card('Limite alcançado', 'O Discord permite até 25 opções no seletor.', 0xed4245), true));
  const name = interaction.options.getString('nome', true);
  const topic = { key: crypto.randomUUID().slice(0, 8), name, description: interaction.options.getString('descricao', true) };
  await addTopic(interaction.guildId, topic);
  await interaction.reply(payload(card('Assunto criado', `**${name}** foi adicionado.\nChave: \`${topic.key}\``, 0x57f287), true));
}

async function removeSubject(interaction) {
  const key = interaction.options.getString('chave', true);
  const topics = await removeTopic(interaction.guildId, key);
  await interaction.reply(payload(card('Assunto atualizado', `Agora existem ${topics.length} assunto(s) no painel.`, 0x57f287), true));
}

async function listSubjects(interaction) {
  const settings = await getSettings(interaction.guildId);
  const body = settings.topics.length ? settings.topics.map((topic) => `**${topic.name}** · \`${topic.key}\`\n-# ${topic.description}`).join('\n\n') : 'Nenhum assunto configurado.';
  await interaction.reply(payload(card('Assuntos do painel', body), true));
}

async function deployPanel(interaction) {
  const settings = await getSettings(interaction.guildId);
  const message = await interaction.channel.send(payload(panel(settings.topics)));
  await updateSettings(interaction.guildId, { panelChannelId: interaction.channelId, panelMessageId: message.id });
  await interaction.reply(payload(card('Painel publicado', `O painel foi enviado em ${interaction.channel}.`, 0x57f287), true));
}

async function showInfo(interaction) {
  const ticket = await getTicket(interaction.guildId, interaction.channelId);
  if (!ticket) return interaction.reply(payload(card('Sem ticket', 'Este canal não é um ticket do Acqua.', 0xed4245), true));
  await interaction.reply(payload(card(`Ticket #${ticket.id}`, `**Cliente:** <@${ticket.userId}>\n**Assunto:** ${ticket.topicName}\n**Prioridade:** ${ticket.priority}\n**Responsável:** ${ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'não definido'}\n**Status:** ${ticket.status}`, 0x5865f2), true));
}
