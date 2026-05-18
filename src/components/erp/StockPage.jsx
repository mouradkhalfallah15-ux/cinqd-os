import React from 'react';
import AppShell from './AppShell.jsx';
import StockModule from './StockModule.jsx';

export default function StockPage() {
  return (
    <AppShell active="stock">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Stock & Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Items · Restock · Movements · المخزون</p>
        </div>
        <StockModule />
      </div>
    </AppShell>
  );
}
