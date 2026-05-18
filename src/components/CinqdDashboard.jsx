import React, { useState, useEffect, useCallback } from 'react';
import { FiZap, FiLogOut, FiRefreshCw, FiFileText, FiCpu, FiPackage, FiUsers, FiDollarSign, FiActivity } from 'react-icons/fi';

import CommercialModule from './erp/CommercialModule.jsx';
import ManufacturingModule from './erp/ManufacturingModule.jsx';
import StockModule from './erp/StockModule.jsx';
import CRMModule from './erp/CRMModule.jsx';
import CashModule from './erp/CashModule.jsx';
import CAPIModule from './erp/CAPIModule.jsx';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 });

const TABS = [
  { key: 'commercial',     label: 'Commercial',     icon: FiFileText,   short: 'CMD/FAC' },
  { key: 'manufacturing',  label: 'Manufacturing',   icon: FiCpu,        short: 'Batches' },
  { key: 'stock',          label: 'Stock',           icon: FiPackage,    short: 'Stock' },
  { key: 'crm',            label: 'CRM',             icon: FiUsers,      short: 'CRM' },
  { key: 'cash',           label: 'Cash',            icon: FiDollarSign, short: 'Cash' },
  { key: 'capi',           label: 'CAPI',            icon: FiActivity,   short: 'CAPI' },
];

export default function CinqdDashboard() {
  const [activeTab, setActiveTab] = useState('commercial');
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/verify')
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) { window.location.href = '/admin/login'; return; }
        setUser(d.user);
      })
      .catch(() => { window.location.href = '/admin/login'; })
      .finally(() => setChecking(false));
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch('/api/erp/stats');
      if (r.ok) setStats(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (!checking) loadStats();
    const t = setInterval(loadStats, 60000);
    return () => clearInterval(t);
  }, [checking, loadStats]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex items-center gap-3 text-cyan-400">
          <FiZap className="animate-pulse text-xl" />
          <span className="font-semibold text-sm">Loading CINQD OS…</span>
        </div>
      </div>
    );
  }

  const cashTotal = stats?.cash?.reduce((s, b) => s + Number(b.balance || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 bg-slate-950/95 backdrop-blur z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
            <FiZap className="text-cyan-400 text-sm" />
          </div>
          <div>
            <p className="text-sm font-black text-white tracking-tight">
              <span className="text-cyan-400">CINQD</span> Industrial OS
            </p>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Enterprise ERP v2</p>
          </div>
        </div>

        {stats && (
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs font-black text-white">{fmt(stats.orders?.today || 0)}</div>
              <div className="text-[10px] text-slate-600 uppercase">Today</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-yellow-400">{fmt(stats.invoices?.unpaid || 0)}</div>
              <div className="text-[10px] text-slate-600 uppercase">Unpaid</div>
            </div>
            <div className="text-center">
              <div className={`text-xs font-black ${Number(stats.stock?.low_stock) > 0 ? 'text-red-400' : 'text-green-400'}`}>{fmt(stats.stock?.low_stock || 0)}</div>
              <div className="text-[10px] text-slate-600 uppercase">Low Stock</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-cyan-400">{fmt(cashTotal)} DA</div>
              <div className="text-[10px] text-slate-600 uppercase">Total Cash</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={loadStats} className="p-1.5 text-slate-500 hover:text-white border border-slate-700 rounded-lg" title="Refresh">
            <FiRefreshCw className="text-xs" />
          </button>
          <div className="text-[10px] text-slate-500 hidden sm:block">{user?.email}</div>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 px-3 py-1.5 rounded-lg transition-colors">
            <FiLogOut /> Logout
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-slate-800 px-4 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${
                  active ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}>
                <Icon className="text-xs" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Module */}
      <main className="flex-1 p-6 overflow-auto">
        {activeTab === 'commercial'    && <CommercialModule />}
        {activeTab === 'manufacturing' && <ManufacturingModule />}
        {activeTab === 'stock'         && <StockModule />}
        {activeTab === 'crm'           && <CRMModule />}
        {activeTab === 'cash'          && <CashModule />}
        {activeTab === 'capi'          && <CAPIModule />}
      </main>

      <footer className="border-t border-slate-800 px-6 py-2 flex items-center justify-between">
        <span className="text-[10px] text-slate-700 uppercase tracking-widest">CINQD Industrial OS · PostgreSQL · Self-Hosted</span>
        <span className="text-[10px] text-slate-700 font-mono">mkd-distrib.com</span>
      </footer>
    </div>
  );
}
