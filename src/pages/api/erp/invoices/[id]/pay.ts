import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const POST: APIRoute = async ({ request, params }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { box_id, amount, payment_method = 'cash', note } = await request.json();
  if (!box_id || !amount) return json({ error: 'box_id and amount required' }, 400);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [inv] } = await client.query('SELECT * FROM erp_invoices WHERE id=$1 FOR UPDATE', [params.id]);
    if (!inv) { await client.query('ROLLBACK'); return json({ error: 'Not found' }, 404); }
    if (inv.status === 'paid') { await client.query('ROLLBACK'); return json({ error: 'Already paid' }, 400); }
    await client.query(
      `INSERT INTO erp_cash_entries (box_id, direction, amount, ref, note, created_by)
       VALUES ($1,'in',$2,$3,$4,$5)`,
      [box_id, amount, inv.doc_number, note || `Payment for ${inv.doc_number}`, user.uid]
    );
    const { rows: [updated] } = await client.query(
      `UPDATE erp_invoices SET status='paid', paid_at=now(), payment_method=$1 WHERE id=$2 RETURNING *`,
      [payment_method, params.id]
    );
    await client.query('COMMIT');
    return json(updated);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
