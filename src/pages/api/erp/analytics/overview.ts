import type { APIRoute } from 'astro';
import { requireAuth, unauth, json } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
  if (!await requireAuth(request)) return unauth();
  const pool = getPool();

  const [cash, revenue, webOrders, sales30, regions] = await Promise.all([
    // Cash boxes: daily IN + monthly IN + balance
    pool.query(`
      SELECT
        b.id, b.name, b.description,
        COALESCE(SUM(CASE WHEN e.direction='in' THEN e.amount ELSE -e.amount END),0) AS balance,
        COALESCE(SUM(CASE WHEN e.direction='in' AND e.created_at > now()-interval '24h' THEN e.amount ELSE 0 END),0) AS daily_in,
        COALESCE(SUM(CASE WHEN e.direction='in' AND e.created_at > now()-interval '30d' THEN e.amount ELSE 0 END),0) AS monthly_in
      FROM erp_cash_boxes b
      LEFT JOIN erp_cash_entries e ON e.box_id = b.id
      GROUP BY b.id, b.name, b.description ORDER BY b.id
    `),
    // CA: invoices paid
    pool.query(`
      SELECT
        COALESCE(SUM(total_amount) FILTER (WHERE paid_at > now()-interval '24h'),0) AS ca_daily,
        COALESCE(SUM(total_amount) FILTER (WHERE paid_at > now()-interval '30d'),0) AS ca_monthly,
        COALESCE(SUM(total_amount) FILTER (WHERE status='paid'),0) AS ca_total,
        COUNT(*) FILTER (WHERE status='pending') AS unpaid_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status='pending'),0) AS unpaid_amount
      FROM erp_invoices
    `),
    // Web orders: today + month
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at > now()-interval '24h') AS today,
        COUNT(*) FILTER (WHERE created_at > now()-interval '30d') AS month,
        COUNT(*) FILTER (WHERE status='new') AS pending,
        COALESCE(SUM(amount) FILTER (WHERE created_at > now()-interval '24h'),0) AS amount_today,
        COALESCE(SUM(amount) FILTER (WHERE created_at > now()-interval '30d'),0) AS amount_month
      FROM erp_web_orders
    `),
    // Sales last 30 days daily curve
    pool.query(`
      SELECT
        date_trunc('day', created_at AT TIME ZONE 'Africa/Algiers') AS day,
        COUNT(*) AS orders,
        COALESCE(SUM(amount),0) AS revenue
      FROM erp_web_orders
      WHERE created_at > now()-interval '30d'
      GROUP BY 1 ORDER BY 1
    `),
    // Top regions from web orders (wilaya from client address)
    pool.query(`
      SELECT
        SPLIT_PART(c.address, ' —', 1) AS wilaya,
        COUNT(*) AS order_count,
        COALESCE(SUM(w.amount),0) AS revenue
      FROM erp_web_orders w
      JOIN erp_clients c ON c.id = w.client_id
      WHERE c.address IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10
    `),
  ]);

  return json({
    cash: cash.rows,
    revenue: revenue.rows[0],
    web_orders: webOrders.rows[0],
    sales_curve: sales30.rows,
    top_regions: regions.rows,
  });
};
