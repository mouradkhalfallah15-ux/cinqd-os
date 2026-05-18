import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';

export const POST: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const { event_name, value, currency = 'DZD', email, phone, order_id } = await request.json();
  if (!event_name) return json({ error: 'event_name required' }, 400);

  const pixelId = '963525612756552';
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return json({ error: 'META_ACCESS_TOKEN not configured' }, 500);

  const payload = {
    data: [{
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: {
        em: email ? [email] : undefined,
        ph: phone ? [phone] : undefined,
      },
      custom_data: {
        currency,
        value: value || 0,
        order_id: order_id || undefined,
      },
    }],
  };

  const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return json({ ok: res.ok, meta: data });
};
