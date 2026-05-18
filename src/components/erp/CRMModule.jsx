import React, { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiPlus, FiRefreshCw } from 'react-icons/fi';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 });

export default function CRMModule() {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCommission, setShowCommission] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', code: '', rate_percent: 10, type: 'affiliate' });
  const [commForm, setCommForm] = useState({ amount: '', ref: '', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/erp/affiliates');
    setAffiliates(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    const r = await fetch('/api/erp/affiliates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) return alert(d.error);
    setShowNew(false);
    setForm({ name: '', phone: '', email: '', code: '', rate_percent: 10, type: 'affiliate' });
    load();
  }

  async function addCommission(e) {
    e.preventDefault();
    await fetch('/api/erp/affiliates/commission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affiliate_id: showCommission, ...commForm })
    });
    setShowCommission(null);
    setCommForm({ amount: '', ref: '', note: '' });
    load();
  }

  async function markPaid(affiliate_id) {
    const aff = affiliates.find(a => a.id === affiliate_id);
    if (!aff || !confirm(`Mark all pending commissions for ${aff.name} as paid?`)) return;
    await fetch('/api/erp/affiliates/commission', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_id: 'all', status: 'paid' })
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiUsers className="text-cyan-400" />
          <span className="text-sm font-black text-white uppercase tracking-widest">CRM & Affiliate System</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNew(v => !v)} className="flex items-center gap-1.5 text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-3 py-1.5 rounded-lg"><FiPlus /> New Affiliate</button>
          <button onClick={load} className="p-1.5 text-slate-500 hover:text-white border border-slate-700 rounded-lg"><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {showNew && (
        <form onSubmit={submit} className="bg-slate-900 border border-slate-700 rounded-xl p-4 grid grid-cols-3 gap-3">
          <div className="col-span-3 text-xs font-black text-slate-400 uppercase tracking-widest mb-1">New Affiliate / UGC Tester</div>
          {[['Name','name'],['Phone','phone'],['Email','email'],['Referral Code','code']].map(([label,key]) => (
            <div key={key}>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} required={key==='name'||key==='code'}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Commission %</label>
            <input type="number" step="0.1" min="0" max="100" value={form.rate_percent} onChange={e => setForm(f => ({...f,rate_percent:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({...f,type:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
              <option value="affiliate">Affiliate</option>
              <option value="ugc">UGC Tester</option>
              <option value="influencer">Influencer</option>
              <option value="reseller">Reseller</option>
            </select>
          </div>
          <div className="col-span-3 flex gap-2 pt-1">
            <button type="submit" className="bg-cyan-400 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Add</button>
            <button type="button" onClick={() => setShowNew(false)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {showCommission && (
        <form onSubmit={addCommission} className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 space-y-3">
          <div className="text-xs font-black text-cyan-400 uppercase tracking-widest">Add Commission Entry</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Amount (DA)</label>
              <input type="number" step="0.01" value={commForm.amount} onChange={e => setCommForm(f => ({...f,amount:e.target.value}))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Reference</label>
              <input value={commForm.ref} onChange={e => setCommForm(f => ({...f,ref:e.target.value}))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Note</label>
              <input value={commForm.note} onChange={e => setCommForm(f => ({...f,note:e.target.value}))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-cyan-400 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Add Commission</button>
            <button type="button" onClick={() => setShowCommission(null)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {affiliates.map(aff => (
          <div key={aff.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{aff.name}</span>
                  <span className="bg-cyan-400/10 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-mono">{aff.code}</span>
                  <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.5 rounded uppercase">{aff.type}</span>
                  {!aff.active && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded">Inactive</span>}
                </div>
                <div className="flex gap-4 mt-1">
                  {aff.phone && <span className="text-xs text-slate-500">{aff.phone}</span>}
                  {aff.email && <span className="text-xs text-slate-500">{aff.email}</span>}
                  <span className="text-xs text-slate-500">{aff.rate_percent}% commission</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-yellow-400">{fmt(aff.total_commission_due)} DA</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Pending commissions</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowCommission(aff.id)} className="text-[10px] bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 px-2 py-1 rounded">+ Commission</button>
              {Number(aff.total_commission_due) > 0 && (
                <button onClick={() => markPaid(aff.id)} className="text-[10px] bg-green-500/20 text-green-400 hover:bg-green-500/40 px-2 py-1 rounded">Mark Paid</button>
              )}
            </div>
          </div>
        ))}
        {affiliates.length === 0 && !loading && (
          <div className="text-center text-slate-600 text-xs py-8">No affiliates registered yet.</div>
        )}
      </div>
    </div>
  );
}
