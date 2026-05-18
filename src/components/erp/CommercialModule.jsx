import React, { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiPlus, FiRefreshCw, FiCheck, FiX, FiEye } from 'react-icons/fi';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 });
const statusColor = s => ({
  draft: 'bg-slate-600/30 text-slate-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  invoiced: 'bg-purple-500/20 text-purple-400',
  cancelled: 'bg-red-500/20 text-red-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-green-500/20 text-green-400',
  dispatched: 'bg-orange-500/20 text-orange-400',
  delivered: 'bg-green-500/20 text-green-400',
}[s] || 'bg-slate-600/30 text-slate-400');

export default function CommercialModule() {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [clients, setClients] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null);
  const [cashBoxes, setCashBoxes] = useState([]);
  const [orderForm, setOrderForm] = useState({ client_id: '', notes: '', lines: [] });
  const [invoiceForm, setInvoiceForm] = useState({ client_id: '', notes: '', due_date: '', lines: [] });
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '', address: '', type: 'b2c' });
  const [payForm, setPayForm] = useState({ box_id: '', amount: '', payment_method: 'cash', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [o, i, d, c, s, b] = await Promise.all([
      fetch('/api/erp/orders').then(r => r.json()),
      fetch('/api/erp/invoices').then(r => r.json()),
      fetch('/api/erp/delivery').then(r => r.json()),
      fetch('/api/erp/clients').then(r => r.json()),
      fetch('/api/erp/stock/items').then(r => r.json()),
      fetch('/api/erp/cash/boxes').then(r => r.json()),
    ]);
    setOrders(Array.isArray(o) ? o : []);
    setInvoices(Array.isArray(i) ? i : []);
    setDeliveries(Array.isArray(d) ? d : []);
    setClients(Array.isArray(c) ? c : []);
    setStockItems(Array.isArray(s) ? s : []);
    setCashBoxes(Array.isArray(b) ? b : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function addOrderLine() {
    setOrderForm(f => ({ ...f, lines: [...f.lines, { item_id: '', qty: 1, unit_price: 0 }] }));
  }
  function addInvoiceLine() {
    setInvoiceForm(f => ({ ...f, lines: [...f.lines, { item_id: '', description: '', qty: 1, unit_price: 0 }] }));
  }

  async function submitOrder(e) {
    e.preventDefault();
    if (!orderForm.lines.length) return alert('Add at least one line');
    await fetch('/api/erp/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderForm) });
    setShowNewOrder(false);
    setOrderForm({ client_id: '', notes: '', lines: [] });
    load();
  }

  async function submitInvoice(e) {
    e.preventDefault();
    if (!invoiceForm.lines.length) return alert('Add at least one line');
    await fetch('/api/erp/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoiceForm) });
    setShowNewInvoice(false);
    setInvoiceForm({ client_id: '', notes: '', due_date: '', lines: [] });
    load();
  }

  async function submitClient(e) {
    e.preventDefault();
    await fetch('/api/erp/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clientForm) });
    setShowNewClient(false);
    setClientForm({ name: '', phone: '', email: '', address: '', type: 'b2c' });
    load();
  }

  async function confirmOrder(id) {
    const r = await fetch(`/api/erp/orders/${id}/confirm`, { method: 'POST' });
    const d = await r.json();
    if (!r.ok) return alert(d.error);
    load();
  }

  async function cancelOrder(id) {
    if (!confirm('Cancel this order?')) return;
    await fetch(`/api/erp/orders/${id}/cancel`, { method: 'POST' });
    load();
  }

  async function payInvoice(e) {
    e.preventDefault();
    const r = await fetch(`/api/erp/invoices/${showPayModal}/pay`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payForm)
    });
    const d = await r.json();
    if (!r.ok) return alert(d.error);
    setShowPayModal(null);
    setPayForm({ box_id: '', amount: '', payment_method: 'cash', note: '' });
    load();
  }

  async function createBL(order) {
    if (!confirm(`Create Delivery Note for ${order.doc_number}?`)) return;
    const r = await fetch(`/api/erp/orders/${order.id}`).then(r => r.json());
    const lines = r.lines.map(l => ({ item_id: l.item_id, qty_ordered: l.qty, qty_delivered: l.qty }));
    await fetch('/api/erp/delivery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: order.client_id, order_id: order.id, lines })
    });
    load();
  }

  async function dispatchBL(id) {
    const r = await fetch(`/api/erp/delivery/${id}/dispatch`, { method: 'POST' });
    const d = await r.json();
    if (!r.ok) return alert(d.error);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiFileText className="text-cyan-400" />
          <span className="text-sm font-black text-white uppercase tracking-widest">Commercial & Invoicing</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewClient(v => !v)} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 rounded-lg">+ Client</button>
          {tab === 'orders' && <button onClick={() => setShowNewOrder(v => !v)} className="flex items-center gap-1.5 text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-3 py-1.5 rounded-lg"><FiPlus /> New Order</button>}
          {tab === 'invoices' && <button onClick={() => setShowNewInvoice(v => !v)} className="flex items-center gap-1.5 text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-3 py-1.5 rounded-lg"><FiPlus /> New Invoice</button>}
          <button onClick={load} className="p-1.5 text-slate-500 hover:text-white border border-slate-700 rounded-lg"><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-800">
        {[['orders','Orders'],['invoices','Invoices'],['delivery','Delivery'],['clients','Clients']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`text-xs px-4 py-2 font-black uppercase tracking-widest transition-colors ${tab===key ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>{label}</button>
        ))}
      </div>

      {showNewClient && (
        <form onSubmit={submitClient} className="bg-slate-900 border border-slate-700 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-1">New Client</div>
          {[['Name','name'],['Phone','phone'],['Email','email'],['Address','address']].map(([label,key]) => (
            <div key={key}>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">{label}</label>
              <input value={clientForm[key]} onChange={e => setClientForm(f => ({...f,[key]:e.target.value}))} required={key==='name'}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Type</label>
            <select value={clientForm.type} onChange={e => setClientForm(f => ({...f,type:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
              <option value="b2c">B2C</option><option value="b2b">B2B</option><option value="franchise">Franchise</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-cyan-400 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Save</button>
            <button type="button" onClick={() => setShowNewClient(false)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {tab === 'orders' && (
        <>
          {showNewOrder && (
            <form onSubmit={submitOrder} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">New Order</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Client</label>
                  <select value={orderForm.client_id} onChange={e => setOrderForm(f => ({...f,client_id:e.target.value}))} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                    <option value="">Select client…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Notes</label>
                  <input value={orderForm.notes} onChange={e => setOrderForm(f => ({...f,notes:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Lines</div>
                {orderForm.lines.map((line, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={line.item_id} onChange={e => setOrderForm(f => { const lines=[...f.lines]; lines[i]={...lines[i],item_id:e.target.value}; return {...f,lines}; })} required
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                      <option value="">Select item…</option>
                      {stockItems.filter(s=>s.category==='finished').map(s => <option key={s.id} value={s.id}>{s.name} ({fmt(s.qty_on_hand)} {s.unit})</option>)}
                    </select>
                    <input type="number" placeholder="Qty" step="0.01" value={line.qty} onChange={e => setOrderForm(f => { const lines=[...f.lines]; lines[i]={...lines[i],qty:e.target.value}; return {...f,lines}; })} required
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                    <input type="number" placeholder="Price" step="0.01" value={line.unit_price} onChange={e => setOrderForm(f => { const lines=[...f.lines]; lines[i]={...lines[i],unit_price:e.target.value}; return {...f,lines}; })} required
                      className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                    <button type="button" onClick={() => setOrderForm(f => ({...f,lines:f.lines.filter((_,j)=>j!==i)}))} className="text-red-500 hover:text-red-300">×</button>
                  </div>
                ))}
                <button type="button" onClick={addOrderLine} className="text-xs text-cyan-400 hover:text-cyan-300">+ Add line</button>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-cyan-400 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Create Order</button>
                <button type="button" onClick={() => setShowNewOrder(false)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
              </div>
            </form>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['Number','Client','Total','Status','Date','Actions'].map(h => (
                  <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-widest pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-2 pr-3 font-mono text-cyan-400">{o.doc_number}</td>
                  <td className="py-2 pr-3 text-white">{o.client_name}</td>
                  <td className="py-2 pr-3 font-mono">{fmt(o.total_amount)} DA</td>
                  <td className="py-2 pr-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${statusColor(o.status)}`}>{o.status}</span></td>
                  <td className="py-2 pr-3 text-slate-500">{new Date(o.created_at).toLocaleDateString('fr-DZ')}</td>
                  <td className="py-2 flex gap-1">
                    {o.status === 'draft' && <button onClick={() => confirmOrder(o.id)} className="text-[10px] bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 px-2 py-0.5 rounded">Confirm</button>}
                    {o.status === 'confirmed' && <button onClick={() => createBL(o)} className="text-[10px] bg-orange-500/20 text-orange-400 hover:bg-orange-500/40 px-2 py-0.5 rounded">BL</button>}
                    {['draft','confirmed'].includes(o.status) && <button onClick={() => cancelOrder(o.id)} className="text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/40 px-2 py-0.5 rounded">Cancel</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === 'invoices' && (
        <>
          {showNewInvoice && (
            <form onSubmit={submitInvoice} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">New Invoice</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Client</label>
                  <select value={invoiceForm.client_id} onChange={e => setInvoiceForm(f => ({...f,client_id:e.target.value}))} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                    <option value="">Select client…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Due Date</label>
                  <input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm(f => ({...f,due_date:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Notes</label>
                  <input value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({...f,notes:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Lines</div>
                {invoiceForm.lines.map((line, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input placeholder="Description" value={line.description} onChange={e => setInvoiceForm(f => { const lines=[...f.lines]; lines[i]={...lines[i],description:e.target.value}; return {...f,lines}; })}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                    <input type="number" placeholder="Qty" step="0.01" value={line.qty} onChange={e => setInvoiceForm(f => { const lines=[...f.lines]; lines[i]={...lines[i],qty:e.target.value}; return {...f,lines}; })} required
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                    <input type="number" placeholder="Price" step="0.01" value={line.unit_price} onChange={e => setInvoiceForm(f => { const lines=[...f.lines]; lines[i]={...lines[i],unit_price:e.target.value}; return {...f,lines}; })} required
                      className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                    <button type="button" onClick={() => setInvoiceForm(f => ({...f,lines:f.lines.filter((_,j)=>j!==i)}))} className="text-red-500 hover:text-red-300">×</button>
                  </div>
                ))}
                <button type="button" onClick={addInvoiceLine} className="text-xs text-cyan-400 hover:text-cyan-300">+ Add line</button>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-cyan-400 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg">Generate Invoice</button>
                <button type="button" onClick={() => setShowNewInvoice(false)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
              </div>
            </form>
          )}

          {showPayModal && (
            <form onSubmit={payInvoice} className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 space-y-3">
              <div className="text-xs font-black text-cyan-400 uppercase tracking-widest">Register Payment</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Cash Box</label>
                  <select value={payForm.box_id} onChange={e => setPayForm(f => ({...f,box_id:e.target.value}))} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                    <option value="">Select box…</option>
                    {cashBoxes.map(b => <option key={b.id} value={b.id}>{b.name} ({fmt(b.balance)} DA)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Amount (DA)</label>
                  <input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({...f,amount:e.target.value}))} required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Method</label>
                  <select value={payForm.payment_method} onChange={e => setPayForm(f => ({...f,payment_method:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500">
                    <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Note</label>
                  <input value={payForm.note} onChange={e => setPayForm(f => ({...f,note:e.target.value}))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-500 hover:bg-green-400 text-white text-xs font-black px-4 py-1.5 rounded-lg">Confirm Payment</button>
                <button type="button" onClick={() => setShowPayModal(null)} className="text-slate-400 text-xs px-4 py-1.5 border border-slate-700 rounded-lg">Cancel</button>
              </div>
            </form>
          )}

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['Number','Client','Total','Status','Due','Actions'].map(h => (
                  <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-widest pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-2 pr-3 font-mono text-cyan-400">{inv.doc_number}</td>
                  <td className="py-2 pr-3 text-white">{inv.client_name}</td>
                  <td className="py-2 pr-3 font-mono">{fmt(inv.total_amount)} DA</td>
                  <td className="py-2 pr-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${statusColor(inv.status)}`}>{inv.status}</span></td>
                  <td className="py-2 pr-3 text-slate-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-DZ') : '—'}</td>
                  <td className="py-2">
                    {inv.status === 'pending' && <button onClick={() => { setShowPayModal(inv.id); setPayForm(f => ({...f,amount:inv.total_amount})); }} className="text-[10px] bg-green-500/20 text-green-400 hover:bg-green-500/40 px-2 py-0.5 rounded">Pay</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === 'delivery' && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              {['BL Number','Client','Status','Date','Actions'].map(h => (
                <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-widest pb-2 pr-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliveries.map(d => (
              <tr key={d.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="py-2 pr-3 font-mono text-cyan-400">{d.doc_number}</td>
                <td className="py-2 pr-3 text-white">{d.client_name}</td>
                <td className="py-2 pr-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${statusColor(d.status)}`}>{d.status}</span></td>
                <td className="py-2 pr-3 text-slate-500">{new Date(d.created_at).toLocaleDateString('fr-DZ')}</td>
                <td className="py-2">
                  {d.status === 'draft' && <button onClick={() => dispatchBL(d.id)} className="text-[10px] bg-orange-500/20 text-orange-400 hover:bg-orange-500/40 px-2 py-0.5 rounded">Dispatch</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'clients' && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              {['Name','Phone','Email','Type','Since'].map(h => (
                <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-widest pb-2 pr-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="py-2 pr-3 text-white">{c.name}</td>
                <td className="py-2 pr-3 text-slate-300">{c.phone}</td>
                <td className="py-2 pr-3 text-slate-400">{c.email}</td>
                <td className="py-2 pr-3"><span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.5 rounded uppercase">{c.type}</span></td>
                <td className="py-2 pr-3 text-slate-500">{new Date(c.created_at).toLocaleDateString('fr-DZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
