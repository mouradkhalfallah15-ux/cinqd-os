import React from 'react';
import AppShell from './AppShell.jsx';
import CashModule from './CashModule.jsx';

export default function FinancePage() {
  return (
    <AppShell active="finance">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Finance</h1>
          <p className="text-xs text-slate-500 mt-0.5">Cash Boxes · Entries · Transfers · المالية</p>
        </div>
        <CashModule />
      </div>
    </AppShell>
  );
}
