import React, { useState, useEffect, useCallback } from 'react';
import { FiCpu, FiPlus, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 3 });
const statusColor = s => ({
  draft: 'bg-slate-600/30 text-slate-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
}[s] || 'bg-slate-600/30 text-slate-400');

export default function ManufacturingModule() {
  const [tab, setTab] = useState('batches');
  const [batches, setBatches] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [showNewFormula, setShowNewFormula] = useState(false);
  const [showComplete, setShowComplete] = useState(null);
  const [batchForm, setBatchForm] = useState({ formula_id: '', qty_planned: '', notes: '' });
  const [formulaForm, setFormulaForm] = useState({ name: '', description: '', output_item_id: '', output_qty: '', output_unit: 'L', lines: [] });
  const [completeForm, setCompleteForm] = useState({ qty_produced: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [b, f, s] = await Promise.all([
      fetch('/api/erp/batches').then(r => r.json()),
      fetch('/api/erp/formulas').then(r => r.json()),
      fetch('/api/erp/stock/items').then(r => r.json()),
    ]);
    setBatches(Array.isArray(b) ? b : []);
    setFormulas(Array.isArray(f) ? f : []);
    setStockItems(Array.isArray(s) ? s : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitBatch(e) {
    e.preventDefault();
    const r = await fetch('/api/erp/batches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batchForm) });
    const d = await r.json();
    if (!r.ok) return alert(d.error);
    setShowNewBatch(false);
    setBatchForm({ formula_id: '', qty_planned: '', notes: '' });
    load();
  }

  async function submitFormula(e) {
    e.preventDefault();
    if (!formulaForm.lines.length) return alert('Add at least one ingredient');
    const r = await fetch('/api/erp/formulas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formulaForm) });
    const d = await r.json();
    if (!r.ok) return alert(d.error);
    setShowNewFormula(false);
    setFormulaForm({ name: '', description: '', output_item_id: '', output_qty: '', output_unit: 'L', lines: [] });
    load();
  }

  async function completeBatch(e) {
    e.preventDefault();
    const r = await fetch(`/api/erp/batches/${showComplete}/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qty_produced: Number(completeForm.qty_produced) })
    });
    const d = await r.json();
    if (!r.ok) return alert(d.error);
    setShowComplete(null);
    setCompleteForm({ qty_produced: '' });
    load();
  }

  async function cancelBatch(id) {
    if (!confirm('Cancel this batch?')) return;
    await fetch(`/api/erp/batches/${id}/cancel`, { method: 'POST' });
    load();
  }

  async function deleteFormula(id) {
    if (!confirm('Delete formula?')) return;
    await fetch(`/api/erp/formulas/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiCpu className="text-cyan-400" />
          <span className="text-sm font-black text-white uppercase tracking-widest">Manufacturing & Releases</span>
        </div>
        <div className="flex gap-2">
          {tab === 'batches' && <button onClick={() => setShowNewBatch(v => !v)} className="flex items-center gap-1.5 text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-3 py-1.5 rounded-lg"><FiPlus /> New Batch</button>}
          {tab === 'formulas' && <button onClick={() => setShowNewFormula(v => !v)} className="flex items-center gap-1.5 text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-3 py-1.5 rounded-lg"><FiPlus /> New Formula</button>}
          <button onClick={load} className="p-1.5 text-slate-500 hover:text-white border border-slate-700 rounded-lg"><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-800">
        {[['batches','Production Batches'],['formulas','Formulas']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`text-xs px-4 py-2 font-black uppercase tracking-widest transition-colors ${tab===key ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>{label}</button>
        ))}
      </div>

      {showComplete && (
        <form onSubmit={completeBatch} className="bg-slate-900 border border-green-500/30 rounded-xl p-4 space-y-3">
          <div className="text-xs font-black text-green-400 uppercase tracking-widest">Complete Batch — Enter Actual Output</div>
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Qty Produced</label>
              <input type="number" step="0.01" value={completeForm.qty_produced} onChange={e => setCompleteForm({qty_produced:e.target.value})} required
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500 w-36" />
            </div>
            <button type="submit" className="bg-green-500 hover:bg-green-400 text-white text-xs font-black px-4 py-1.5 rounded-lg">Confirm & Deduct Stock</button>
            <button type="button" onClick={() => setShowComplete(null)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {tab === 'batches' && (
        <>
          {showNewBatch && (
            <form onSubmit={submitBatch} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">New Production Batch</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Formula</label>
                  <select value={batchForm.formula_id} onChange={e => setBatchForm(f => ({...f,formula_id:e.target.value}))} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                    <option value="">Select formula…</option>
                    {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Qty Planned</label>
                  <input type="number" step="0.01" value={batchForm.qty_planned} onChange={e => setBatchForm(f => ({...f,qty_planned:e.target.value}))} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Notes</label>
                  <input value={batchForm.notes} onChange={e => setBatchForm(f => ({...f,notes:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-cyan-400 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Create Batch</button>
                <button type="button" onClick={() => setShowNewBatch(false)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
              </div>
            </form>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['Batch #','Formula','Planned','Produced','Status','Date','Actions'].map(h => (
                  <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-widest pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-2 pr-3 font-mono text-cyan-400">{b.batch_number}</td>
                  <td className="py-2 pr-3 text-white">{b.formula_name}</td>
                  <td className="py-2 pr-3 font-mono">{fmt(b.qty_planned)}</td>
                  <td className="py-2 pr-3 font-mono">{b.qty_produced ? fmt(b.qty_produced) : '—'}</td>
                  <td className="py-2 pr-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${statusColor(b.status)}`}>{b.status}</span></td>
                  <td className="py-2 pr-3 text-slate-500">{new Date(b.created_at).toLocaleDateString('fr-DZ')}</td>
                  <td className="py-2 flex gap-1">
                    {['draft','in_progress'].includes(b.status) && (
                      <button onClick={() => setShowComplete(b.id)} className="text-[10px] bg-green-500/20 text-green-400 hover:bg-green-500/40 px-2 py-0.5 rounded">Complete</button>
                    )}
                    {['draft','in_progress'].includes(b.status) && (
                      <button onClick={() => cancelBatch(b.id)} className="text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/40 px-2 py-0.5 rounded">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === 'formulas' && (
        <>
          {showNewFormula && (
            <form onSubmit={submitFormula} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">New Formula</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Formula Name</label>
                  <input value={formulaForm.name} onChange={e => setFormulaForm(f => ({...f,name:e.target.value}))} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Description</label>
                  <input value={formulaForm.description} onChange={e => setFormulaForm(f => ({...f,description:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Output Item</label>
                  <select value={formulaForm.output_item_id} onChange={e => setFormulaForm(f => ({...f,output_item_id:e.target.value}))} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                    <option value="">Select item…</option>
                    {stockItems.filter(s=>s.category==='finished').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Output Qty</label>
                    <input type="number" step="0.01" value={formulaForm.output_qty} onChange={e => setFormulaForm(f => ({...f,output_qty:e.target.value}))} required
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Unit</label>
                    <select value={formulaForm.output_unit} onChange={e => setFormulaForm(f => ({...f,output_unit:e.target.value}))}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                      {['L','ml','kg','g','unit','pcs'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Ingredients</div>
                {formulaForm.lines.map((line, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={line.item_id} onChange={e => setFormulaForm(f => { const lines=[...f.lines]; lines[i]={...lines[i],item_id:e.target.value}; return {...f,lines}; })} required
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                      <option value="">Select raw material…</option>
                      {stockItems.filter(s=>s.category==='raw').map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                    </select>
                    <input type="number" step="0.001" placeholder="Qty" value={line.qty} onChange={e => setFormulaForm(f => { const lines=[...f.lines]; lines[i]={...lines[i],qty:e.target.value}; return {...f,lines}; })} required
                      className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                    <select value={line.unit} onChange={e => setFormulaForm(f => { const lines=[...f.lines]; lines[i]={...lines[i],unit:e.target.value}; return {...f,lines}; })}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                      {['L','ml','kg','g'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button type="button" onClick={() => setFormulaForm(f => ({...f,lines:f.lines.filter((_,j)=>j!==i)}))} className="text-red-500 hover:text-red-300">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => setFormulaForm(f => ({...f,lines:[...f.lines,{item_id:'',qty:'',unit:'L'}]}))} className="text-xs text-cyan-400 hover:text-cyan-300">+ Add ingredient</button>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-cyan-400 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Save Formula</button>
                <button type="button" onClick={() => setShowNewFormula(false)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
              </div>
            </form>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['Name','Description','Output Qty','Unit',''].map(h => (
                  <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-widest pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formulas.map(f => (
                <tr key={f.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-2 pr-3 text-white font-black">{f.name}</td>
                  <td className="py-2 pr-3 text-slate-400">{f.description}</td>
                  <td className="py-2 pr-3 font-mono">{fmt(f.output_qty)}</td>
                  <td className="py-2 pr-3">{f.output_unit}</td>
                  <td className="py-2">
                    <button onClick={() => deleteFormula(f.id)} className="text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/40 px-2 py-0.5 rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
