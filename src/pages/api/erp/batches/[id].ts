import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const [{ rows: [batch] }, { rows: consumptions }] = await Promise.all([
    pool.query(`SELECT b.*, f.name as formula_name FROM erp_production_batches b LEFT JOIN erp_formulas f ON f.id=b.formula_id WHERE b.id=$1`, [params.id]),
    pool.query(`SELECT c.*, i.name as item_name FROM erp_batch_consumptions c LEFT JOIN erp_stock_items i ON i.id=c.item_id WHERE c.batch_id=$1`, [params.id]),
  ]);
  if (!batch) return json({ error: 'Not found' }, 404);
  return json({ ...batch, consumptions });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const { qc_notes, qc_passed } = await request.json();
  const pool = getPool();
  const { rows } = await pool.query(
    'UPDATE erp_production_batches SET qc_notes=$1, qc_passed=$2 WHERE id=$3 RETURNING *',
    [qc_notes || null, qc_passed ?? null, params.id]
  );
  return json(rows[0]);
};
