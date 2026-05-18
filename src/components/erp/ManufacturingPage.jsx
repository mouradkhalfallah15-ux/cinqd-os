import React from 'react';
import AppShell from './AppShell.jsx';
import ManufacturingModule from './ManufacturingModule.jsx';

export default function ManufacturingPage() {
  return (
    <AppShell active="manufacturing">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Manufacturing</h1>
          <p className="text-xs text-slate-500 mt-0.5">Batches · Formulas · Production · الإنتاج</p>
        </div>
        <ManufacturingModule />
      </div>
    </AppShell>
  );
}
