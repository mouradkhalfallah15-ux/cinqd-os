import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();
  const [orders, invoices, stock, cash, batches, webOrders] = await Promise.all([
    pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='confirmed') as confirmed, COUNT(*) FILTER (WHERE created_at > now()-interval '24h') as today FROM erp_orders`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status='pending') as unpaid, COALESCE(SUM(total_amount) FILTER (WHERE status='paid'),0) as revenue FROM erp_invoices`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE qty_on_hand <= reorder_level) as low_stock, COUNT(*) as total FROM erp_stock_items`),
    pool.query(`SELECT b.name, COALESCE(SUM(CASE WHEN e.direction='in' THEN e.amount ELSE -e.amount END),0) as balance FROM erp_cash_boxes b LEFT JOIN erp_cash_entries e ON e.box_id=b.id GROUP BY b.id, b.name ORDER BY b.id`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status='completed') as completed, COUNT(*) FILTER (WHERE status IN ('draft','in_progress')) as active FROM erp_production_batches`),
    pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='new') as pending, COALESCE(SUM(amount),0) as revenue FROM erp_web_orders`),
  ]);
  return json({
    orders: orders.rows[0],
    invoices: invoices.rows[0],
    stock: stock.rows[0],
    cash: cash.rows,
    batches: batches.rows[0],
    web_orders: webOrders.rows[0],
  });
};
