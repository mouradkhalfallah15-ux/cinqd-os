import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT i.*, c.name as client_name FROM erp_invoices i LEFT JOIN erp_clients c ON c.id=i.client_id ORDER BY i.created_at DESC LIMIT 100`
  );
  return json(rows);
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireAuth(request);
  if (!user) return unauth();
  const { client_id, order_id, lines, due_date, notes } = await request.json();
  if (!client_id || !lines?.length) return json({ error: 'client_id and lines required' }, 400);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [{ num }] } = await client.query(`SELECT next_doc_number('FAC') AS num`);
    let subtotal = 0;
    for (const l of lines) subtotal += Number(l.qty) * Number(l.unit_price);
    const tax = subtotal * 0; // no tax by default
    const total = subtotal + tax;
    const { rows: [inv] } = await client.query(
      `INSERT INTO erp_invoices (doc_number, client_id, order_id, subtotal, tax_amount, total_amount, due_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [num, client_id, order_id || null, subtotal, tax, total, due_date || null, notes || null, user.uid]
    );
    for (const l of lines) {
      await client.query(
        `INSERT INTO erp_invoice_lines (invoice_id, item_id, description, qty, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [inv.id, l.item_id || null, l.description || null, l.qty, l.unit_price, Number(l.qty) * Number(l.unit_price)]
      );
    }
    await client.query('COMMIT');
    return json(inv, 201);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
