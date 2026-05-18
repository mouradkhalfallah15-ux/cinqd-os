import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { qty_produced } = await request.json();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [batch] } = await client.query(
      'SELECT * FROM erp_production_batches WHERE id=$1 FOR UPDATE', [params.id]
    );
    if (!batch) { await client.query('ROLLBACK'); return json({ error: 'Not found' }, 404); }
    if (batch.status !== 'in_progress' && batch.status !== 'draft') {
      await client.query('ROLLBACK');
      return json({ error: 'Batch cannot be completed from status ' + batch.status }, 400);
    }
    const { rows: formulaLines } = await client.query(
      'SELECT * FROM erp_formula_lines WHERE formula_id=$1', [batch.formula_id]
    );
    const { rows: [formula] } = await client.query('SELECT * FROM erp_formulas WHERE id=$1', [batch.formula_id]);
    const ratio = qty_produced / formula.output_qty;
    for (const fl of formulaLines) {
      const consumeQty = fl.qty * ratio;
      const { rows: [item] } = await client.query('SELECT * FROM erp_stock_items WHERE id=$1 FOR UPDATE', [fl.item_id]);
      if (!item || item.qty_on_hand < consumeQty) {
        await client.query('ROLLBACK');
        return json({ error: `Insufficient stock for ${item?.name || fl.item_id}: need ${consumeQty.toFixed(2)}` }, 400);
      }
      await client.query(
        'UPDATE erp_stock_items SET qty_on_hand=qty_on_hand-$1, updated_at=now() WHERE id=$2',
        [consumeQty, fl.item_id]
      );
      await client.query(
        `INSERT INTO erp_batch_consumptions (batch_id, item_id, qty_used) VALUES ($1,$2,$3)`,
        [batch.id, fl.item_id, consumeQty]
      );
      await client.query(
        `INSERT INTO erp_stock_movements (item_id, direction, qty, reason, ref, created_by)
         VALUES ($1,'out',$2,'manufacturing',$3,$4)`,
        [fl.item_id, consumeQty, batch.batch_number, user.uid]
      );
    }
    if (batch.output_item_id) {
      await client.query(
        'UPDATE erp_stock_items SET qty_on_hand=qty_on_hand+$1, updated_at=now() WHERE id=$2',
        [qty_produced, batch.output_item_id]
      );
      await client.query(
        `INSERT INTO erp_stock_movements (item_id, direction, qty, reason, ref, created_by)
         VALUES ($1,'in',$2,'manufacturing_output',$3,$4)`,
        [batch.output_item_id, qty_produced, batch.batch_number, user.uid]
      );
    }
    const { rows: [updated] } = await client.query(
      `UPDATE erp_production_batches SET status='completed', qty_produced=$1, completed_at=now() WHERE id=$2 RETURNING *`,
      [qty_produced, params.id]
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
