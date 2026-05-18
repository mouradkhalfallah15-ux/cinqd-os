import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { affiliate_id, amount, ref, note } = await request.json();
  if (!affiliate_id || !amount) return json({ error: 'affiliate_id and amount required' }, 400);
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO erp_affiliate_commissions (affiliate_id, amount, ref, note, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [affiliate_id, amount, ref || null, note || null, user.uid]
  );
  return json(rows[0], 201);
};

export const PATCH: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { commission_id, status } = await request.json();
  if (!commission_id || !status) return json({ error: 'commission_id and status required' }, 400);
  const pool = getPool();
  const { rows } = await pool.query(
    'UPDATE erp_affiliate_commissions SET status=$1 WHERE id=$2 RETURNING *',
    [status, commission_id]
  );
  return json(rows[0]);
};
