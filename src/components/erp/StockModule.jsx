import React, { useState, useEffect, useCallback } from 'react';
import { FiPackage, FiPlus, FiRefreshCw, FiAlertTriangle, FiChevronDown, FiChevronUp, FiArrowUp } from 'react-icons/fi';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 });

export default function StockModule() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showRestock, setShowRestock] = useState(null);
  const [form, setForm] = useState({ sku: '', name: '', category: 'raw', unit: 'L', qty_on_hand: 0, reorder_level: 0, cost_per_unit: 0, image_url: '' });
  const [restockForm, setRestockForm] = useState({ qty: '', note: '' });
  const [movements, setMovements] = useState([]);
  const [showMov, setShowMov] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/erp/stock/items');
    setItems(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addItem(e) {
    e.preventDefault();
    await fetch('/api/erp/stock/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowAdd(false);
    setForm({ sku: '', name: '', category: 'raw', unit: 'L', qty_on_hand: 0, reorder_level: 0, cost_per_unit: 0, image_url: '' });
    load();
  }

  async function doRestock(e) {
    e.preventDefault();
    await fetch('/api/erp/stock/restock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: showRestock, qty: Number(restockForm.qty), note: restockForm.note }),
    });
    setShowRestock(null);
    setRestockForm({ qty: '', note: '' });
    load();
  }

  async function deleteItem(id) {
    if (!confirm('Delete this item?')) return;
    await fetch(`/api/erp/stock/${id}`, { method: 'DELETE' });
    load();
  }

  async function loadMovements() {
    const r = await fetch('/api/erp/stock/movements');
    setMovements(await r.json());
    setShowMov(true);
  }

  const low = items.filter(i => Number(i.qty_on_hand) <= Number(i.reorder_level));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiPackage className="text-cyan-400" />
          <span className="text-sm font-black text-white uppercase tracking-widest">Stock & Inventory</span>
          {low.length > 0 && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full">{low.length} low</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={loadMovements} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 rounded-lg">Movements</button>
          <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-3 py-1.5 rounded-lg">
            <FiPlus /> Add Item
          </button>
          <button onClick={load} className="p-1.5 text-slate-500 hover:text-white border border-slate-700 rounded-lg"><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={addItem} className="bg-slate-900 border border-slate-700 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-1">New Stock Item</div>
          {[['SKU','sku'],['Name','name']].map(([label,key]) => (
            <div key={key}>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Image URL</label>
            <input value={form.image_url} onChange={e => setForm(f => ({...f,image_url:e.target.value}))} placeholder="https://..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({...f,category:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
              <option value="raw">Raw Material</option>
              <option value="finished">Finished Product</option>
              <option value="packaging">Packaging</option>
              <option value="consumable">Consumable</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Unit</label>
            <select value={form.unit} onChange={e => setForm(f => ({...f,unit:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
              {['L','ml','kg','g','unit','box','pcs'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {[['Initial Qty','qty_on_hand'],['Reorder Level','reorder_level'],['Cost/Unit','cost_per_unit']].map(([label,key]) => (
            <div key={key}>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">{label}</label>
              <input type="number" step="0.01" value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
          ))}
          <div className="col-span-2 flex gap-2 pt-1">
            <button type="submit" className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {showRestock && (
        <form onSubmit={doRestock} className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 space-y-3">
          <div className="text-xs font-black text-cyan-400 uppercase tracking-widest">Restock Item</div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Quantity</label>
              <input type="number" step="0.01" value={restockForm.qty} onChange={e => setRestockForm(f => ({...f,qty:e.target.value}))} required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Note</label>
              <input value={restockForm.note} onChange={e => setRestockForm(f => ({...f,note:e.target.value}))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Confirm Restock</button>
            <button type="button" onClick={() => setShowRestock(null)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              {['','SKU','Name','Cat','Unit','On Hand','Reserved','Reorder','Cost',''].map(h => (
                <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-widest pb-2 pr-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isLow = Number(item.qty_on_hand) <= Number(item.reorder_level);
              return (
                <tr key={item.id} className={`border-b border-slate-800/50 hover:bg-slate-800/20 ${isLow ? 'text-red-400' : 'text-slate-300'}`}>
                  <td className="py-2 pr-3">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-8 h-8 rounded-lg object-cover border border-slate-700" />
                      : <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600 text-xs">?</div>
                    }
                  </td>
                  <td className="py-2 pr-3 font-mono">{item.sku}</td>
                  <td className="py-2 pr-3 text-white">{item.name}</td>
                  <td className="py-2 pr-3">
                    <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.5 rounded">{item.category}</span>
                  </td>
                  <td className="py-2 pr-3">{item.unit}</td>
                  <td className="py-2 pr-3 font-mono">{fmt(item.qty_on_hand)}</td>
                  <td className="py-2 pr-3 font-mono text-yellow-500">{fmt(item.qty_reserved)}</td>
                  <td className="py-2 pr-3 font-mono">{fmt(item.reorder_level)}</td>
                  <td className="py-2 pr-3 font-mono">{fmt(item.cost_per_unit)}</td>
                  <td className="py-2 flex gap-1">
                    <button onClick={() => setShowRestock(item.id)} title="Restock"
                      className="p-1 text-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/10 rounded">
                      <FiArrowUp />
                    </button>
                    <button onClick={() => deleteItem(item.id)} title="Delete"
                      className="p-1 text-red-500 hover:text-red-300 hover:bg-red-500/10 rounded">×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && !loading && (
          <div className="text-center text-slate-600 text-xs py-8">No stock items. Add your first item above.</div>
        )}
      </div>

      {showMov && (
        <div className="border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between bg-slate-800/50 px-4 py-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Stock Movements</span>
            <button onClick={() => setShowMov(false)} className="text-slate-500 hover:text-white text-xs">Close</button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['Item','Direction','Qty','Reason','Ref','Date'].map(h => (
                  <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-widest pb-2 pr-3 px-4 pt-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id} className="border-b border-slate-800/50">
                  <td className="px-4 py-1.5 text-white">{m.item_name}</td>
                  <td className="px-4 py-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.direction === 'in' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{m.direction}</span>
                  </td>
                  <td className="px-4 py-1.5 font-mono">{fmt(m.qty)}</td>
                  <td className="px-4 py-1.5 text-slate-400">{m.reason}</td>
                  <td className="px-4 py-1.5 text-slate-400 font-mono">{m.ref}</td>
                  <td className="px-4 py-1.5 text-slate-500">{new Date(m.created_at).toLocaleDateString('fr-DZ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
