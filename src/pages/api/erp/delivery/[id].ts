import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const [{ rows: [dn] }, { rows: lines }] = await Promise.all([
    pool.query(`SELECT d.*, c.name as client_name FROM erp_delivery_notes d LEFT JOIN erp_clients c ON c.id=d.client_id WHERE d.id=$1`, [params.id]),
    pool.query(`SELECT l.*, i.name as item_name FROM erp_delivery_lines l LEFT JOIN erp_stock_items i ON i.id=l.item_id WHERE l.delivery_id=$1`, [params.id]),
  ]);
  if (!dn) return json({ error: 'Not found' }, 404);
  return json({ ...dn, lines });
};
