import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import POSProfile from './POSProfile.jsx';
import MicroFactoryProfile from './MicroFactoryProfile.jsx';
import { FiShoppingCart, FiCpu, FiMapPin, FiLogOut, FiChevronRight } from 'react-icons/fi';

const PROFILE_TYPES = {
  pos:     { label: 'Point de Vente (POS)',           Icon: FiShoppingCart, color: 'cyan',   description: 'Caisse, catalogue, encaissement TVA' },
  factory: { label: 'Micro-Unité de Production',      Icon: FiCpu,          color: 'purple', description: 'Ordres de production, matières premières, pertes' },
};

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

const FranchiseHub = () => {
  const [user, setUser]           = useState(undefined);
  const [franchises, setFranchises] = useState([]);
  const [selected, setSelected]   = useState(null);  // { id, profileType }

  useEffect(() => {
    fetch('/api/auth/verify').then(r=>r.json()).then(d=>{ const u = d.authenticated ? d.user : null; if (!u) { window.location.href='/admin/login'; return; }
      setUser(u);
      if (u === null) window.location.replace('/admin/login');
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'franchises'), orderBy('name'));
    return onSnapshot(q, (snap) => setFranchises(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  if (user === undefined) return <Spinner />;

  if (selected) {
    const franchise = franchises.find((f) => f.id === selected.id);
    const ProfileComponent = selected.profileType === 'pos' ? POSProfile : MicroFactoryProfile;
    const { Icon, label } = PROFILE_TYPES[selected.profileType];

    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelected(null)}
              className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
            >
              ← Franchises
            </button>
            <span className="text-slate-700">/</span>
            <div className="flex items-center gap-2">
              <Icon className={`text-${selected.profileType === 'pos' ? 'cyan' : 'purple'}-400`} />
              <span className="font-bold text-white text-sm">{franchise?.name ?? 'Franchise'}</span>
              <span className="text-xs text-slate-500">· {label}</span>
            </div>
          </div>
          <button onClick={() => fetch('/api/auth/logout',{method:'POST'}).then(()=>{window.location.href='/admin/login';})} className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors">
            <FiLogOut /> Déconnexion
          </button>
        </header>
        <main className="p-6 max-w-5xl mx-auto">
          <ProfileComponent franchiseId={selected.id} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Réseau Franchise CINQD</h1>
            <p className="text-slate-400 mt-1 text-sm">Déployez et gérez vos points de vente et micro-usines.</p>
          </div>
          <button onClick={() => fetch('/api/auth/logout',{method:'POST'}).then(()=>{window.location.href='/admin/login';})} className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors">
            <FiLogOut /> Déconnexion
          </button>
        </div>

        {franchises.length === 0 ? (
          <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500">
            <FiMapPin className="mx-auto text-4xl mb-3 opacity-40" />
            <p className="font-semibold">Aucune franchise configurée.</p>
            <p className="text-xs mt-1">Créez des documents dans la collection Firestore <span className="font-mono">franchises/</span>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {franchises.map((f) => (
              <div key={f.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-bold">{f.name}</h3>
                    <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                      <FiMapPin className="text-xs" /> {f.region ?? 'Région non définie'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    f.status === 'active'
                      ? 'bg-green-900/40 text-green-400 border-green-800'
                      : 'bg-slate-700 text-slate-400 border-slate-600'
                  }`}>
                    {f.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PROFILE_TYPES).map(([key, { label, Icon, color, description }]) => (
                    <button
                      key={key}
                      onClick={() => setSelected({ id: f.id, profileType: key })}
                      className={`bg-slate-700 hover:bg-${color}-900/30 border border-slate-600 hover:border-${color}-800 rounded-xl p-3 text-left transition-all group`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className={`text-${color}-400 text-lg`} />
                        <FiChevronRight className="text-slate-500 group-hover:text-white transition-colors text-xs" />
                      </div>
                      <p className="text-white text-xs font-semibold leading-tight">{label}</p>
                      <p className="text-slate-500 text-xs mt-1 leading-tight">{description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FranchiseHub;
