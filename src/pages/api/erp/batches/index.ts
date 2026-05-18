import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT b.*, f.name as formula_name FROM erp_production_batches b LEFT JOIN erp_formulas f ON f.id=b.formula_id ORDER BY b.created_at DESC LIMIT 100`
  );
  return json(rows);
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { formula_id, qty_planned, notes } = await request.json();
  if (!formula_id || !qty_planned) return json({ error: 'formula_id and qty_planned required' }, 400);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [{ num }] } = await client.query(`SELECT next_doc_number('LOT') AS num`);
    const { rows: [formula] } = await client.query('SELECT * FROM erp_formulas WHERE id=$1', [formula_id]);
    if (!formula) { await client.query('ROLLBACK'); return json({ error: 'Formula not found' }, 404); }
    const { rows: [batch] } = await client.query(
      `INSERT INTO erp_production_batches (batch_number, formula_id, qty_planned, output_item_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [num, formula_id, qty_planned, formula.output_item_id, notes || null, user.uid]
    );
    await client.query('COMMIT');
    return json(batch, 201);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
