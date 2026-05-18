import React from 'react';
import AppShell from './AppShell.jsx';
import CommercialModule from './CommercialModule.jsx';

export default function CommercialPage() {
  return (
    <AppShell active="commercial">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Commercial</h1>
          <p className="text-xs text-slate-500 mt-0.5">Orders · Invoices · Delivery · Web Orders · التجاري</p>
        </div>
        <CommercialModule />
      </div>
    </AppShell>
  );
}
