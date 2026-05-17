import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

// ── Load .env from repo root ──────────────────────────────────────────────────
try {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

import { GoogleGenerativeAI } from '@google/generative-ai';

const BOT_TOKEN       = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_KEY      = process.env.PUBLIC_GEMINI_API_KEY;
const ADMIN_CHAT_ID   = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const PORT            = Number(process.env.TG_PORT) || 3001;

if (!BOT_TOKEN)  { console.error('[tg-gateway] TELEGRAM_BOT_TOKEN missing'); process.exit(1); }
if (!GEMINI_KEY) { console.error('[tg-gateway] PUBLIC_GEMINI_API_KEY missing'); process.exit(1); }

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const SYSTEM_PROMPT = `You are CINQD's AI Factory & Operations Executive Officer.
Assist with: cleaning product manufacturing (Labsa N70, Javel, Détergent),
production batches, raw material stock, shift management, factory alerts, and
operations optimization. Be concise. Respond in French or Tunisian Derja.`;

const sessions = new Map(); // chatId → message history (last 20)

async function geminiReply(chatId, userText) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: SYSTEM_PROMPT,
  });
  const history = sessions.get(chatId) || [];
  const result  = await model.startChat({ history }).sendMessage(userText);
  const reply   = result.response.text();
  const updated = [
    ...history,
    { role: 'user',  parts: [{ text: userText }] },
    { role: 'model', parts: [{ text: reply }] },
  ];
  sessions.set(chatId, updated.slice(-20));
  return reply;
}

async function tgSend(chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
  return res.json();
}

// ── HTTP server (no express dep needed) ──────────────────────────────────────
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  let payload = {};
  try { payload = JSON.parse(body); } catch {}

  // Health check
  if (req.method === 'GET' && req.url === '/tg/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
  }

  // Telegram webhook
  if (req.method === 'POST' && req.url === '/tg/webhook') {
    res.writeHead(200); res.end('ok');
    const msg = payload?.message;
    if (!msg?.text || !msg.chat?.id) return;
    try {
      const reply = await geminiReply(String(msg.chat.id), msg.text);
      await tgSend(msg.chat.id, reply);
    } catch (e) {
      await tgSend(msg.chat.id, `⚠️ Erreur: ${e.message}`).catch(() => {});
    }
    return;
  }

  // Factory alert webhook (POST from internal systems → Telegram admin)
  if (req.method === 'POST' && req.url === '/tg/factory-alert') {
    res.writeHead(200); res.end('ok');
    if (!ADMIN_CHAT_ID) return;
    const { event, data, severity = 'INFO' } = payload;
    if (!event) return;
    const icon = severity === 'ERROR' ? '🚨' : severity === 'WARN' ? '⚠️' : '🏭';
    const text = `${icon} *Factory Alert — ${severity}*\n*Event:* \`${event}\`${
      data ? `\n\`\`\`\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n\`\`\`` : ''
    }`;
    await tgSend(ADMIN_CHAT_ID, text).catch(() => {});
    return;
  }

  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[tg-gateway] listening on 0.0.0.0:${PORT}`);
  console.log(`[tg-gateway] webhook → /tg/webhook`);
  console.log(`[tg-gateway] factory → /tg/factory-alert`);
  console.log(`[tg-gateway] health  → /tg/health`);
});
