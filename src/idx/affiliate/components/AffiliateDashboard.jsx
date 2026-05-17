import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAffiliate } from '../hooks/useAffiliate';
import { useWallet } from '../hooks/useWallet';
import TierBadge from './TierBadge.jsx';
import WalletPanel from './WalletPanel.jsx';
import StockManager from './StockManager.jsx';
import CustomerList from './CustomerList.jsx';
import OrderOutbound from './OrderOutbound.jsx';
import OrderInbound from './OrderInbound.jsx';
import ReferralPanel from './ReferralPanel.jsx';
import PenaltyLog from './PenaltyLog.jsx';
import PointsTracker from './PointsTracker.jsx';
import AffiliateChat from './AffiliateChat.jsx';
import {
  FiHome, FiDollarSign, FiPackage, FiUsers,
  FiSend, FiInbox, FiShare2, FiAlertTriangle,
  FiStar, FiMessageCircle, FiLogOut,
} from 'react-icons/fi';

const TABS = [
  { id: 'home',      label: 'Accueil',    Icon: FiHome },
  { id: 'wallet',    label: 'Wallet',     Icon: FiDollarSign },
  { id: 'stock',     label: 'Stock',      Icon: FiPackage },
  { id: 'customers', label: 'Clients',    Icon: FiUsers },
  { id: 'outbound',  label: 'Sortantes',  Icon: FiSend },
  { id: 'inbound',   label: 'Entrantes',  Icon: FiInbox },
  { id: 'referral',  label: 'Parrainage', Icon: FiShare2 },
  { id: 'penalties', label: 'Pénalités',  Icon: FiAlertTriangle },
  { id: 'points',    label: 'Points',     Icon: FiStar },
  { id: 'chat',      label: 'Chat',       Icon: FiMessageCircle },
];

const Spinner = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

const AffiliateDashboard = () => {
  const [user, setUser]       = useState(undefined);
  const [tab, setTab]         = useState('home');
  const [penalties, setPenalties] = useState([]);
  const [pointsLog, setPointsLog] = useState([]);

  useEffect(() => {
    fetch('/api/auth/verify').then(r=>r.json()).then(d=>{ const u = d.authenticated ? d.user : null; if (!u) { window.location.href='/admin/login'; return; }
      setUser(u);
      if (u === null) window.location.replace('/admin/login');
    });
  }, []);

  const uid = user?.uid;
  const { affiliate, loading } = useAffiliate(uid);
  const { balance, transactions } = useWallet(uid);

  useEffect(() => {
    if (!uid) return;
    const u1 = onSnapshot(collection(db, 'affiliates', uid, 'penalties'),
      (s) => setPenalties(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, 'affiliates', uid, 'points'),
      (s) => setPointsLog(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [uid]);

  if (user === undefined || loading) return <Spinner />;

  if (!affiliate) return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-xl font-bold text-white">Profil affilié introuvable</p>
        <p className="text-slate-400 mt-2 text-sm">Contactez l'administrateur pour activer votre compte affilié.</p>
      </div>
    </div>
  );

  if (affiliate.status === 'churned') return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center max-w-sm bg-red-900/20 border border-red-800 rounded-2xl p-8">
        <FiAlertTriangle className="text-red-400 text-4xl mx-auto mb-3" />
        <p className="text-2xl font-bold text-white">Compte désactivé</p>
        <p className="text-slate-400 mt-2 text-sm">
          Inactivité détectée sur 2 mois consécutifs. Veuillez contacter le support CINQD pour réactiver votre compte.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800">
          <p className="text-white font-extrabold text-sm tracking-wide">CINQD Affiliate</p>
          <p className="text-slate-500 text-xs mt-0.5 truncate">{affiliate.name ?? user.email}</p>
          <div className="mt-2.5">
            <TierBadge tier={affiliate.tier ?? 'NO_COMMITMENT'} />
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
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

      {/* Content */}
      <main className="flex-1 p-6 overflow-y-auto min-w-0">
        {tab === 'home' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Bonjour, {affiliate.name ?? 'Affilié'}</h1>
              <p className="text-slate-400 text-sm mt-1">Tableau de bord Affilié CINQD · Espace personnel</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-cyan-900/40 to-slate-800 border border-cyan-800/40 rounded-2xl p-5">
                <p className="text-slate-400 text-xs">Solde Wallet</p>
                <p className="text-cyan-400 text-3xl font-extrabold mt-1">{balance.toFixed(3)} TND</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs mb-2">Niveau</p>
                <TierBadge tier={affiliate.tier ?? 'NO_COMMITMENT'} size="lg" />
              </div>
              <div className="bg-gradient-to-br from-yellow-900/30 to-slate-800 border border-yellow-800/30 rounded-2xl p-5">
                <p className="text-slate-400 text-xs">Points disponibles</p>
                <p className="text-yellow-400 text-3xl font-extrabold mt-1">{affiliate.points ?? 0} pts</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'wallet'    && <WalletPanel balance={balance} transactions={transactions} />}
        {tab === 'stock'     && <StockManager uid={uid} />}
        {tab === 'customers' && <CustomerList uid={uid} />}
        {tab === 'outbound'  && <OrderOutbound uid={uid} />}
        {tab === 'inbound'   && <OrderInbound uid={uid} />}
        {tab === 'referral'  && (
          <ReferralPanel
            affiliateId={uid}
            referrals={affiliate.referrals ?? []}
            referralEarnings={affiliate.referralEarnings ?? 0}
          />
        )}
        {tab === 'penalties' && <PenaltyLog penalties={penalties} />}
        {tab === 'points'    && <PointsTracker uid={uid} points={affiliate.points ?? 0} pointsLog={pointsLog} />}
        {tab === 'chat'      && <AffiliateChat uid={uid} displayName={affiliate.name} />}
      </main>
    </div>
  );
};

export default AffiliateDashboard;
