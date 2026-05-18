import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { item_id, qty, note } = await request.json();
  if (!item_id || !qty || qty <= 0) return json({ error: 'item_id and positive qty required' }, 400);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'UPDATE erp_stock_items SET qty_on_hand=qty_on_hand+$1, updated_at=now() WHERE id=$2 RETURNING *',
      [qty, item_id]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return json({ error: 'Item not found' }, 404); }
    await client.query(
      `INSERT INTO erp_stock_movements (item_id, direction, qty, reason, ref, created_by)
       VALUES ($1,'in',$2,'restock',$3,$4)`,
      [item_id, qty, note || 'Manual restock', user.uid]
    );
    await client.query('COMMIT');
    return json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
