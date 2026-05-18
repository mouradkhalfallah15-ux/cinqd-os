import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM erp_clients ORDER BY name');
  return json(rows);
};

export const POST: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const { name, phone, email, address, type = 'b2c', affiliate_code } = await request.json();
  if (!name) return json({ error: 'name required' }, 400);
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO erp_clients (name, phone, email, address, type, affiliate_code)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, phone || null, email || null, address || null, type, affiliate_code || null]
  );
  return json(rows[0], 201);
};
