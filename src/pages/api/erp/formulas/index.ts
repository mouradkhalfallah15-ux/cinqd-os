import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM erp_formulas ORDER BY name');
  return json(rows);
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { name, description, output_item_id, output_qty, output_unit, lines } = await request.json();
  if (!name || !output_item_id || !output_qty) return json({ error: 'name, output_item_id, output_qty required' }, 400);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [formula] } = await client.query(
      `INSERT INTO erp_formulas (name, description, output_item_id, output_qty, output_unit, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description || null, output_item_id, output_qty, output_unit || 'L', user.uid]
    );
    if (lines?.length) {
      for (const l of lines) {
        await client.query(
          `INSERT INTO erp_formula_lines (formula_id, item_id, qty, unit) VALUES ($1,$2,$3,$4)`,
          [formula.id, l.item_id, l.qty, l.unit || 'L']
        );
      }
    }
    await client.query('COMMIT');
    return json(formula, 201);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
