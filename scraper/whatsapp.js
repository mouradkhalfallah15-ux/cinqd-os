/**
 * CINQD WhatsApp Business Cloud API
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 * Handles: outbound notifications, order confirmations, campaign alerts
 */

const API_VER = 'v21.0';

function endpoint(phoneNumberId) {
  return `https://graph.facebook.com/${API_VER}/${phoneNumberId}/messages`;
}

async function waPost(body, { phoneNumberId, accessToken } = {}) {
  phoneNumberId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  accessToken   = accessToken   || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_SYSTEM_TOKEN;

  if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID not set');
  if (!accessToken)   throw new Error('WHATSAPP_ACCESS_TOKEN not set');

  const res  = await fetch(endpoint(phoneNumberId), {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body:   JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json;
}

// ── Send plain text message ───────────────────────────────────────────────────
export async function sendText(to, text, opts = {}) {
  return waPost({
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type:              'text',
    text: { preview_url: false, body: text },
  }, opts);
}

// ── Send template message ─────────────────────────────────────────────────────
export async function sendTemplate(to, templateName, languageCode = 'fr', components = [], opts = {}) {
  return waPost({
    messaging_product: 'whatsapp',
    to,
    type:     'template',
    template: { name: templateName, language: { code: languageCode }, components },
  }, opts);
}

// ── CINQD notification helpers ────────────────────────────────────────────────

export async function notifyOrderConfirmation(to, { orderId, product, amount, currency = 'TND' } = {}) {
  const text =
    `✅ *Commande confirmée — CINQD*\n\n` +
    `📦 Référence: ${orderId}\n` +
    `🧴 Produit: ${product}\n` +
    `💰 Montant: ${amount} ${currency}\n\n` +
    `Suivi: https://app.mkd-distrib.com/public`;
  return sendText(to, text);
}

export async function notifyCampaignAlert(to, { pageName, ageDays, spend, platform, snapshotUrl } = {}) {
  const text =
    `🚨 *Concurrent Actif Détecté — CINQD Spy*\n\n` +
    `📌 Page: ${pageName}\n` +
    `⏱ Actif depuis: ${ageDays} jours\n` +
    `📢 Plateforme: ${platform}\n` +
    `💸 Dépense estimée: ${spend}\n` +
    (snapshotUrl ? `🔗 ${snapshotUrl}` : '');
  return sendText(to, text);
}

export async function notifyFactoryAlert(to, { event, severity = 'INFO', data } = {}) {
  const icon = severity === 'ERROR' ? '🚨' : severity === 'WARN' ? '⚠️' : '🏭';
  const text =
    `${icon} *Factory Alert — ${severity}*\n\n` +
    `Événement: ${event}\n` +
    (data ? `Données: ${typeof data === 'string' ? data : JSON.stringify(data)}` : '');
  return sendText(to, text);
}

// ── Webhook verification (for receiving messages) ─────────────────────────────
export function verifyWebhook(req) {
  const mode      = req.query?.['hub.mode'];
  const token     = req.query?.['hub.verify_token'];
  const challenge = req.query?.['hub.challenge'];
  const expected  = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'cinqd_wa_verify';
  return mode === 'subscribe' && token === expected ? challenge : null;
}
