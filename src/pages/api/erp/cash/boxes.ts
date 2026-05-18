import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT b.*,
       COALESCE(SUM(CASE WHEN e.direction='in' THEN e.amount ELSE -e.amount END),0) as balance
     FROM erp_cash_boxes b LEFT JOIN erp_cash_entries e ON e.box_id=b.id
     GROUP BY b.id ORDER BY b.id`
  );
  return json(rows);
};
