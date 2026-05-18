import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, url }) => {
  if (!await requireAuth(request)) return unauth();
  const status = new URL(url).searchParams.get('status');
  const pool = getPool();
  const q = status
    ? `SELECT o.*, c.name as client_name FROM erp_orders o LEFT JOIN erp_clients c ON c.id=o.client_id WHERE o.status=$1 ORDER BY o.created_at DESC`
    : `SELECT o.*, c.name as client_name FROM erp_orders o LEFT JOIN erp_clients c ON c.id=o.client_id ORDER BY o.created_at DESC LIMIT 100`;
  const { rows } = await pool.query(q, status ? [status] : []);
  return json(rows);
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { client_id, lines, notes } = await request.json();
  if (!client_id || !lines?.length) return json({ error: 'client_id and lines required' }, 400);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [{ num }] } = await client.query(`SELECT next_doc_number('CMD') AS num`);
    let total = 0;
    for (const l of lines) total += Number(l.qty) * Number(l.unit_price);
    const { rows: [order] } = await client.query(
      `INSERT INTO erp_orders (doc_number, client_id, total_amount, notes, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [num, client_id, total, notes || null, user.uid]
    );
    for (const l of lines) {
      await client.query(
        `INSERT INTO erp_order_lines (order_id, item_id, qty, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, l.item_id, l.qty, l.unit_price, Number(l.qty) * Number(l.unit_price)]
      );
    }
    await client.query('COMMIT');
    return json(order, 201);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
