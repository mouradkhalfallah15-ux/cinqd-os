import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT d.*, c.name as client_name FROM erp_delivery_notes d LEFT JOIN erp_clients c ON c.id=d.client_id ORDER BY d.created_at DESC LIMIT 100`
  );
  return json(rows);
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { client_id, order_id, lines, notes } = await request.json();
  if (!client_id || !lines?.length) return json({ error: 'client_id and lines required' }, 400);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [{ num }] } = await client.query(`SELECT next_doc_number('BL') AS num`);
    const { rows: [dn] } = await client.query(
      `INSERT INTO erp_delivery_notes (doc_number, client_id, order_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [num, client_id, order_id || null, notes || null, user.uid]
    );
    for (const l of lines) {
      await client.query(
        `INSERT INTO erp_delivery_lines (delivery_id, item_id, qty_ordered, qty_delivered)
         VALUES ($1,$2,$3,$4)`,
        [dn.id, l.item_id, l.qty_ordered, l.qty_delivered || 0]
      );
    }
    await client.query('COMMIT');
    return json(dn, 201);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
