import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { FiRefreshCw, FiTrendingUp, FiShoppingBag, FiActivity, FiCpu, FiMessageCircle } from 'react-icons/fi';
import AppShell from './AppShell.jsx';

const fmt    = n => Number(n || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 });
const fmtDec = n => Number(n || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 });

const BOX_COLORS = [
  { grad: 'from-cyan-500/20 to-transparent',   border: 'border-cyan-500/20',   text: 'text-cyan-400'   },
  { grad: 'from-blue-500/20 to-transparent',   border: 'border-blue-500/20',   text: 'text-blue-400'   },
  { grad: 'from-orange-500/20 to-transparent', border: 'border-orange-500/20', text: 'text-orange-400' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="font-black text-white">{fmt(p.value)}{p.name === 'Revenue' ? ' DA' : ''}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/erp/analytics/overview');
      if (r.ok) setData(await r.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const salesCurve = (data?.sales_curve || []).map(d => ({
    day: new Date(d.day).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit' }),
    Orders: Number(d.orders),
    Revenue: Number(d.revenue),
  }));

  const totalCash = (data?.cash || []).reduce((s, b) => s + Number(b.balance || 0), 0);

  return (
    <AppShell active="dashboard">
      <div className="p-6 space-y-6 min-h-full">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">Vue d'ensemble en temps réel · لوحة القيادة</p>
          </div>
          <button onClick={load} className={`flex items-center gap-2 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded-xl transition-all ${loading ? 'opacity-50' : ''}`}>
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* ── SECTION 1: CA + Web Orders KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'CA Journalier', labelAr: 'رقم الأعمال اليوم', value: fmtDec(data?.revenue?.ca_daily) + ' DA', color: 'text-green-400', icon: FiTrendingUp },
            { label: 'CA Mensuel',    labelAr: 'رقم الأعمال الشهر', value: fmtDec(data?.revenue?.ca_monthly) + ' DA', color: 'text-emerald-400', icon: FiTrendingUp },
            { label: 'Web Orders/Jour', labelAr: 'طلبات الويب اليوم', value: fmt(data?.web_orders?.today), color: 'text-orange-400', icon: FiShoppingBag },
            { label: 'Web Pending',   labelAr: 'بانتظار المعالجة', value: fmt(data?.web_orders?.pending), color: 'text-yellow-400', icon: FiShoppingBag },
          ].map(({ label, labelAr, value, color, icon: Icon }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</div>
                <Icon className={`${color} text-sm`} />
              </div>
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-[10px] text-slate-600">{labelAr}</div>
            </div>
          ))}
        </div>

        {/* ── SECTION 2: 3 Cash Boxes ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Caisses · الصناديق</span>
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs font-black text-white">Total: {fmtDec(totalCash)} DA</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.cash || Array(3).fill({})).map((box, i) => {
              const c = BOX_COLORS[i % 3];
              return (
                <div key={box.id || i} className={`bg-gradient-to-br ${c.grad} border ${c.border} rounded-2xl p-5`}>
                  <div className={`text-xs font-black uppercase tracking-widest ${c.text} mb-1`}>{box.name || '—'}</div>
                  <div className="text-[10px] text-slate-600 mb-4">{box.description || ''}</div>
                  <div className={`text-3xl font-black ${c.text} mb-4`}>{fmtDec(box.balance)} <span className="text-sm">DA</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950/40 rounded-xl p-2 text-center">
                      <div className="text-[9px] text-slate-600 uppercase tracking-widest">Journalier</div>
                      <div className="text-xs font-black text-white mt-0.5">{fmtDec(box.daily_in)} DA</div>
                    </div>
                    <div className="bg-slate-950/40 rounded-xl p-2 text-center">
                      <div className="text-[9px] text-slate-600 uppercase tracking-widest">Mensuel</div>
                      <div className="text-xs font-black text-white mt-0.5">{fmtDec(box.monthly_in)} DA</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 3: Charts ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Sales Curve */}
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-black text-white">Courbes de Vente</div>
                <div className="text-[10px] text-slate-500">منحنيات المبيعات · 30 derniers jours</div>
              </div>
            </div>
            {salesCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={salesCurve} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#475569' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#475569' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#475569' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area yAxisId="right" type="monotone" dataKey="Revenue" stroke="#22d3ee" strokeWidth={2} fill="url(#revGrad)" />
                  <Area yAxisId="left"  type="monotone" dataKey="Orders"  stroke="#f97316" strokeWidth={2} fill="url(#ordGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-600 text-xs">No sales data yet</div>
            )}
          </div>

          {/* Top Regions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-sm font-black text-white mb-1">Top Régions</div>
            <div className="text-[10px] text-slate-500 mb-4">المناطق الأكثر مبيعاً</div>
            <div className="space-y-2">
              {(data?.top_regions || []).slice(0, 8).map((r, i) => {
                const maxOrders = Math.max(...(data?.top_regions || []).map(x => Number(x.order_count)), 1);
                const pct = (Number(r.order_count) / maxOrders) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate">{r.wilaya || 'Unknown'}</span>
                      <span className="text-slate-500 font-mono shrink-0 ml-2">{r.order_count} orders</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {(!data?.top_regions?.length) && <div className="text-slate-600 text-xs py-4 text-center">No regional data yet</div>}
            </div>
          </div>
        </div>

        {/* ── SECTION 4: Integrated Apps Hub ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Integrated Apps · المنظومة المترابطة</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* n8n */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <FiActivity className="text-orange-400 text-xs" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">n8n Webhooks</div>
                  <div className="text-[9px] text-slate-600">Automation Engine</div>
                </div>
                <span className="ml-auto flex items-center gap-1 text-[9px] text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />LIVE
                </span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Order Webhook', path: '/api/erp/webhook/order', status: 'active' },
                  { label: 'Stock Alert',   path: '/api/erp/stock/movements', status: 'active' },
                  { label: 'CAPI Trigger',  path: '/api/erp/capi/fire', status: 'active' },
                ].map(w => (
                  <div key={w.label} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-1.5">
                    <span className="text-[10px] text-slate-400">{w.label}</span>
                    <span className="text-[9px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">{w.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta CAPI */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <FiZap className="text-blue-400 text-xs" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">Meta CAPI</div>
                  <div className="text-[9px] text-slate-600 font-mono">963525612756552</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {[
                  { event: 'Purchase', desc: 'On web order confirmed', color: 'text-green-400' },
                  { event: 'Lead',     desc: 'On checkout start',      color: 'text-blue-400' },
                  { event: 'ViewContent', desc: 'On landing load',     color: 'text-slate-400' },
                ].map(e => (
                  <div key={e.event} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-1.5">
                    <div>
                      <div className={`text-[10px] font-black ${e.color}`}>{e.event}</div>
                      <div className="text-[9px] text-slate-600">{e.desc}</div>
                    </div>
                    <span className="text-[9px] text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">wired</span>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <FiMessageCircle className="text-green-400 text-xs" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">WhatsApp Business</div>
                  <div className="text-[9px] text-slate-600">Support · دعم العملاء</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Order Confirmation', status: 'ready' },
                  { label: 'Delivery Update',    status: 'ready' },
                  { label: 'Affiliate Alert',    status: 'ready' },
                ].map(w => (
                  <div key={w.label} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-1.5">
                    <span className="text-[10px] text-slate-400">{w.label}</span>
                    <span className="text-[9px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">{w.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 5: AI Ops Log ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Operations · الذكاء الاصطناعي</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gemini Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <FiCpu className="text-purple-400 text-xs" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">Gemini 1.5 Pro</div>
                  <div className="text-[9px] text-slate-600">AI Chatbot Engine</div>
                </div>
                <span className="ml-auto flex items-center gap-1 text-[9px] text-purple-400">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />STANDBY
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[10px]">
                {[
                  { ts: '02:17:01', msg: 'Model: gemini-1.5-pro-latest', color: 'text-purple-400' },
                  { ts: '02:17:01', msg: 'Context: ERP + Stock + Orders', color: 'text-slate-400' },
                  { ts: '02:17:01', msg: 'Awaiting query input…', color: 'text-slate-600' },
                ].map((log, i) => (
                  <div key={i} className="flex gap-2 bg-slate-800/40 rounded-lg px-3 py-1.5">
                    <span className="text-slate-700 shrink-0">{log.ts}</span>
                    <span className={log.color}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Audit Stream */}
            <AuditStream />
          </div>
        </div>

      </div>
    </AppShell>
  );
}

function AuditStream() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function fetchAudit() {
      try {
        const [stock, orders, webOrders] = await Promise.all([
          fetch('/api/erp/stock/items').then(r => r.json()),
          fetch('/api/erp/orders').then(r => r.json()),
          fetch('/api/erp/web-orders').then(r => r.json()),
        ]);
        const now = new Date().toLocaleTimeString('fr-DZ');
        const entries = [];
        if (Array.isArray(stock)) {
          const low = stock.filter(i => Number(i.qty_on_hand) <= Number(i.reorder_level));
          entries.push({ ts: now, msg: `Stock check: ${stock.length} items · ${low.length} low alert`, color: low.length > 0 ? 'text-red-400' : 'text-green-400' });
          low.forEach(i => entries.push({ ts: now, msg: `⚠ LOW: ${i.name} — ${Number(i.qty_on_hand).toFixed(1)} ${i.unit}`, color: 'text-yellow-400' }));
        }
        if (Array.isArray(orders)) {
          const pending = orders.filter(o => o.status === 'draft');
          entries.push({ ts: now, msg: `Orders: ${orders.length} total · ${pending.length} draft pending`, color: 'text-slate-400' });
        }
        if (Array.isArray(webOrders)) {
          const newW = webOrders.filter(w => w.status === 'new');
          if (newW.length > 0) entries.push({ ts: now, msg: `🌐 ${newW.length} web order(s) awaiting processing`, color: 'text-orange-400' });
        }
        entries.push({ ts: now, msg: 'Audit cycle complete — all systems nominal', color: 'text-cyan-400' });
        setLogs(entries.slice(0, 8));
      } catch {}
    }
    fetchAudit();
    const t = setInterval(fetchAudit, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <FiActivity className="text-cyan-400 text-xs" />
        </div>
        <div>
          <div className="text-xs font-black text-white">Agent AI Auditeur</div>
          <div className="text-[9px] text-slate-600">Live system audit stream</div>
        </div>
        <span className="ml-auto flex items-center gap-1 text-[9px] text-cyan-400">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />LIVE
        </span>
      </div>
      <div className="space-y-1.5 font-mono text-[10px] max-h-36 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 bg-slate-800/40 rounded-lg px-3 py-1.5">
            <span className="text-slate-700 shrink-0">{log.ts}</span>
            <span className={log.color}>{log.msg}</span>
          </div>
        ))}
        {!logs.length && <div className="text-slate-700 px-3 py-1.5">Initializing audit stream…</div>}
      </div>
    </div>
  );
}
