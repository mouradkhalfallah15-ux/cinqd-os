import React, { useState, useEffect, useCallback } from 'react';
import { FiDollarSign, FiPlus, FiRefreshCw, FiArrowRight } from 'react-icons/fi';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 });

export default function CashModule({ compact = false }) {
  const [boxes, setBoxes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEntry, setShowEntry] = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [entryForm, setEntryForm] = useState({ direction: 'in', amount: '', ref: '', note: '' });
  const [transferForm, setTransferForm] = useState({ from_box_id: '', to_box_id: '', amount: '', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [b, e] = await Promise.all([
      fetch('/api/erp/cash/boxes').then(r => r.json()),
      fetch('/api/erp/cash/entries').then(r => r.json()),
    ]);
    setBoxes(Array.isArray(b) ? b : []);
    setEntries(Array.isArray(e) ? e : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitEntry(e) {
    e.preventDefault();
    await fetch('/api/erp/cash/entries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ box_id: showEntry, ...entryForm })
    });
    setShowEntry(null);
    setEntryForm({ direction: 'in', amount: '', ref: '', note: '' });
    load();
  }

  async function submitTransfer(e) {
    e.preventDefault();
    const r = await fetch('/api/erp/cash/transfer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transferForm)
    });
    const d = await r.json();
    if (!r.ok) return alert(d.error);
    setShowTransfer(false);
    setTransferForm({ from_box_id: '', to_box_id: '', amount: '', note: '' });
    load();
  }

  const boxColors = ['from-cyan-500/20 to-cyan-600/10 border-cyan-500/30', 'from-blue-500/20 to-blue-600/10 border-blue-500/30', 'from-orange-500/20 to-orange-600/10 border-orange-500/30'];
  const textColors = ['text-cyan-400', 'text-blue-400', 'text-orange-400'];

  if (compact) return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiDollarSign className="text-cyan-400 text-xs" />
          <span className="text-xs font-black text-white uppercase tracking-widest">Cash Boxes</span>
        </div>
        <button onClick={load} className="p-1 text-slate-600 hover:text-white"><FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      <div className="space-y-2">
        {boxes.map((box, i) => (
          <div key={box.id} className={`flex items-center justify-between bg-gradient-to-r ${boxColors[i % 3]} border rounded-lg px-3 py-2`}>
            <div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${textColors[i % 3]}`}>{box.name}</div>
              <div className="text-[9px] text-slate-600">{box.description}</div>
            </div>
            <div className={`text-sm font-black ${textColors[i % 3]}`}>{fmt(box.balance)} DA</div>
          </div>
        ))}
      </div>
      <div className={`flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 border-t border-slate-800 pt-2`}>
        <span>Total</span>
        <span className="text-white">{fmt(boxes.reduce((s,b)=>s+Number(b.balance||0),0))} DA</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiDollarSign className="text-cyan-400" />
          <span className="text-sm font-black text-white uppercase tracking-widest">Trois Caisses</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTransfer(v => !v)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 rounded-lg"><FiArrowRight /> Transfer</button>
          <button onClick={load} className="p-1.5 text-slate-500 hover:text-white border border-slate-700 rounded-lg"><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {boxes.map((box, i) => (
          <div key={box.id} className={`bg-gradient-to-br ${boxColors[i % 3]} border rounded-xl p-4 space-y-3`}>
            <div>
              <div className={`text-xs font-black uppercase tracking-widest ${textColors[i % 3]}`}>{box.name}</div>
              <div className="text-[10px] text-slate-500">{box.description}</div>
            </div>
            <div className={`text-2xl font-black ${textColors[i % 3]}`}>{fmt(box.balance)} <span className="text-sm">DA</span></div>
            <button onClick={() => { setShowEntry(box.id); setEntryForm({ direction: 'in', amount: '', ref: '', note: '' }); }}
              className="w-full text-xs text-center border border-current/30 rounded-lg py-1.5 hover:bg-white/5 transition-colors flex items-center justify-center gap-1">
              <FiPlus className="text-xs" /> Add Entry
            </button>
          </div>
        ))}
      </div>

      {showEntry && (
        <form onSubmit={submitEntry} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
            New Entry — {boxes.find(b => b.id === showEntry)?.name}
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Direction</label>
              <select value={entryForm.direction} onChange={e => setEntryForm(f => ({...f,direction:e.target.value}))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                <option value="in">IN (Entrée)</option>
                <option value="out">OUT (Sortie)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Amount (DA)</label>
              <input type="number" step="0.01" value={entryForm.amount} onChange={e => setEntryForm(f => ({...f,amount:e.target.value}))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Reference</label>
              <input value={entryForm.ref} onChange={e => setEntryForm(f => ({...f,ref:e.target.value}))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Note</label>
              <input value={entryForm.note} onChange={e => setEntryForm(f => ({...f,note:e.target.value}))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={`text-xs font-black px-4 py-1.5 rounded-lg ${entryForm.direction==='in' ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-red-500 hover:bg-red-400 text-white'}`}>
              {entryForm.direction === 'in' ? '+ Entrée' : '- Sortie'}
            </button>
            <button type="button" onClick={() => setShowEntry(null)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {showTransfer && (
        <form onSubmit={submitTransfer} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Inter-box Transfer</div>
          <div className="grid grid-cols-4 gap-3 items-center">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">From</label>
              <select value={transferForm.from_box_id} onChange={e => setTransferForm(f => ({...f,from_box_id:e.target.value}))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                <option value="">Select…</option>
                {boxes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">To</label>
              <select value={transferForm.to_box_id} onChange={e => setTransferForm(f => ({...f,to_box_id:e.target.value}))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                <option value="">Select…</option>
                {boxes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Amount (DA)</label>
              <input type="number" step="0.01" value={transferForm.amount} onChange={e => setTransferForm(f => ({...f,amount:e.target.value}))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Note</label>
              <input value={transferForm.note} onChange={e => setTransferForm(f => ({...f,note:e.target.value}))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-cyan-400 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Transfer</button>
            <button type="button" onClick={() => setShowTransfer(false)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Recent Entries</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              {['Box','Direction','Amount','Ref','Note','Date'].map(h => (
                <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-widest pb-2 pr-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(e => {
              const box = boxes.find(b => b.id === e.box_id);
              return (
                <tr key={e.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-1.5 pr-3 text-white">{box?.name || '—'}</td>
                  <td className="py-1.5 pr-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${e.direction==='in' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{e.direction}</span>
                  </td>
                  <td className="py-1.5 pr-3 font-mono">{fmt(e.amount)} DA</td>
                  <td className="py-1.5 pr-3 text-slate-400 font-mono">{e.ref}</td>
                  <td className="py-1.5 pr-3 text-slate-500">{e.note}</td>
                  <td className="py-1.5 pr-3 text-slate-600">{new Date(e.created_at).toLocaleDateString('fr-DZ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
