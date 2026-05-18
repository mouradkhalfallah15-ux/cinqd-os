import type { APIRoute } from 'astro';
import { json } from '@/lib/auth';
import { getPool } from '@/lib/db';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

async function fireCapi(order: Record<string, unknown>) {
  const pixelId = '963525612756552';
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          user_data: {
            em: order.email ? [order.email] : undefined,
            ph: order.phone ? [order.phone] : undefined,
          },
          custom_data: {
            currency: 'DZD',
            value: order.amount || 0,
            order_id: order.doc_number,
          },
        }],
      }),
    });
  } catch {}
}

export const POST: APIRoute = async ({ request }) => {
  const secret = request.headers.get('x-cinqd-secret') || '';
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { name, phone, email, address, product_name, qty = 1, amount = 0, affiliate_code } = body;
  if (!name || !phone) return json({ error: 'name and phone required' }, 400);

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let clientRow: Record<string, unknown>;
    const { rows: existing } = await client.query('SELECT * FROM erp_clients WHERE phone=$1 LIMIT 1', [phone]);
    if (existing[0]) {
      clientRow = existing[0];
    } else {
      const { rows: [c] } = await client.query(
        'INSERT INTO erp_clients (name, phone, email, address, type, affiliate_code) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [name, phone, email || null, address || null, 'b2c', affiliate_code || null]
      );
      clientRow = c;
    }

    const { rows: [{ num }] } = await client.query(`SELECT next_doc_number('WEB') AS num`);
    const { rows: [webOrder] } = await client.query(
      `INSERT INTO erp_web_orders (doc_number, client_id, product_name, qty, amount, affiliate_code, status)
       VALUES ($1,$2,$3,$4,$5,$6,'new') RETURNING *`,
      [num, clientRow.id, product_name || 'Web Order', qty, amount, affiliate_code || null]
    );

    if (affiliate_code) {
      const { rows: [aff] } = await client.query('SELECT * FROM erp_affiliates WHERE code=$1 AND active=true LIMIT 1', [affiliate_code]);
      if (aff) {
        const commission = Number(amount) * (Number(aff.rate_percent) / 100);
        await client.query(
          'INSERT INTO erp_affiliate_commissions (affiliate_id, amount, ref, note) VALUES ($1,$2,$3,$4)',
          [aff.id, commission, num, `Auto: web order ${num}`]
        );
      }
    }

    await client.query('COMMIT');
    Promise.resolve().then(() => fireCapi({ ...webOrder, email, phone }));
    return json({ ok: true, doc_number: num, client_id: clientRow.id }, 201);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
