import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, url }) => {
  if (!await requireAuth(request)) return unauth();
  const box_id = new URL(url).searchParams.get('box_id');
  const pool = getPool();
  const q = box_id
    ? 'SELECT * FROM erp_cash_entries WHERE box_id=$1 ORDER BY created_at DESC LIMIT 100'
    : 'SELECT * FROM erp_cash_entries ORDER BY created_at DESC LIMIT 200';
  const { rows } = await pool.query(q, box_id ? [box_id] : []);
  return json(rows);
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { box_id, direction, amount, ref, note } = await request.json();
  if (!box_id || !direction || !amount) return json({ error: 'box_id, direction, amount required' }, 400);
  if (!['in','out'].includes(direction)) return json({ error: 'direction must be in or out' }, 400);
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO erp_cash_entries (box_id, direction, amount, ref, note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [box_id, direction, amount, ref || null, note || null, user.uid]
  );
  return json(rows[0], 201);
};
