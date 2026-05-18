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
    const { rows: [dn] } = await client.query('SELECT * FROM erp_delivery_notes WHERE id=$1 FOR UPDATE', [params.id]);
    if (!dn) { await client.query('ROLLBACK'); return json({ error: 'Not found' }, 404); }
    if (dn.status !== 'draft') { await client.query('ROLLBACK'); return json({ error: 'Not in draft' }, 400); }
    const { rows: lines } = await client.query('SELECT * FROM erp_delivery_lines WHERE delivery_id=$1', [params.id]);
    for (const line of lines) {
      if (!line.item_id || !line.qty_delivered) continue;
      const { rows: [item] } = await client.query('SELECT * FROM erp_stock_items WHERE id=$1 FOR UPDATE', [line.item_id]);
      if (!item) continue;
      if (item.qty_on_hand < line.qty_delivered) {
        await client.query('ROLLBACK');
        return json({ error: `Insufficient stock for ${item.name}` }, 400);
      }
      await client.query(
        'UPDATE erp_stock_items SET qty_on_hand=qty_on_hand-$1, qty_reserved=GREATEST(0,qty_reserved-$1), updated_at=now() WHERE id=$2',
        [line.qty_delivered, line.item_id]
      );
      await client.query(
        `INSERT INTO erp_stock_movements (item_id, direction, qty, reason, ref, created_by)
         VALUES ($1,'out',$2,'delivery',$3,$4)`,
        [line.item_id, line.qty_delivered, dn.doc_number, user.uid]
      );
    }
    const { rows: [updated] } = await client.query(
      `UPDATE erp_delivery_notes SET status='dispatched', dispatched_at=now() WHERE id=$1 RETURNING *`, [params.id]
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
