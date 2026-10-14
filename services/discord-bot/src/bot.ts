import { Client, GatewayIntentBits, EmbedBuilder, TextChannel, SlashCommandBuilder, REST, Routes } from 'discord.js';
import axios from 'axios';

const REST_URL = process.env.REST_URL || 'http://localhost:1317';
const EXPLORER_URL = process.env.EXPLORER_URL || 'http://localhost:3001';
const WS_RELAY_URL = process.env.WS_RELAY_URL || 'ws://localhost:3002';
const FAUCET_AMOUNT = process.env.FAUCET_AMOUNT || '10000000'; // 10 TMZ
const FAUCET_COOLDOWN_HOURS = parseInt(process.env.FAUCET_COOLDOWN_HOURS || '24');
const FAUCET_FROM = process.env.FAUCET_FROM || 'faucet';
const CHAIN_ID = process.env.CHAIN_ID || 'tamizhi-testnet-1';
const ALERTS_CHANNEL_ID = process.env.ALERTS_CHANNEL_ID || '';
const DENOM = 'utmz';

// Faucet cooldown tracker (in production use Redis)
const faucetCooldowns = new Map<string, number>();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('faucet')
    .setDescription('Request testnet TMZ tokens')
    .addStringOption(opt =>
      opt.setName('address').setDescription('Your tamizhi1... address').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check TMZ balance for an address')
    .addStringOption(opt =>
      opt.setName('address').setDescription('tamizhi1... address').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('tx')
    .setDescription('Look up a transaction by hash')
    .addStringOption(opt =>
      opt.setName('hash').setDescription('Transaction hash').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show chain statistics'),
  new SlashCommandBuilder()
    .setName('works')
    .setDescription('Show recent Tamil literary works on chain'),
  new SlashCommandBuilder()
    .setName('nodes')
    .setDescription('Show active service nodes'),
  new SlashCommandBuilder()
    .setName('block')
    .setDescription('Show latest block info'),
];

client.on('ready', () => {
  console.log(`Discord bot ready: ${client.user?.tag}`);
  connectToWsRelay();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'faucet': await handleFaucet(interaction); break;
      case 'balance': await handleBalance(interaction); break;
      case 'tx': await handleTx(interaction); break;
      case 'stats': await handleStats(interaction); break;
      case 'works': await handleWorks(interaction); break;
      case 'nodes': await handleNodes(interaction); break;
      case 'block': await handleBlock(interaction); break;
    }
  } catch (err) {
    console.error('Command error:', err);
    await interaction.editReply('❌ An error occurred. Please try again.');
  }
});

