import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const [{ rows: [order] }, { rows: lines }] = await Promise.all([
    pool.query(`SELECT o.*, c.name as client_name FROM erp_orders o LEFT JOIN erp_clients c ON c.id=o.client_id WHERE o.id=$1`, [params.id]),
    pool.query(`SELECT l.*, i.name as item_name, i.sku FROM erp_order_lines l LEFT JOIN erp_stock_items i ON i.id=l.item_id WHERE l.order_id=$1`, [params.id]),
  ]);
  if (!order) return json({ error: 'Not found' }, 404);
  return json({ ...order, lines });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const { notes } = await request.json();
  const pool = getPool();
  const { rows } = await pool.query(
    'UPDATE erp_orders SET notes=$1 WHERE id=$2 RETURNING *',
    [notes, params.id]
  );
  return json(rows[0]);
};
