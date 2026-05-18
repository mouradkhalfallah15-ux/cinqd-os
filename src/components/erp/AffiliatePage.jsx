import React from 'react';
import AppShell from './AppShell.jsx';
import CRMModule from './CRMModule.jsx';

export default function AffiliatePage() {
  return (
    <AppShell active="affiliate">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Affiliates & CRM</h1>
          <p className="text-xs text-slate-500 mt-0.5">Partners · Commissions · الشركاء والعمولات</p>
        </div>
        <CRMModule />
      </div>
    </AppShell>
  );
}
