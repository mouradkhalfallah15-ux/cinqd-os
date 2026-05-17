import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { FiCpu, FiPackage, FiAlertTriangle, FiPlus, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';

const STATUS_STYLES = {
  pending:    'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  in_progress:'bg-blue-900/40  text-blue-300  border-blue-700',
  completed:  'bg-green-900/40 text-green-300 border-green-700',
  failed:     'bg-red-900/40   text-red-300   border-red-700',
};
const STATUS_LABELS = { pending: 'Planifié', in_progress: 'En cours', completed: 'Terminé', failed: 'Échoué' };

const INIT_ORDER = { product: '', quantity: '', unit: 'kg', recipe: '', notes: '' };

const MicroFactoryProfile = ({ franchiseId }) => {
  const [orders, setOrders]       = useState([]);
  const [rawMaterials, setRaw]    = useState([]);
  const [losses, setLosses]       = useState([]);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState(INIT_ORDER);
  const [lossForm, setLossForm]   = useState({ material: '', qty: '', reason: '' });
  const [addingLoss, setAddingLoss] = useState(false);

  const col = `franchises/${franchiseId}`;

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, col, 'production_orders'), orderBy('createdAt', 'desc')),
      (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(query(collection(db, col, 'raw_materials'), orderBy('name')),
      (s) => setRaw(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, col, 'production_losses'), orderBy('createdAt', 'desc')),
      (s) => setLosses(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, [franchiseId]);

  const createOrder = async () => {
    if (!form.product || !form.quantity) return;
    await addDoc(collection(db, col, 'production_orders'), {
      ...form,
      quantity: Number(form.quantity),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    toast.success('Ordre de production créé');
    setForm(INIT_ORDER);
    setCreating(false);
  };

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, col, 'production_orders', id), { status, updatedAt: serverTimestamp() });
    toast.success(`Statut mis à jour: ${STATUS_LABELS[status]}`);
  };

  const logLoss = async () => {
    if (!lossForm.material || !lossForm.qty) return;
    await addDoc(collection(db, col, 'production_losses'), {
      ...lossForm,
      qty: Number(lossForm.qty),
      createdAt: serverTimestamp(),
    });
    toast.success('Perte enregistrée');
    setLossForm({ material: '', qty: '', reason: '' });
    setAddingLoss(false);
  };

  const active = orders.filter((o) => o.status === 'in_progress').length;
  const totalLoss = losses.reduce((s, l) => s + (l.qty ?? 0), 0);

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">En production</p>
          <p className="text-blue-400 text-2xl font-extrabold mt-1">{active}</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">Terminés</p>
          <p className="text-green-400 text-2xl font-extrabold mt-1">{orders.filter((o) => o.status === 'completed').length}</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">Pertes totales</p>
          <p className="text-red-400 text-2xl font-extrabold mt-1">{totalLoss}</p>
        </div>
      </div>

      {/* Production orders */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white flex items-center gap-2">
            <FiCpu className="text-cyan-400" /> Ordres de Production
          </h4>
          <button onClick={() => setCreating(!creating)} className="text-xs bg-cyan-700 hover:bg-cyan-600 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
            <FiPlus /> Créer
          </button>
        </div>

        {creating && (
          <div className="bg-slate-700 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {[['product', 'Produit fini'], ['quantity', 'Quantité'], ['unit', 'Unité'], ['recipe', 'Recette']].map(([field, label]) => (
                <div key={field}>
                  <label className="text-xs text-slate-400">{label}</label>
                  <input value={form[field]} onChange={f(field)}
                    className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" />
                </div>
              ))}
            </div>
            <textarea value={form.notes} onChange={f('notes')} placeholder="Notes..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none resize-none" rows={2} />
            <div className="flex gap-2">
              <button onClick={createOrder} className="bg-cyan-600 text-white text-xs px-3 py-1.5 rounded-lg">Créer</button>
              <button onClick={() => setCreating(false)} className="bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg">Annuler</button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {orders.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Aucun ordre de production.</p>}
          {orders.map((o) => (
            <div key={o.id} className="bg-slate-700/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">{o.product}</p>
                  <p className="text-slate-400 text-xs">{o.quantity} {o.unit}{o.recipe ? ` · Recette: ${o.recipe}` : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[o.status] ?? STATUS_STYLES.pending}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>
              {o.status === 'pending' && (
                <button onClick={() => updateStatus(o.id, 'in_progress')}
                  className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors">
                  Démarrer
                </button>
              )}
              {o.status === 'in_progress' && (
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(o.id, 'completed')}
                    className="flex items-center gap-1 text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition-colors">
                    <FiCheckCircle /> Terminé
                  </button>
                  <button onClick={() => updateStatus(o.id, 'failed')}
                    className="flex items-center gap-1 text-xs bg-red-800 hover:bg-red-700 text-white px-3 py-1 rounded-lg transition-colors">
                    <FiXCircle /> Échoué
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Raw materials */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h4 className="font-bold text-white flex items-center gap-2 mb-3">
          <FiPackage className="text-cyan-400" /> Matières Premières
        </h4>
        {rawMaterials.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-3">Aucune matière première.</p>
        ) : (
          <div className="space-y-1.5">
            {rawMaterials.map((m) => (
              <div key={m.id} className="flex justify-between text-sm py-1.5 border-b border-slate-700/40 last:border-0">
                <span className="text-slate-300">{m.name}</span>
                <span className={`font-bold ${m.qty <= (m.minQty ?? 5) ? 'text-red-400' : 'text-white'}`}>
                  {m.qty} {m.unit ?? 'kg'} {m.qty <= (m.minQty ?? 5) && <FiAlertTriangle className="inline text-xs" />}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Losses */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-white flex items-center gap-2">
            <FiAlertTriangle className="text-red-400" /> Pertes de Production
          </h4>
          <button onClick={() => setAddingLoss(!addingLoss)} className="text-xs bg-red-800 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
            <FiPlus /> Enregistrer perte
          </button>
        </div>
        {addingLoss && (
          <div className="bg-slate-700 rounded-xl p-3 space-y-2 mb-3">
            {[['material', 'Matière/Produit'], ['qty', 'Quantité perdue'], ['reason', 'Cause']].map(([f, l]) => (
              <div key={f}>
                <label className="text-xs text-slate-400">{l}</label>
                <input value={lossForm[f]} onChange={(e) => setLossForm((p) => ({ ...p, [f]: e.target.value }))}
                  className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" />
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={logLoss} className="bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg">Enregistrer</button>
              <button onClick={() => setAddingLoss(false)} className="bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg">Annuler</button>
            </div>
          </div>
        )}
        {losses.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-3">Aucune perte enregistrée.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {losses.slice(0, 20).map((l) => (
              <div key={l.id} className="flex justify-between text-xs py-1.5 border-b border-slate-700/40 last:border-0">
                <span className="text-slate-400">{l.material} — {l.reason}</span>
                <span className="text-red-400 font-bold">-{l.qty}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MicroFactoryProfile;
