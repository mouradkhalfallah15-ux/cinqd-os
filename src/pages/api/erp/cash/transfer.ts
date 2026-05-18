import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { from_box_id, to_box_id, amount, note } = await request.json();
  if (!from_box_id || !to_box_id || !amount || from_box_id === to_box_id) {
    return json({ error: 'from_box_id, to_box_id (different), amount required' }, 400);
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ref = `TRF-${Date.now()}`;
    await client.query(
      `INSERT INTO erp_cash_entries (box_id, direction, amount, ref, note, created_by) VALUES ($1,'out',$2,$3,$4,$5)`,
      [from_box_id, amount, ref, note || 'Transfer out', user.uid]
    );
    await client.query(
      `INSERT INTO erp_cash_entries (box_id, direction, amount, ref, note, created_by) VALUES ($1,'in',$2,$3,$4,$5)`,
      [to_box_id, amount, ref, note || 'Transfer in', user.uid]
    );
    await client.query('COMMIT');
    return json({ ok: true, ref });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
