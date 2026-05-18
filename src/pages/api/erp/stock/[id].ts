import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM erp_stock_items WHERE id=$1', [params.id]);
  if (!rows[0]) return json({ error: 'Not found' }, 404);
  return json(rows[0]);
};

export const PATCH: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const body = await request.json();
  const allowed = ['name','category','unit','reorder_level','cost_per_unit','image_url'];
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  for (const k of allowed) {
    if (body[k] !== undefined) { sets.push(`${k}=$${idx++}`); vals.push(body[k]); }
  }
  if (!sets.length) return json({ error: 'No fields' }, 400);
  vals.push(params.id);
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE erp_stock_items SET ${sets.join(',')}, updated_at=now() WHERE id=$${idx} RETURNING *`,
    vals
  );
  if (!rows[0]) return json({ error: 'Not found' }, 404);
  return json(rows[0]);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  await pool.query('DELETE FROM erp_stock_items WHERE id=$1', [params.id]);
  return json({ ok: true });
};
