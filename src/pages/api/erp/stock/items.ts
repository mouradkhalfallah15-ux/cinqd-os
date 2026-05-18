import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, sku, name, category, unit, qty_on_hand, qty_reserved, reorder_level, cost_per_unit, image_url, updated_at
     FROM erp_stock_items ORDER BY category, name`
  );
  return json(rows);
};

export const POST: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const { sku, name, category, unit, qty_on_hand = 0, reorder_level = 0, cost_per_unit = 0, image_url = null } = await request.json();
  if (!sku || !name) return json({ error: 'sku and name required' }, 400);
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO erp_stock_items (sku, name, category, unit, qty_on_hand, reorder_level, cost_per_unit, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [sku, name, category || 'raw', unit || 'L', qty_on_hand, reorder_level, cost_per_unit, image_url]
  );
  return json(rows[0], 201);
};
