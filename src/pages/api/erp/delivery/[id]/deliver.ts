import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const pool = getPool();
  const { rows: [updated] } = await pool.query(
    `UPDATE erp_delivery_notes SET status='delivered', delivered_at=now() WHERE id=$1 AND status='dispatched' RETURNING *`,
    [params.id]
  );
  if (!updated) return json({ error: 'Not found or not dispatched' }, 400);
  return json(updated);
};
