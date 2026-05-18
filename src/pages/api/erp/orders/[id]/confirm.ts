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
    if (order.status !== 'draft') { await client.query('ROLLBACK'); return json({ error: 'Order not in draft' }, 400); }

    const { rows: lines } = await client.query(
      'SELECT * FROM erp_order_lines WHERE order_id=$1', [params.id]
    );
    for (const line of lines) {
      if (!line.item_id) continue;
      const { rows: [item] } = await client.query(
        'SELECT * FROM erp_stock_items WHERE id=$1 FOR UPDATE', [line.item_id]
      );
      if (!item) continue;
      const available = Number(item.qty_on_hand) - Number(item.qty_reserved);
      if (available < Number(line.qty)) {
        await client.query('ROLLBACK');
        return json({ error: `Insufficient stock for ${item.name}: need ${line.qty}, available ${available.toFixed(3)}` }, 400);
      }
      await client.query(
        'UPDATE erp_stock_items SET qty_reserved=qty_reserved+$1, updated_at=now() WHERE id=$2',
        [line.qty, line.item_id]
      );
      await client.query(
        `INSERT INTO erp_stock_movements (item_id, direction, qty, reason, ref, created_by)
         VALUES ($1,'reserved',$2,'order_confirm',$3,$4)`,
        [line.item_id, line.qty, order.doc_number, user.uid]
      );
    }
    const { rows: [updated] } = await client.query(
      `UPDATE erp_orders SET status='confirmed', confirmed_at=now() WHERE id=$1 RETURNING *`,
      [params.id]
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
