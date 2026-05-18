import React, { useState, useEffect, useCallback } from 'react';
import { FiZap, FiRefreshCw, FiSend, FiActivity } from 'react-icons/fi';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ');

export default function CAPIModule() {
  const [pixelStats, setPixelStats] = useState(null);
  const [webOrders, setWebOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fireForm, setFireForm] = useState({ event_name: 'Purchase', value: '', currency: 'DZD', email: '', phone: '', order_id: '' });
  const [fireResult, setFireResult] = useState(null);
  const [firing, setFiring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps] = await Promise.all([
        fetch('/api/meta/pixel-stats').then(r => r.json()).catch(() => null),
      ]);
      setPixelStats(ps);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function fireCapi(e) {
    e.preventDefault();
    setFiring(true);
    setFireResult(null);
    try {
      const r = await fetch('/api/erp/capi/fire', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fireForm)
      });
      const d = await r.json();
      setFireResult({ ok: r.ok, data: d });
    } catch (err) {
      setFireResult({ ok: false, data: { error: err.message } });
    } finally {
      setFiring(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiZap className="text-cyan-400" />
          <span className="text-sm font-black text-white uppercase tracking-widest">Meta Pixel & CAPI Monitor</span>
          <span className="font-mono text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">963525612756552</span>
        </div>
        <button onClick={load} className="p-1.5 text-slate-500 hover:text-white border border-slate-700 rounded-lg"><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {pixelStats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Pixel ID</div>
            <div className="text-xs font-mono text-cyan-400">{pixelStats.pixel?.id || '963525612756552'}</div>
            <div className="text-[10px] text-slate-600 mt-1">{pixelStats.pixel?.name || 'CINQD Pixel'}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Events 24h</div>
            <div className="text-xl font-black text-white">{fmt(pixelStats.summary?.totalEvents || 0)}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Purchases</div>
            <div className="text-xl font-black text-green-400">{fmt(pixelStats.summary?.eventBreakdown?.Purchase || 0)}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Leads</div>
            <div className="text-xl font-black text-blue-400">{fmt(pixelStats.summary?.eventBreakdown?.Lead || 0)}</div>
          </div>
        </div>
      )}

      {!pixelStats && !loading && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded-xl px-4 py-3">
          Meta Pixel stats unavailable — check META_ACCESS_TOKEN in .env
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <FiSend className="text-cyan-400 text-xs" />
          <span className="text-xs font-black text-white uppercase tracking-widest">Manual CAPI Event Fire</span>
        </div>
        <form onSubmit={fireCapi} className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Event Name</label>
            <select value={fireForm.event_name} onChange={e => setFireForm(f => ({...f,event_name:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
              {['Purchase','Lead','ViewContent','AddToCart','InitiateCheckout','CompleteRegistration'].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Value (DA)</label>
            <input type="number" step="0.01" value={fireForm.value} onChange={e => setFireForm(f => ({...f,value:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Order ID</label>
            <input value={fireForm.order_id} onChange={e => setFireForm(f => ({...f,order_id:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Email (hashed)</label>
            <input type="email" value={fireForm.email} onChange={e => setFireForm(f => ({...f,email:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Phone</label>
            <input value={fireForm.phone} onChange={e => setFireForm(f => ({...f,phone:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={firing}
              className="w-full flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-900 disabled:text-cyan-700 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">
              {firing ? <><FiRefreshCw className="animate-spin" /> Firing…</> : <><FiZap /> Fire Event</>}
            </button>
          </div>
        </form>
        {fireResult && (
          <div className={`rounded-xl px-4 py-3 text-xs font-mono ${fireResult.ok ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {JSON.stringify(fireResult.data, null, 2)}
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FiActivity className="text-cyan-400 text-xs" />
          <span className="text-xs font-black text-white uppercase tracking-widest">Webhook Endpoint</span>
        </div>
        <div className="bg-slate-800 rounded-lg px-4 py-3 font-mono text-xs text-slate-300">
          POST /api/erp/webhook/order
        </div>
        <div className="text-[10px] text-slate-500 space-y-1">
          <div>Required headers: <span className="text-slate-300 font-mono">X-CINQD-SECRET: &lt;WEBHOOK_SECRET&gt;</span></div>
          <div>Required body: <span className="text-slate-300 font-mono">name, phone</span></div>
          <div>Optional body: <span className="text-slate-300 font-mono">email, address, product_name, qty, amount, affiliate_code</span></div>
          <div className="text-yellow-500">→ Creates client + web order + affiliate commission + fires CAPI Purchase event</div>
        </div>
      </div>
    </div>
  );
}
