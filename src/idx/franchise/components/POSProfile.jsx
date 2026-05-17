import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, serverTimestamp,
  query, orderBy, doc, updateDoc, increment,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { FiShoppingCart, FiPlus, FiTrash2, FiPrinter, FiDollarSign } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';

// Tunisia TVA rates
const TVA_RATES = { '19%': 0.19, '7%': 0.07, 'Exonéré': 0 };

const POSProfile = ({ franchiseId }) => {
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart]       = useState([]);
  const [sales, setSales]     = useState([]);
  const [tvaRate, setTvaRate] = useState('19%');
  const [method, setMethod]   = useState('cash');
  const [adding, setAdding]   = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });

  const col = `franchises/${franchiseId}`;

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, col, 'catalog'), orderBy('name')),
      (s) => setCatalog(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(query(collection(db, col, 'sales'), orderBy('createdAt', 'desc')),
      (s) => setSales(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [franchiseId]);

  const addToCart = (item) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((c) => c.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tva      = subtotal * (TVA_RATES[tvaRate] ?? 0);
  const total    = subtotal + tva;

  const checkout = async () => {
    if (cart.length === 0) return;
    const saleRef = await addDoc(collection(db, col, 'sales'), {
      items: cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
      subtotal, tva, total, tvaRate, method,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'franchises', franchiseId), {
      totalRevenue: increment(total),
      totalSales: increment(1),
    });
    toast.success(`Vente enregistrée — ${total.toFixed(3)} TND`);
    setCart([]);
  };

  const addCatalogItem = async () => {
    if (!newItem.name || !newItem.price) return;
    await addDoc(collection(db, col, 'catalog'), {
      ...newItem,
      price: Number(newItem.price),
      createdAt: serverTimestamp(),
    });
    setNewItem({ name: '', price: '', category: '' });
    setAdding(false);
  };

  const todaySales = sales.filter((s) => {
    if (!s.createdAt?.toDate) return false;
    const d = s.createdAt.toDate();
    const n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  const todayRevenue = todaySales.reduce((s, x) => s + (x.total ?? 0), 0);

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">CA Aujourd'hui</p>
          <p className="text-green-400 text-2xl font-extrabold mt-1">{todayRevenue.toFixed(3)} TND</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">Transactions Aujourd'hui</p>
          <p className="text-white text-2xl font-extrabold mt-1">{todaySales.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Catalog */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm">Catalogue</h4>
            <button onClick={() => setAdding(!adding)} className="text-xs bg-cyan-700 hover:bg-cyan-600 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">
              <FiPlus /> Article
            </button>
          </div>

          {adding && (
            <div className="bg-slate-700 rounded-xl p-3 space-y-2">
              {[['name', 'Nom'], ['price', 'Prix (TND)'], ['category', 'Catégorie']].map(([f, l]) => (
                <div key={f}>
                  <label className="text-xs text-slate-400">{l}</label>
                  <input
                    type={f === 'price' ? 'number' : 'text'}
                    value={newItem[f]}
                    onChange={(e) => setNewItem((p) => ({ ...p, [f]: e.target.value }))}
                    className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={addCatalogItem} className="bg-cyan-600 text-white text-xs px-3 py-1.5 rounded-lg">Ajouter</button>
                <button onClick={() => setAdding(false)} className="bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg">Annuler</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {catalog.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-slate-700 hover:bg-slate-600 rounded-xl p-3 text-left transition-colors"
              >
                <p className="text-white text-xs font-semibold truncate">{item.name}</p>
                {item.category && <p className="text-slate-500 text-xs">{item.category}</p>}
                <p className="text-cyan-400 font-bold text-sm mt-1">{Number(item.price).toFixed(3)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <FiShoppingCart className="text-cyan-400" /> Panier ({cart.length} articles)
          </h4>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {cart.length === 0 && <p className="text-slate-500 text-sm py-4 text-center">Sélectionnez des articles.</p>}
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300 truncate flex-1">{item.name} × {item.qty}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-white font-bold">{(item.price * item.qty).toFixed(3)}</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 pt-3 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Sous-total HT</span><span>{subtotal.toFixed(3)} TND</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex-shrink-0">TVA</span>
              <select
                value={tvaRate}
                onChange={(e) => setTvaRate(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              >
                {Object.keys(TVA_RATES).map((r) => <option key={r}>{r}</option>)}
              </select>
              <span className="text-xs text-slate-400">{tva.toFixed(3)} TND</span>
            </div>
            <div className="flex justify-between font-bold text-white">
              <span>Total TTC</span><span className="text-cyan-400">{total.toFixed(3)} TND</span>
            </div>

            <div className="flex gap-2">
              {['cash', 'card', 'transfer'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-colors border ${
                    method === m ? 'bg-cyan-700 border-cyan-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {m === 'cash' ? 'Espèces' : m === 'card' ? 'Carte' : 'Virement'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-sm"
          >
            <FiDollarSign /> Encaisser {total.toFixed(3)} TND
          </button>
        </div>
      </div>

      {/* Recent sales */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h4 className="font-bold text-white text-sm mb-3">Ventes récentes</h4>
        {sales.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Aucune vente enregistrée.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sales.slice(0, 20).map((s) => (
              <div key={s.id} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0 text-sm">
                <div>
                  <p className="text-slate-300">{s.items?.map((i) => `${i.name}×${i.qty}`).join(', ').slice(0, 40)}</p>
                  <p className="text-slate-500 text-xs">{s.method} · {s.tvaRate}</p>
                </div>
                <span className="text-green-400 font-bold flex-shrink-0">{Number(s.total).toFixed(3)} TND</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSProfile;
