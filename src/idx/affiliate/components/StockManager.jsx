import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { FiPackage, FiPlus, FiAlertTriangle, FiMinus } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';

const INIT = { name: '', sku: '', qty: '', unitPrice: '', pointValue: '' };

const StockManager = ({ uid }) => {
  const [stock, setStock] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(INIT);

  useEffect(() => {
    const q = query(collection(db, 'affiliates', uid, 'stock'), orderBy('name'));
    return onSnapshot(q, (snap) => setStock(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [uid]);

  const addItem = async () => {
    if (!form.name.trim() || !form.qty) return;
    await addDoc(collection(db, 'affiliates', uid, 'stock'), {
      name: form.name.trim(),
      sku: form.sku.trim(),
      qty: Math.max(0, Number(form.qty)),
      unitPrice: Number(form.unitPrice) || 0,
      pointValue: Number(form.pointValue) || 1,
      createdAt: serverTimestamp(),
    });
    toast.success('Article ajouté');
    setForm(INIT);
    setAdding(false);
  };

  const adjustQty = async (id, delta) => {
    const item = stock.find((s) => s.id === id);
    if (!item) return;
    const next = Math.max(0, (item.qty ?? 0) + delta);
    await updateDoc(doc(db, 'affiliates', uid, 'stock', id), { qty: next });
  };

  const f = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2 text-lg">
          <FiPackage className="text-cyan-400" /> Gestion du Stock
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          <FiPlus /> Ajouter article
        </button>
      </div>

      {adding && (
        <div className="bg-slate-700 border border-slate-600 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['name',       'Nom du produit *'],
              ['sku',        'Code / SKU'],
              ['qty',        'Quantité initiale *'],
              ['unitPrice',  'Prix unitaire (TND)'],
              ['pointValue', 'Valeur points'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  type={['qty', 'unitPrice', 'pointValue'].includes(field) ? 'number' : 'text'}
                  min="0"
                  value={form[field]}
                  onChange={f(field)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={addItem} className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">Ajouter</button>
            <button onClick={() => setAdding(false)} className="bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm px-4 py-1.5 rounded-lg transition-colors">Annuler</button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Produit</th>
              <th className="text-left px-4 py-3">SKU</th>
              <th className="text-right px-4 py-3">Stock</th>
              <th className="text-right px-4 py-3">Prix</th>
              <th className="text-right px-4 py-3">Points</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {stock.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Aucun article en stock.</td></tr>
            )}
            {stock.map((item) => (
              <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.sku || '—'}</td>
                <td className={`px-4 py-3 text-right font-bold ${item.qty <= 5 ? 'text-red-400' : 'text-white'}`}>
                  <span className="flex items-center justify-end gap-1">
                    {item.qty} {item.qty <= 5 && <FiAlertTriangle className="text-xs" />}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-300">{Number(item.unitPrice).toFixed(3)}</td>
                <td className="px-4 py-3 text-right text-yellow-400">{item.pointValue} pts</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => adjustQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"><FiMinus className="text-xs" /></button>
                    <button onClick={() => adjustQty(item.id,  1)} className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"><FiPlus  className="text-xs" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockManager;
