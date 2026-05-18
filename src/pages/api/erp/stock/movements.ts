import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, url }) => {
  if (!await requireAuth(request)) return unauth();
  const item_id = new URL(url).searchParams.get('item_id');
  const pool = getPool();
  const q = item_id
    ? `SELECT m.*, i.name as item_name FROM erp_stock_movements m JOIN erp_stock_items i ON i.id=m.item_id WHERE m.item_id=$1 ORDER BY m.created_at DESC LIMIT 100`
    : `SELECT m.*, i.name as item_name FROM erp_stock_movements m JOIN erp_stock_items i ON i.id=m.item_id ORDER BY m.created_at DESC LIMIT 200`;
  const { rows } = await pool.query(q, item_id ? [item_id] : []);
  return json(rows);
};