async function handleFaucet(interaction: any) {
  await interaction.deferReply();
  const address = interaction.options.getString('address');
  const userId = interaction.user.id;

  // Validate address format
  if (!address.startsWith('tamizhi1') || address.length < 40) {
    return interaction.editReply('❌ Invalid address. Must start with `tamizhi1`');
  }

  // Check cooldown
  const lastRequest = faucetCooldowns.get(userId) || 0;
  const cooldownMs = FAUCET_COOLDOWN_HOURS * 3600 * 1000;
  const remaining = lastRequest + cooldownMs - Date.now();
  if (remaining > 0) {
    const hours = Math.ceil(remaining / 3600000);
    return interaction.editReply(`⏳ Cooldown active. Try again in ${hours}h`);
  }

  try {
    // Send tokens via chain CLI (in production: use pre-funded wallet + signing client)
    const result = await axios.post(`${REST_URL}/cosmos/tx/v1beta1/txs`, {
      // This would use a pre-built + pre-signed tx in production
      // For now: indicate the faucet request
    });

    faucetCooldowns.set(userId, Date.now());

    const embed = new EmbedBuilder()
      .setColor(0x00aa00)
      .setTitle('🚰 Faucet Request')
      .addFields(
        { name: 'Address', value: `\`${address}\`` },
        { name: 'Amount', value: `10 TMZ (10,000,000 utmz)` },
        { name: 'Next Request', value: `${FAUCET_COOLDOWN_HOURS}h` }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply('❌ Faucet request failed. Chain may be unavailable.');
  }
}

async function handleBalance(interaction: any) {
  await interaction.deferReply();
  const address = interaction.options.getString('address');

  const res = await axios.get(`${REST_URL}/cosmos/bank/v1beta1/balances/${address}`);
  const balances = res.data.balances || [];
  const utmz = balances.find((b: any) => b.denom === 'utmz');
  const tmz = utmz ? (parseInt(utmz.amount) / 1_000_000).toFixed(6) : '0';

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('💰 Balance')
    .addFields(
      { name: 'Address', value: `\`${address.slice(0, 20)}...${address.slice(-6)}\`` },
      { name: 'TMZ', value: `${tmz} TMZ` },
      { name: 'Raw', value: `${utmz?.amount || '0'} utmz` }
    );

  await interaction.editReply({ embeds: [embed] });
}

async function handleStats(interaction: any) {
  await interaction.deferReply();
  const res = await axios.get(`${EXPLORER_URL}/api/v1/stats`);
  const stats = res.data;

  const embed = new EmbedBuilder()
    .setColor(0xf5a623)
    .setTitle('⛓️ Tamizhi Chain Stats')
    .addFields(
      { name: 'Latest Block', value: stats.latest_block?.toString() || 'N/A', inline: true },
      { name: 'Total Txs', value: stats.total_txs?.toString() || '0', inline: true },
      { name: 'Active Nodes', value: stats.total_nodes?.toString() || '0', inline: true },
      { name: 'Rewards Issued', value: stats.total_rewards?.toString() || '0', inline: true },
      { name: 'Literary Works', value: stats.total_works?.toString() || '0', inline: true },
      { name: 'Access Logs', value: stats.total_logs?.toString() || '0', inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleWorks(interaction: any) {
  await interaction.deferReply();
  const res = await axios.get(`${EXPLORER_URL}/api/v1/literature?limit=5`);
  const works = res.data.entries || [];

  const embed = new EmbedBuilder()
    .setColor(0xc0392b)
    .setTitle('📜 Recent Tamil Literary Works');

  for (const work of works.slice(0, 5)) {
    embed.addFields({
      name: work.title_english || work.work_id,
      value: `Author: ${work.author || 'Unknown'} | Type: ${work.work_type || 'N/A'}`,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleTx(interaction: any) {
  await interaction.deferReply();
  const hash = interaction.options.getString('hash');
  const res = await axios.get(`${EXPLORER_URL}/api/v1/txs/${hash}`);
  const tx = res.data;

  const embed = new EmbedBuilder()
    .setColor(tx.code === 0 ? 0x00aa00 : 0xff0000)
    .setTitle(tx.code === 0 ? '✅ Transaction' : '❌ Transaction Failed')
    .addFields(
      { name: 'Hash', value: `\`${hash.slice(0, 16)}...\`` },
      { name: 'Height', value: tx.height?.toString() || 'N/A', inline: true },
      { name: 'Sender', value: tx.sender ? `\`${tx.sender.slice(0, 16)}...\`` : 'N/A', inline: true },
    );

  await interaction.editReply({ embeds: [embed] });
}

async function handleNodes(interaction: any) {
  await interaction.deferReply();
  const res = await axios.get(`${REST_URL}/tamizhi/nodes/v1/nodes`);
  const nodes = res.data.nodes || [];

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`🖥️ Active Service Nodes (${nodes.length})`);

  for (const node of nodes.slice(0, 5)) {
    embed.addFields({
      name: node.id || 'Unknown',
      value: `Uptime: ${node.uptime_score || 0}% | Staked: ${parseInt(node.staked_amount?.amount || '0') / 1e9} TMZ`,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleBlock(interaction: any) {
  await interaction.deferReply();
  const res = await axios.get(`${REST_URL}/cosmos/base/tendermint/v1beta1/blocks/latest`);
  const block = res.data.block;

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🧱 Latest Block')
    .addFields(
      { name: 'Height', value: block.header.height, inline: true },
      { name: 'Time', value: new Date(block.header.time).toUTCString(), inline: true },
      { name: 'Txs', value: (block.data.txs?.length || 0).toString(), inline: true },
    );

  await interaction.editReply({ embeds: [embed] });
}

// Connect to WebSocket relay and post alerts to Discord channel
function connectToWsRelay() {
  if (!ALERTS_CHANNEL_ID) return;

  const WebSocket = require('ws');
  const ws = new WebSocket(WS_RELAY_URL);

  ws.on('message', async (data: Buffer) => {
    try {
      const event = JSON.parse(data.toString());
      const channel = client.channels.cache.get(ALERTS_CHANNEL_ID) as TextChannel;
      if (!channel) return;

      if (event.type === 'node_jailed') {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🚨 Node Jailed')
          .addFields(
            { name: 'Node ID', value: event.data.nodeId || 'Unknown' },
            { name: 'Reason', value: event.data.reason || 'Low uptime score' },
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }

      if (event.type === 'threat_flagged') {
        const embed = new EmbedBuilder()
          .setColor(0xff6600)
          .setTitle('⚠️ Security Threat Flagged')
          .addFields(
            { name: 'Address', value: event.data.address || 'Unknown' },
            { name: 'Level', value: event.data.level || 'Unknown' },
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }

      if (event.type === 'work_submitted') {
        const embed = new EmbedBuilder()
          .setColor(0xc0392b)
          .setTitle('📜 New Tamil Work Submitted')
          .addFields(
            { name: 'Work ID', value: event.data.workId || 'Unknown' },
            { name: 'Author', value: event.data.author || 'Unknown' },
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('WS event error:', err);
    }
  });

  ws.on('close', () => setTimeout(connectToWsRelay, 5000));
}

// Register slash commands
async function registerCommands() {
  const token = process.env.DISCORD_TOKEN!;
  const clientId = process.env.DISCORD_CLIENT_ID!;
  const guildId = process.env.DISCORD_GUILD_ID;

  const rest = new REST().setToken(token);
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);

  await rest.put(route, { body: commands.map(c => c.toJSON()) });
  console.log('Slash commands registered');
}

// Main
const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('DISCORD_TOKEN required'); process.exit(1); }

registerCommands().then(() => client.login(token));
