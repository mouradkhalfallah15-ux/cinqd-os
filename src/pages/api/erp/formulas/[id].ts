import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const [{ rows: [formula] }, { rows: lines }] = await Promise.all([
    pool.query('SELECT * FROM erp_formulas WHERE id=$1', [params.id]),
    pool.query(`SELECT l.*, i.name as item_name, i.sku FROM erp_formula_lines l LEFT JOIN erp_stock_items i ON i.id=l.item_id WHERE l.formula_id=$1`, [params.id]),
  ]);
  if (!formula) return json({ error: 'Not found' }, 404);
  return json({ ...formula, lines });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const { name, description } = await request.json();
  const pool = getPool();
  const { rows } = await pool.query(
    'UPDATE erp_formulas SET name=$1, description=$2 WHERE id=$3 RETURNING *',
    [name, description || null, params.id]
  );
  return json(rows[0]);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  await pool.query('DELETE FROM erp_formulas WHERE id=$1', [params.id]);
  return json({ ok: true });
};
