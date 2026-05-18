import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const pool = getPool();
  const { rows: [updated] } = await pool.query(
    `UPDATE erp_production_batches SET status='cancelled' WHERE id=$1 AND status IN ('draft','in_progress') RETURNING *`,
    [params.id]
  );
  if (!updated) return json({ error: 'Not found or already completed' }, 400);
  return json(updated);
};
