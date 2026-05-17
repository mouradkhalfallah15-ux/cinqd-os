import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { createServer }  from 'http';

// ── Load .env ─────────────────────────────────────────────────────────────────
try {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

import { GoogleGenerativeAI }            from '@google/generative-ai';
import { sendText as waSend,
         notifyFactoryAlert as waFactory,
         notifyCampaignAlert as waCampaign,
         verifyWebhook }                 from '../scraper/whatsapp.js';
import { trackLead, trackPageView }      from '../scraper/meta-pixel.js';

const BOT_TOKEN     = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_KEY    = process.env.PUBLIC_GEMINI_API_KEY;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const ADMIN_WA_NUM  = process.env.ADMIN_WHATSAPP_NUMBER  || ''; // e.g. 21612345678
const PORT          = Number(process.env.TG_PORT) || 3001;

if (!BOT_TOKEN)  { console.error('[tg-gateway] TELEGRAM_BOT_TOKEN missing'); process.exit(1); }
if (!GEMINI_KEY) { console.error('[tg-gateway] PUBLIC_GEMINI_API_KEY missing'); process.exit(1); }

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const SYSTEM_PROMPT = `You are CINQD's AI Factory & Operations Executive Officer.
Assist with: cleaning product manufacturing (Labsa N70, Javel, Détergent),
production batches, raw material stock, shift management, factory alerts, and
operations optimization. Be concise. Respond in French or Tunisian Derja.`;

const sessions = new Map();

async function geminiReply(chatId, userText) {
  const model   = genAI.getGenerativeModel({ model: 'gemini-1.5-pro', systemInstruction: SYSTEM_PROMPT });
  const history = sessions.get(chatId) || [];
  const result  = await model.startChat({ history }).sendMessage(userText);
  const reply   = result.response.text();
  sessions.set(chatId, [...history,
    { role: 'user',  parts: [{ text: userText }] },
    { role: 'model', parts: [{ text: reply }] },
  ].slice(-20));
  return reply;
}

async function tgSend(chatId, text) {
  if (!chatId) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  }).catch(() => {});
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  let payload = {};
  try { payload = JSON.parse(body); } catch {}

  const url = new URL(req.url, 'http://localhost');

  // ── Health ────────────────────────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/tg/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true, ts: new Date().toISOString(),
      channels: {
        telegram: !!BOT_TOKEN,
        whatsapp: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
        pixel:    !!process.env.META_PIXEL_ID,
      },
    }));
  }

  // ── Telegram webhook ──────────────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/tg/webhook') {
    res.writeHead(200); res.end('ok');
    const msg = payload?.message;
    if (!msg?.text || !msg.chat?.id) return;
    // Fire pixel Lead event for each AI interaction
    trackLead({ ip: req.socket?.remoteAddress }).catch(() => {});
    try {
      const reply = await geminiReply(String(msg.chat.id), msg.text);
      await tgSend(msg.chat.id, reply);
    } catch (e) {
      await tgSend(msg.chat.id, `⚠️ Erreur: ${e.message}`).catch(() => {});
    }
    return;
  }

  // ── Factory alert → Telegram + WhatsApp ──────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/tg/factory-alert') {
    res.writeHead(200); res.end('ok');
    const { event, data, severity = 'INFO' } = payload;
    if (!event) return;
    const icon = severity === 'ERROR' ? '🚨' : severity === 'WARN' ? '⚠️' : '🏭';
    const tgText = `${icon} *Factory Alert — ${severity}*\n*Event:* \`${event}\`${
      data ? `\n\`\`\`\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n\`\`\`` : ''
    }`;
    await tgSend(ADMIN_CHAT_ID, tgText);
    if (ADMIN_WA_NUM) {
      await waFactory(ADMIN_WA_NUM, { event, severity, data }).catch(() => {});
    }
    return;
  }

  // ── Competitor / Scaling Ad alert → Telegram + WhatsApp ──────────────────
  if (req.method === 'POST' && url.pathname === '/tg/campaign-alert') {
    res.writeHead(200); res.end('ok');
    const { pageName, ageDays, spend, platform, snapshotUrl } = payload;
    const tgText =
      `🚨 *Scaling Ad Détecté*\n*Page:* ${pageName}\n*Durée:* ${ageDays}j\n` +
      `*Plateforme:* ${platform}\n*Dépense:* ${spend}` +
      (snapshotUrl ? `\n[Voir créatif](${snapshotUrl})` : '');
    await tgSend(ADMIN_CHAT_ID, tgText);
    if (ADMIN_WA_NUM) {
      await waCampaign(ADMIN_WA_NUM, payload).catch(() => {});
    }
    return;
  }

  // ── WhatsApp Business webhook (receive messages) ──────────────────────────
  if (req.method === 'GET' && url.pathname === '/wa/webhook') {
    const challenge = verifyWebhook({ query: Object.fromEntries(url.searchParams) });
    if (challenge) { res.writeHead(200); return res.end(challenge); }
    res.writeHead(403); return res.end('forbidden');
  }

  if (req.method === 'POST' && url.pathname === '/wa/webhook') {
    res.writeHead(200); res.end('ok');
    // Incoming WhatsApp message → Gemini reply
    const entry   = payload?.entry?.[0]?.changes?.[0]?.value;
    const waMsg   = entry?.messages?.[0];
    if (!waMsg?.text?.body || !waMsg.from) return;
    try {
      const reply = await geminiReply(`wa:${waMsg.from}`, waMsg.text.body);
      await waSend(waMsg.from, reply);
    } catch (e) {
      await waSend(waMsg.from, `⚠️ Erreur: ${e.message}`).catch(() => {});
    }
    return;
  }

  // ── Meta Pixel server-side event proxy ────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/meta/event') {
    res.writeHead(200); res.end('ok');
    const { eventName, sourceUrl, ...opts } = payload;
    if (!eventName) return;
    const { sendPixelEvents, buildEvent } = await import('../scraper/meta-pixel.js');
    sendPixelEvents([buildEvent(eventName, { sourceUrl, ...opts })]).catch(() => {});
    return;
  }

  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[tg-gateway] listening on 0.0.0.0:${PORT}`);
  console.log(`[tg-gateway] /tg/webhook        — Telegram → Gemini`);
  console.log(`[tg-gateway] /tg/factory-alert  — Factory → Telegram + WhatsApp`);
  console.log(`[tg-gateway] /tg/campaign-alert — Spy → Telegram + WhatsApp`);
  console.log(`[tg-gateway] /wa/webhook        — WhatsApp → Gemini`);
  console.log(`[tg-gateway] /meta/event        — Server-side Pixel events`);
  console.log(`[tg-gateway] /tg/health         — Status`);
});
