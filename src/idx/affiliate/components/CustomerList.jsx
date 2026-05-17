import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { FiUsers, FiPlus, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';

const INIT = { name: '', phone: '', email: '', address: '' };

const CustomerList = ({ uid }) => {
  const [customers, setCustomers] = useState([]);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(INIT);

  useEffect(() => {
    const q = query(collection(db, 'affiliates', uid, 'customers'), orderBy('name'));
    return onSnapshot(q, (snap) => setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [uid]);

  const addCustomer = async () => {
    if (!form.name.trim()) return;
    await addDoc(collection(db, 'affiliates', uid, 'customers'), {
      ...form, name: form.name.trim(), createdAt: serverTimestamp(),
    });
    toast.success('Client ajouté');
    setForm(INIT);
    setAdding(false);
  };

  const filtered = search.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
    : customers;

  const f = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2 text-lg">
          <FiUsers className="text-cyan-400" /> Liste Clients ({customers.length})
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          <FiPlus /> Ajouter client
        </button>
      </div>

      {adding && (
        <div className="bg-slate-700 border border-slate-600 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['name',    'Nom complet *'],
              ['phone',   'Téléphone'],
              ['email',   'Email'],
              ['address', 'Adresse'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  value={form[field]}
                  onChange={f(field)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={addCustomer} className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">Ajouter</button>
            <button onClick={() => setAdding(false)} className="bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm px-4 py-1.5 rounded-lg transition-colors">Annuler</button>
          </div>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un client..."
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
      />

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-slate-800 rounded-2xl py-10 text-center text-slate-500">
            {search ? 'Aucun résultat.' : 'Aucun client enregistré.'}
          </div>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="bg-slate-800 hover:bg-slate-700/60 rounded-xl px-4 py-3.5 flex items-center gap-4 transition-colors">
            <div className="bg-cyan-900/40 border border-cyan-800/40 rounded-full w-10 h-10 flex items-center justify-center text-cyan-300 font-extrabold text-sm flex-shrink-0">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{c.name}</p>
              {c.address && (
                <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5 truncate">
                  <FiMapPin className="flex-shrink-0" /> {c.address}
                </p>
              )}
            </div>
            <div className="flex gap-3 text-slate-500 flex-shrink-0">
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-cyan-400 text-xs transition-colors">
                  <FiPhone /> {c.phone}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className="hover:text-cyan-400 transition-colors">
                  <FiMail />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerList;
