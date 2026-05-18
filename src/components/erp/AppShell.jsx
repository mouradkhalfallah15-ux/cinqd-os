import React, { useState, useEffect } from 'react';
import {
  FiGrid, FiShoppingCart, FiPackage, FiCpu, FiDollarSign,
  FiUsers, FiLogOut, FiZap, FiMenu, FiX, FiChevronRight,
} from 'react-icons/fi';

const NAV = [
  { key: 'dashboard',      label: 'Dashboard',    labelAr: 'الرئيسية',    icon: FiGrid,        href: '/admin/dashboard' },
  { key: 'commercial',     label: 'Commercial',   labelAr: 'التجاري',     icon: FiShoppingCart, href: '/admin/commercial' },
  { key: 'stock',          label: 'Stock',        labelAr: 'المخزون',     icon: FiPackage,     href: '/admin/stock' },
  { key: 'manufacturing',  label: 'Manufacturing',labelAr: 'الإنتاج',     icon: FiCpu,         href: '/admin/manufacturing' },
  { key: 'finance',        label: 'Finance',      labelAr: 'المالية',     icon: FiDollarSign,  href: '/admin/finance' },
  { key: 'affiliate',      label: 'Affiliates',   labelAr: 'الشركاء',     icon: FiUsers,       href: '/admin/affiliate' },
];

export default function AppShell({ active, children }) {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/verify')
      .then(r => r.json())
      .then(d => { if (!d.authenticated) window.location.href = '/admin/login'; else setUser(d.user); })
      .catch(() => { window.location.href = '/admin/login'; });
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center shrink-0">
          <FiZap className="text-cyan-400" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-black text-white tracking-tight leading-none"><span className="text-cyan-400">CINQD</span> OS</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">Enterprise ERP</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {NAV.map(item => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <a key={item.key} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                isActive
                  ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/60'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`text-base shrink-0 ${isActive ? 'text-cyan-400' : 'group-hover:text-white'}`} />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black uppercase tracking-widest leading-none">{item.label}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">{item.labelAr}</div>
                </div>
              )}
              {!collapsed && isActive && <FiChevronRight className="text-cyan-400 text-xs shrink-0" />}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs font-black rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-slate-700">
                  {item.label}
                </div>
              )}
            </a>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className={`border-t border-slate-800 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed && user && (
          <div className="text-[10px] text-slate-600 px-2 mb-2 truncate">{user.email}</div>
        )}
        <button onClick={logout}
          className={`flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors rounded-lg px-3 py-2 hover:bg-red-400/5 w-full ${collapsed ? 'justify-center' : ''}`}>
          <FiLogOut className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-3 right-3">
          <button onClick={() => setMobileOpen(false)} className="p-1.5 text-slate-500 hover:text-white"><FiX /></button>
        </div>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200 shrink-0 ${collapsed ? 'w-14' : 'w-56'}`}>
        <SidebarContent />
        <button onClick={() => setCollapsed(v => !v)}
          className="absolute bottom-20 -right-3 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-500 hover:text-white text-xs z-10"
          style={{ position: 'static', alignSelf: 'flex-end', margin: '0 -12px 12px 0', zIndex: 10 }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 text-slate-400 hover:text-white"><FiMenu /></button>
          <span className="text-sm font-black text-white"><span className="text-cyan-400">CINQD</span> OS</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
