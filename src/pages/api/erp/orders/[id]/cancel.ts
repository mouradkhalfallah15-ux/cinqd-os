import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [order] } = await client.query(
      'SELECT * FROM erp_orders WHERE id=$1 FOR UPDATE', [params.id]
    );
    if (!order) { await client.query('ROLLBACK'); return json({ error: 'Not found' }, 404); }
    if (!['draft','confirmed'].includes(order.status)) {
      await client.query('ROLLBACK');
      return json({ error: 'Cannot cancel order in status ' + order.status }, 400);
    }
    if (order.status === 'confirmed') {
      const { rows: lines } = await client.query('SELECT * FROM erp_order_lines WHERE order_id=$1', [params.id]);
      for (const line of lines) {
        if (!line.item_id) continue;
        await client.query(
          'UPDATE erp_stock_items SET qty_reserved=GREATEST(0,qty_reserved-$1), updated_at=now() WHERE id=$2',
          [line.qty, line.item_id]
        );
        await client.query(
          `INSERT INTO erp_stock_movements (item_id, direction, qty, reason, ref, created_by)
           VALUES ($1,'unreserved',$2,'order_cancel',$3,$4)`,
          [line.item_id, line.qty, order.doc_number, user.uid]
        );
      }
    }
    const { rows: [updated] } = await client.query(
      `UPDATE erp_orders SET status='cancelled' WHERE id=$1 RETURNING *`, [params.id]
    );
    await client.query('COMMIT');
    return json(updated);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
