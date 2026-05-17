import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import EnterpriseTerms from './EnterpriseTerms.jsx';
import ContractManager from './ContractManager.jsx';
import { FiBriefcase, FiFileText, FiShoppingCart, FiUsers, FiBarChart2, FiLogOut, FiShield } from 'react-icons/fi';

const TABS = [
  { id: 'contracts', label: 'Contrats',    Icon: FiFileText },
  { id: 'orders',    label: 'Commandes',   Icon: FiShoppingCart },
  { id: 'partners',  label: 'Partenaires', Icon: FiUsers },
  { id: 'reports',   label: 'Rapports',    Icon: FiBarChart2 },
  { id: 'terms',     label: 'Conditions',  Icon: FiShield },
];

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

const Placeholder = ({ label }) => (
  <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500">
    <p className="font-semibold">{label}</p>
    <p className="text-xs mt-1">Module en cours d'intégration.</p>
  </div>
);

const B2BPortal = () => {
  const [user, setUser]           = useState(undefined);
  const [tab, setTab]             = useState('contracts');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [checkingTerms, setCheckingTerms] = useState(true);

  useEffect(() => {
    fetch('/api/auth/verify').then(r=>r.json()).then(d=>{ const u = d.authenticated ? d.user : null; if (!u) { window.location.href='/admin/login'; return; }
      setUser(u);
      if (u === null) window.location.replace('/admin/login');
    });
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'b2b_users', user.uid)).then((snap) => {
      setTermsAccepted(snap.exists() && snap.data().termsAccepted === true);
      setCheckingTerms(false);
    });
  }, [user?.uid]);

  const acceptTerms = async () => {
    await setDoc(doc(db, 'b2b_users', user.uid), {
      termsAccepted: true,
      acceptedAt: serverTimestamp(),
      email: user.email,
    }, { merge: true });
    setTermsAccepted(true);
  };

  if (user === undefined || checkingTerms) return <Spinner />;

  if (!termsAccepted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <FiBriefcase className="text-cyan-400 text-2xl" />
            <div>
              <h1 className="text-2xl font-extrabold text-white">CINQD B2B — Portail Entreprise</h1>
              <p className="text-slate-400 text-sm">Veuillez lire et accepter les conditions avant d'accéder au portail.</p>
            </div>
          </div>
          <EnterpriseTerms onAccept={acceptTerms} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans">
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <FiBriefcase className="text-cyan-400" />
            <p className="text-white font-extrabold text-sm">CINQD B2B</p>
          </div>
          <p className="text-slate-500 text-xs truncate">{user.email}</p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                tab === id
                  ? 'bg-cyan-800/40 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="text-base flex-shrink-0" /> {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => fetch('/api/auth/logout',{method:'POST'}).then(()=>{window.location.href='/admin/login';})}
            className="w-full flex items-center gap-2 text-slate-500 hover:text-red-400 text-xs px-3 py-2 rounded-lg transition-colors"
          >
            <FiLogOut /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto min-w-0">
        {tab === 'contracts' && <ContractManager uid={user.uid} />}
        {tab === 'orders'    && <Placeholder label="Gestionnaire de Commandes B2B" />}
        {tab === 'partners'  && <Placeholder label="Annuaire Partenaires" />}
        {tab === 'reports'   && <Placeholder label="Rapports & Analytiques B2B" />}
        {tab === 'terms'     && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Conditions Générales de Vente</h2>
            <EnterpriseTerms />
          </div>
        )}
      </main>
    </div>
  );
};

export default B2BPortal;
