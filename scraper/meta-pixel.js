/**
 * CINQD Meta Pixel — Server-Side Conversions API
 * Sends events from the server directly to Meta (bypasses browser ITP/ad-blockers)
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { createHash } from 'crypto';

const API_VER  = 'v21.0';

const hash = v => v ? createHash('sha256').update(String(v).toLowerCase().trim()).digest('hex') : undefined;

// ── Send one or more events to Meta Pixel ─────────────────────────────────────
export async function sendPixelEvents(events, { pixelId, accessToken, testCode } = {}) {
  pixelId     = pixelId     || process.env.META_PIXEL_ID;
  accessToken = accessToken || process.env.META_PIXEL_ACCESS_TOKEN || process.env.META_SYSTEM_TOKEN;

  if (!pixelId)     throw new Error('META_PIXEL_ID not set');
  if (!accessToken) throw new Error('META_PIXEL_ACCESS_TOKEN not set');

  const url  = `https://graph.facebook.com/${API_VER}/${pixelId}/events`;
  const body = { data: events };
  if (testCode) body.test_event_code = testCode;

  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...body, access_token: accessToken }),
    signal:  AbortSignal.timeout(10000),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json; // { events_received, messages, fbtrace_id }
}

// ── Event builders ────────────────────────────────────────────────────────────
export function buildEvent(eventName, {
  eventId,
  eventTime,
  sourceUrl,
  ip,
  userAgent,
  email,
  phone,
  fbp,
  fbc,
  customData = {},
} = {}) {
  return {
    event_name:       eventName,
    event_time:       eventTime ?? Math.floor(Date.now() / 1000),
    event_id:         eventId   ?? `${eventName}-${Date.now()}`,
    event_source_url: sourceUrl,
    action_source:    sourceUrl ? 'website' : 'system_generated',
    user_data: {
      em:         email     ? [hash(email)]     : undefined,
      ph:         phone     ? [hash(phone)]      : undefined,
      client_ip_address:  ip,
      client_user_agent:  userAgent,
      fbp,
      fbc,
    },
    custom_data:      Object.keys(customData).length ? customData : undefined,
  };
}

// ── CINQD standard events ─────────────────────────────────────────────────────
export async function trackPageView(url, opts = {}) {
  return sendPixelEvents([buildEvent('PageView', { sourceUrl: url, ...opts })]);
}

export async function trackLead(opts = {}) {
  return sendPixelEvents([buildEvent('Lead', {
    sourceUrl: `https://app.mkd-distrib.com/public`,
    customData: { content_name: 'AI Customer Chat', currency: 'TND', ...opts.customData },
    ...opts,
  })]);
}

export async function trackPurchase({ value, currency = 'TND', orderId, ...opts } = {}) {
  return sendPixelEvents([buildEvent('Purchase', {
    sourceUrl: `https://app.mkd-distrib.com`,
    customData: { value, currency, order_id: orderId },
    ...opts,
  })]);
}

export async function trackViewContent({ contentId, contentName, category, value, ...opts } = {}) {
  return sendPixelEvents([buildEvent('ViewContent', {
    customData: { content_ids: [contentId], content_name: contentName, content_category: category, value, currency: 'TND' },
    ...opts,
  })]);
}
