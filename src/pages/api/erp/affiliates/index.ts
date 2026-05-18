import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT a.*, COALESCE(SUM(c.amount),0) as total_commission_due
     FROM erp_affiliates a LEFT JOIN erp_affiliate_commissions c ON c.affiliate_id=a.id AND c.status='pending'
     GROUP BY a.id ORDER BY a.name`
  );
  return json(rows);
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { name, phone, email, code, rate_percent, type } = await request.json();
  if (!name || !code) return json({ error: 'name and code required' }, 400);
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO erp_affiliates (name, phone, email, code, rate_percent, type, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, phone || null, email || null, code, rate_percent || 10, type || 'affiliate', user.uid]
  );
  return json(rows[0], 201);
};
