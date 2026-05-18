import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, url }) => {
  if (!await requireAuth(request)) return unauth();
  const status = new URL(url).searchParams.get('status');
  const pool = getPool();
  const q = status
    ? `SELECT w.*, c.name as client_name, c.phone as client_phone FROM erp_web_orders w LEFT JOIN erp_clients c ON c.id=w.client_id WHERE w.status=$1 ORDER BY w.created_at DESC LIMIT 200`
    : `SELECT w.*, c.name as client_name, c.phone as client_phone FROM erp_web_orders w LEFT JOIN erp_clients c ON c.id=w.client_id ORDER BY w.created_at DESC LIMIT 200`;
  const { rows } = await pool.query(q, status ? [status] : []);
  return json(rows);
};

export const PATCH: APIRoute = async ({ request, url }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const id = new URL(url).searchParams.get('id');
  const { status } = await request.json();
  if (!id || !status) return json({ error: 'id and status required' }, 400);
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE erp_web_orders SET status=$1 WHERE id=$2 RETURNING *`,
    [status, id]
  );
  if (!rows[0]) return json({ error: 'Not found' }, 404);
  return json(rows[0]);
};
