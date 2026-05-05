import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN required');

const bot = new Telegraf(token);
const REST_URL = process.env.REST_URL || 'http://localhost:1317';
const EXPLORER_URL = process.env.EXPLORER_URL || 'http://localhost:3001';

bot.command('start', async (ctx) => {
  await ctx.reply(
    '🌟 *Welcome to Tamizhi Chain Bot*\n\nI provide real-time updates from the Tamizhi blockchain — preserving Tamil cultural heritage on-chain.\n\nCommands:\n/stats — Chain statistics\n/block — Latest block\n/works — Recent literary works\n/nodes — Active service nodes\n/balance <address> — Check balance\n/tx <hash> — Look up transaction',
    { parse_mode: 'Markdown' }
  );
});

bot.command('stats', async (ctx) => {
  try {
    const res = await axios.get(`${EXPLORER_URL}/api/v1/stats`);
    const s = res.data;
    await ctx.reply(
      `⛓️ *Tamizhi Chain Stats*\n\n` +
      `📦 Latest Block: ${s.latest_block || 'N/A'}\n` +
      `📝 Total Txs: ${s.total_txs || 0}\n` +
      `🖥️ Active Nodes: ${s.total_nodes || 0}\n` +
      `🎁 Rewards Issued: ${s.total_rewards || 0}\n` +
      `📜 Literary Works: ${s.total_works || 0}\n` +
      `🔒 Access Logs: ${s.total_logs || 0}`,
      { parse_mode: 'Markdown' }
    );
  } catch {
    await ctx.reply('❌ Could not fetch stats. Chain may be unavailable.');
  }
});

bot.command('block', async (ctx) => {
  const res = await axios.get(`${REST_URL}/cosmos/base/tendermint/v1beta1/blocks/latest`);
  const b = res.data.block;
  await ctx.reply(
    `🧱 *Latest Block*\n\nHeight: ${b.header.height}\nTime: ${new Date(b.header.time).toUTCString()}\nTxs: ${b.data.txs?.length || 0}`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('works', async (ctx) => {
  const res = await axios.get(`${EXPLORER_URL}/api/v1/literature?limit=5`);
  const works = res.data.entries || [];
  let msg = '📜 *Recent Tamil Literary Works*\n\n';
  for (const w of works.slice(0, 5)) {
    msg += `*${w.title_english || w.work_id}*\nAuthor: ${w.author || 'Unknown'} | Type: ${w.work_type || 'N/A'}\n\n`;
  }
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('nodes', async (ctx) => {
  const res = await axios.get(`${REST_URL}/tamizhi/nodes/v1/nodes`);
  const nodes = res.data.nodes || [];
  let msg = `🖥️ *Active Service Nodes (${nodes.length})*\n\n`;
  for (const n of nodes.slice(0, 5)) {
    msg += `ID: \`${n.id?.slice(0, 16) || 'N/A'}...\`\nUptime: ${n.uptime_score || 0}% | Staked: ${parseInt(n.staked_amount?.amount || '0') / 1e9} TMZ\n\n`;
  }
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('balance', async (ctx) => {
  const args = ctx.message.text.split(' ');
  const address = args[1];
  if (!address) return ctx.reply('Usage: /balance <tamizhi1...address>');

  const res = await axios.get(`${REST_URL}/cosmos/bank/v1beta1/balances/${address}`);
  const balances = res.data.balances || [];
  const utmz = balances.find((b: any) => b.denom === 'utmz');
  const tmz = utmz ? (parseInt(utmz.amount) / 1_000_000).toFixed(6) : '0';

  await ctx.reply(`💰 *Balance*\n\nAddress: \`${address.slice(0, 20)}...\`\nTMZ: ${tmz} TMZ\nRaw: ${utmz?.amount || '0'} utmz`, { parse_mode: 'Markdown' });
});

bot.command('tx', async (ctx) => {
  const args = ctx.message.text.split(' ');
  const hash = args[1];
  if (!hash) return ctx.reply('Usage: /tx <hash>');

  const res = await axios.get(`${EXPLORER_URL}/api/v1/txs/${hash}`);
  const tx = res.data;
  const status = tx.code === 0 ? '✅' : '❌';
  await ctx.reply(`${status} *Transaction*\n\nHash: \`${hash.slice(0, 20)}...\`\nHeight: ${tx.height}\nSender: \`${tx.sender?.slice(0, 20) || 'N/A'}...\``, { parse_mode: 'Markdown' });
});

bot.launch();
console.log('Telegram bot started');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
