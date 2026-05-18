import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const [{ rows: [inv] }, { rows: lines }] = await Promise.all([
    pool.query(`SELECT i.*, c.name as client_name FROM erp_invoices i LEFT JOIN erp_clients c ON c.id=i.client_id WHERE i.id=$1`, [params.id]),
    pool.query(`SELECT l.*, s.name as item_name FROM erp_invoice_lines l LEFT JOIN erp_stock_items s ON s.id=l.item_id WHERE l.invoice_id=$1`, [params.id]),
  ]);
  if (!inv) return json({ error: 'Not found' }, 404);
  return json({ ...inv, lines });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  if (!await requireAuth(request)) return unauth();
  const { due_date, notes } = await request.json();
  const pool = getPool();
  const { rows } = await pool.query(
    'UPDATE erp_invoices SET due_date=$1, notes=$2 WHERE id=$3 RETURNING *',
    [due_date || null, notes || null, params.id]
  );
  return json(rows[0]);
};
