import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useOrders } from '../hooks/useOrders';
import { FiSend, FiPlus, FiTrash2 } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';

const STATUS_STYLES = {
  pending:   'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  confirmed: 'bg-blue-900/40  text-blue-300  border-blue-700',
  delivered: 'bg-green-900/40 text-green-300 border-green-700',
  failed:    'bg-red-900/40   text-red-300   border-red-700',
};
const STATUS_LABELS = { pending: 'En attente', confirmed: 'Confirmée', delivered: 'Livrée', failed: 'Échouée' };

const INIT_FORM = { customerId: '', customerName: '', items: [], notes: '' };

const OrderOutbound = ({ uid }) => {
  const { outbound, placeOutbound } = useOrders(uid);
  const [customers, setCustomers] = useState([]);
  const [stock, setStock] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(INIT_FORM);
  const [pick, setPick] = useState({ stockId: '', qty: 1 });

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'affiliates', uid, 'customers'), orderBy('name')),
      (s) => setCustomers(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(query(collection(db, 'affiliates', uid, 'stock'), orderBy('name')),
      (s) => setStock(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [uid]);

  const addItem = () => {
    const s = stock.find((x) => x.id === pick.stockId);
    if (!s || Number(pick.qty) <= 0) return;
    setForm((f) => ({
      ...f,
      items: [...f.items, { stockId: s.id, name: s.name, qty: Number(pick.qty), unitPrice: s.unitPrice }],
    }));
    setPick({ stockId: '', qty: 1 });
  };

  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    if (!form.customerName || form.items.length === 0) {
      toast.error('Sélectionnez un client et au moins un article.');
      return;
    }
    const total = form.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    await placeOutbound({ ...form, total });
    toast.success('Commande enregistrée');
    setForm(INIT_FORM);
    setCreating(false);
  };

  const orderTotal = form.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2 text-lg">
          <FiSend className="text-cyan-400" /> Commandes Sortantes
        </h3>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          <FiPlus /> Nouvelle commande
        </button>
      </div>

      {creating && (
        <div className="bg-slate-700 border border-slate-600 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Client *</label>
            <select
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              value={form.customerId}
              onChange={(e) => {
                const c = customers.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, customerId: e.target.value, customerName: c?.name ?? '' }));
              }}
            >
              <option value="">-- Sélectionner --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <select
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              value={pick.stockId}
              onChange={(e) => setPick((p) => ({ ...p, stockId: e.target.value }))}
            >
              <option value="">-- Produit --</option>
              {stock.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.qty} en stock)</option>)}
            </select>
            <input
              type="number" min="1" value={pick.qty}
              onChange={(e) => setPick((p) => ({ ...p, qty: e.target.value }))}
              className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            />
            <button onClick={addItem} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">
              <FiPlus />
            </button>
          </div>

          {form.items.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-3 space-y-1.5">
              {form.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{item.name} × {item.qty}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{(item.qty * item.unitPrice).toFixed(3)} TND</span>
                    <button onClick={() => removeItem(i)} className="text-slate-500 hover:text-red-400 transition-colors"><FiTrash2 className="text-xs" /></button>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-700 pt-1.5 flex justify-between text-sm font-bold">
                <span className="text-slate-400">Total</span>
                <span className="text-cyan-400">{orderTotal.toFixed(3)} TND</span>
              </div>
            </div>
          )}

          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Notes de livraison..."
            rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none"
          />

          <div className="flex gap-2 pt-1">
            <button onClick={submit} className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Confirmer commande</button>
            <button onClick={() => setCreating(false)} className="bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm px-4 py-2 rounded-lg transition-colors">Annuler</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {outbound.length === 0 && (
          <div className="bg-slate-800 rounded-2xl py-10 text-center text-slate-500">Aucune commande sortante.</div>
        )}
        {outbound.map((o) => (
          <div key={o.id} className="bg-slate-800 hover:bg-slate-700/40 rounded-xl px-4 py-3.5 flex items-center justify-between transition-colors">
            <div>
              <p className="text-white font-semibold text-sm">{o.customerName || 'Client inconnu'}</p>
              <p className="text-slate-500 text-xs font-mono mt-0.5">#{o.id.slice(0, 8)}</p>
              {o.notes && <p className="text-slate-400 text-xs mt-0.5 italic">{o.notes}</p>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-cyan-400 font-bold text-sm">{Number(o.total ?? 0).toFixed(3)} TND</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[o.status] ?? STATUS_STYLES.pending}`}>
                {STATUS_LABELS[o.status] ?? o.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderOutbound;
