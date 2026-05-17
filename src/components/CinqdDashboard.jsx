import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebase';
import {
  collection, onSnapshot, query, orderBy, limit,
} from 'firebase/firestore';
import {
  FiActivity, FiAlertTriangle, FiBarChart2, FiBox,
  FiCheckCircle, FiCpu, FiLogOut, FiRefreshCw,
  FiShoppingCart, FiTarget, FiTrendingUp, FiZap,
} from 'react-icons/fi';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = n => typeof n === 'number' ? n.toLocaleString('fr-FR') : '—';

function relativeTime(ts) {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const LOW_STOCK_THRESHOLD = 20;

const EVENT_COLOR = {
  Purchase:        'text-green-400  bg-green-400/10  border-green-400/20',
  Lead:            'text-cyan-400   bg-cyan-400/10   border-cyan-400/20',
  InitiateCheckout:'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  AddToCart:       'text-blue-400   bg-blue-400/10   border-blue-400/20',
  ViewContent:     'text-purple-400 bg-purple-400/10 border-purple-400/20',
  PageView:        'text-slate-400  bg-slate-400/10  border-slate-400/20',
};
const eventColor = name => EVENT_COLOR[name] ?? 'text-slate-400 bg-slate-700/30 border-slate-600/20';

// ─── Stat Overview Card ──────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, sub, accent = 'text-cyan-400' }) => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors">
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{label}</span>
      <span className={`text-xl ${accent}`}>{icon}</span>
    </div>
    <p className="text-3xl font-black text-white leading-none">{value}</p>
    {sub && <p className="text-xs text-slate-500">{sub}</p>}
  </div>
);

// ─── Section Shell ───────────────────────────────────────────────────────────

const Section = ({ icon, title, badge, children }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
      <h2 className="flex items-center gap-2 text-white font-bold text-sm">
        <span className="text-cyan-400">{icon}</span>
        {title}
      </h2>
      {badge && (
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// ─── Module 1: Meta Pixel Monitor ───────────────────────────────────────────

const MetaPixelMonitor = ({ data, loading, error }) => {
  if (loading) return <Spinner label="Fetching Meta events…" />;
  if (error)   return <ErrorBox msg={error} />;
  if (!data)   return null;

  const { pixel, summary, recent } = data;
  const breakdown = Object.entries(summary.eventBreakdown ?? {})
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      {/* Pixel Status */}
      <div className="flex items-center gap-3 text-sm">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pixel.unavailable ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
        <span className="text-slate-300 font-semibold">{pixel.name}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500 font-mono text-xs">{pixel.id}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">Last fired {relativeTime(pixel.lastFired)}</span>
      </div>

      {/* Event Breakdown */}
      {breakdown.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {breakdown.map(([name, count]) => (
            <div
              key={name}
              className={`border rounded-xl p-3 flex flex-col gap-1 ${eventColor(name)}`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{name}</span>
              <span className="text-2xl font-black">{fmt(count)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-sm">No events fired in the last 24 h.</p>
      )}

      {/* Recent Event Feed */}
      {recent?.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Recent Events</p>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {recent.map((ev, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className={`px-2 py-0.5 rounded-full border font-semibold ${eventColor(ev.name)}`}>
                  {ev.name}
                </span>
                <span className="text-slate-600 font-mono">{relativeTime(ev.time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Module 2: Campaign Performance & Leads ─────────────────────────────────

const CampaignLeads = ({ orders }) => {
  const today = new Date().toDateString();

  const todayOrders = orders.filter(o => {
    const d = o.createdAt?.toDate?.();
    return d && d.toDateString() === today;
  });

  const totalRevenue = todayOrders.reduce((s, o) => s + (o.totalAmount ?? o.amount ?? 0), 0);
  const pending   = orders.filter(o => o.status === 'PENDING').length;
  const confirmed = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PAID').length;

  const STATUS_STYLE = {
    PENDING:   'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    CONFIRMED: 'bg-green-400/10  text-green-400  border-green-400/20',
    PAID:      'bg-green-400/10  text-green-400  border-green-400/20',
    CANCELLED: 'bg-red-400/10   text-red-400    border-red-400/20',
  };

  return (
    <div className="space-y-5">
      {/* Mini-metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today's Orders", val: todayOrders.length, color: 'text-cyan-400' },
          { label: 'Pending',        val: pending,             color: 'text-yellow-400' },
          { label: 'Confirmed',      val: confirmed,           color: 'text-green-400'  },
        ].map(m => (
          <div key={m.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
            <p className={`text-2xl font-black ${m.color}`}>{m.val}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {totalRevenue > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <FiTrendingUp className="text-green-400" />
          Today's Revenue: <span className="text-white font-bold">{fmt(totalRevenue)} TND</span>
        </div>
      )}

      {/* Orders table */}
      {orders.length === 0 ? (
        <p className="text-slate-500 text-sm">No orders recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-600 uppercase text-[10px] font-black tracking-widest border-b border-slate-800">
                <th className="pb-2 pr-4">Client</th>
                <th className="pb-2 pr-4">Phone</th>
                <th className="pb-2 pr-4">Amount</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 12).map(o => (
                <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 pr-4 text-white font-medium truncate max-w-[120px]">{o.clientName ?? o.name ?? '—'}</td>
                  <td className="py-2 pr-4 font-mono text-slate-400">{o.clientPhone ?? o.phone ?? '—'}</td>
                  <td className="py-2 pr-4 text-cyan-400 font-bold">{fmt(o.totalAmount ?? o.amount)} TND</td>
                  <td className="py-2 pr-4">
                    <span className={`border rounded-full px-2 py-0.5 font-semibold text-[10px] ${STATUS_STYLE[o.status] ?? 'bg-slate-700/30 text-slate-400 border-slate-600/30'}`}>
                      {o.status ?? '—'}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500">
                    {o.createdAt?.toDate?.()?.toLocaleDateString('fr-TN') ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Module 3: Inventory / Stock ────────────────────────────────────────────

const InventoryModule = ({ materials }) => {
  const low  = materials.filter(m => (m.currentQuantity ?? m.quantity ?? 0) < LOW_STOCK_THRESHOLD);
  const totalItems = materials.length;

  return (
    <div className="space-y-5">
      {/* Header metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total SKUs',    val: totalItems,    color: 'text-cyan-400'   },
          { label: 'Low Stock',     val: low.length,    color: low.length ? 'text-red-400' : 'text-green-400' },
          { label: 'OK',            val: totalItems - low.length, color: 'text-green-400' },
        ].map(m => (
          <div key={m.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
            <p className={`text-2xl font-black ${m.color}`}>{m.val}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Low stock alerts */}
      {low.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
            <FiAlertTriangle /> Low Stock Alerts
          </p>
          <div className="flex flex-wrap gap-2">
            {low.map(m => (
              <span key={m.id} className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg font-semibold">
                {m.materialName ?? m.name} — {fmt(m.currentQuantity ?? m.quantity)} {m.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full inventory table */}
      {materials.length === 0 ? (
        <p className="text-slate-500 text-sm">No materials in inventory yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-600 uppercase text-[10px] font-black tracking-widest border-b border-slate-800">
                <th className="pb-2 pr-4">Material</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Unit</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(m => {
                const qty    = m.currentQuantity ?? m.quantity ?? 0;
                const isLow  = qty < LOW_STOCK_THRESHOLD;
                return (
                  <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 pr-4 text-white font-medium">{m.materialName ?? m.name}</td>
                    <td className={`py-2 pr-4 font-mono font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>{fmt(qty)}</td>
                    <td className="py-2 pr-4 text-slate-500">{m.unit ?? '—'}</td>
                    <td className="py-2">
                      {isLow ? (
                        <span className="text-[10px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <FiAlertTriangle className="shrink-0" /> LOW
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <FiCheckCircle className="shrink-0" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Utility Components ─────────────────────────────────────────────────────

const Spinner = ({ label }) => (
  <div className="flex items-center gap-3 text-slate-500 text-sm py-4">
    <FiCpu className="animate-spin text-cyan-400" /> {label ?? 'Loading…'}
  </div>
);

const ErrorBox = ({ msg }) => (
  <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
    <FiAlertTriangle className="shrink-0" /> {msg}
  </div>
);

// ─── Root Dashboard ─────────────────────────────────────────────────────────

const CinqdDashboard = () => {
  const [user,      setUser]      = useState(undefined);
  const [loggingOut,setLoggingOut]= useState(false);

  // Meta state
  const [metaData,    setMetaData]    = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError,   setMetaError]   = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Firestore live state
  const [orders,    setOrders]    = useState([]);
  const [materials, setMaterials] = useState([]);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/verify')
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) window.location.href = '/admin/login';
        else setUser(d.user);
      })
      .catch(() => { window.location.href = '/admin/login'; });
  }, []);

  // ── Meta Pixel fetch ──────────────────────────────────────────────────────
  const fetchMeta = useCallback(async () => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const res  = await fetch('/api/meta/pixel-stats');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMetaData(data);
      setLastRefresh(new Date());
    } catch (e) {
      setMetaError(e.message);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMeta();
    const timer = setInterval(fetchMeta, 60_000);
    return () => clearInterval(timer);
  }, [user, fetchMeta]);

  // ── Firestore: orders ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'sales_transactions'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return onSnapshot(q, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  // ── Firestore: inventory ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'raw_materials'), snap =>
      setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/admin/login';
  }

  // ── Auth pending ──────────────────────────────────────────────────────────
  if (user === undefined) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-950">
        <div className="text-cyan-400 flex items-center gap-3">
          <FiCpu className="animate-spin text-xl" />
          <span className="font-semibold">CINQD Industrial OS…</span>
        </div>
      </div>
    );
  }

  // ── Summary numbers ───────────────────────────────────────────────────────
  const totalEvents   = metaData?.summary?.totalEvents ?? 0;
  const purchases     = metaData?.summary?.eventBreakdown?.Purchase ?? 0;
  const leads         = metaData?.summary?.eventBreakdown?.Lead ?? 0;
  const lowStockCount = materials.filter(m => (m.currentQuantity ?? m.quantity ?? 0) < LOW_STOCK_THRESHOLD).length;
  const todayOrders   = orders.filter(o => {
    const d = o.createdAt?.toDate?.();
    return d && d.toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="bg-slate-950 min-h-screen text-white font-sans">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
            <FiZap className="text-cyan-400 text-sm" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-tight">
              <span className="text-cyan-400">CINQD</span> Industrial OS
            </h1>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Cinqd Global Dataset · Enterprise v2</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastRefresh && (
            <span className="text-[10px] text-slate-600 hidden sm:block">
              Last refresh: {lastRefresh.toLocaleTimeString('fr-FR')}
            </span>
          )}
          <button
            onClick={fetchMeta}
            disabled={metaLoading}
            title="Refresh Meta stats"
            className="text-slate-500 hover:text-cyan-400 disabled:opacity-40 transition-colors"
          >
            <FiRefreshCw className={metaLoading ? 'animate-spin' : ''} />
          </button>
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold">{user.email}</p>
            <p className="text-[10px] text-slate-600">Administrator</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 disabled:opacity-50 transition-colors text-xs border border-slate-700 hover:border-red-500/40 rounded-lg px-3 py-1.5"
          >
            <FiLogOut />
            {loggingOut ? '…' : 'Logout'}
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ── Overview Stats ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FiActivity />}
            label="Meta Events (24h)"
            value={metaLoading ? '…' : fmt(totalEvents)}
            sub="Conversions API · Cinqd Pixel"
            accent="text-blue-400"
          />
          <StatCard
            icon={<FiTarget />}
            label="Purchases + Leads"
            value={metaLoading ? '…' : fmt(purchases + leads)}
            sub={`${purchases} purchases · ${leads} leads`}
            accent="text-green-400"
          />
          <StatCard
            icon={<FiShoppingCart />}
            label="Orders Today"
            value={fmt(todayOrders)}
            sub="From sales_transactions"
            accent="text-cyan-400"
          />
          <StatCard
            icon={<FiBox />}
            label="Low Stock Items"
            value={fmt(lowStockCount)}
            sub={lowStockCount ? 'Restock required' : 'All levels nominal'}
            accent={lowStockCount ? 'text-red-400' : 'text-green-400'}
          />
        </div>

        {/* ── Module 1: Meta Pixel Monitor ──────────────────────────────── */}
        <Section
          icon={<FiBarChart2 />}
          title="Meta Conversions API & Pixel Monitor"
          badge="Real-time · 24h"
        >
          <MetaPixelMonitor data={metaData} loading={metaLoading} error={metaError} />
        </Section>

        {/* ── Module 2 + 3 side by side on large screens ────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <Section
            icon={<FiTrendingUp />}
            title="Campaign Performance & Leads"
            badge="Live · Firestore"
          >
            <CampaignLeads orders={orders} />
          </Section>

          <Section
            icon={<FiBox />}
            title="Local Inventory / Stock Level"
            badge="Raw & Finished"
          >
            <InventoryModule materials={materials} />
          </Section>

        </div>

      </main>
    </div>
  );
};

export default CinqdDashboard;
