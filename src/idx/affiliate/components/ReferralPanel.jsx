import React, { useState } from 'react';
import { FiShare2, FiCopy, FiCheck, FiUsers, FiTrendingUp } from 'react-icons/fi';
import { REFERRAL_PCT } from '../config/defaults';

const fmt = (n) => `${Number(n ?? 0).toFixed(3)} TND`;

const ReferralPanel = ({ affiliateId, referrals = [], referralEarnings = 0 }) => {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://erp.mkd-distrib.com'}/affiliate?ref=${affiliateId}`;

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2"><FiShare2 className="text-cyan-400" /> Moteur de Parrainage</h3>
          <p className="text-slate-400 text-xs mt-1">
            {REFERRAL_PCT}% de chaque facture d'un client que vous avez référé est automatiquement crédité dans votre Wallet.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-3">
          <span className="text-xs text-slate-400 font-mono flex-1 truncate">{link}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copié' : 'Copier'}
          </button>
        </div>

        <div className="flex items-center gap-3 bg-cyan-900/20 border border-cyan-800/40 rounded-xl px-4 py-3">
          <FiTrendingUp className="text-cyan-400 text-xl flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Total gains parrainage</p>
            <p className="text-cyan-400 font-extrabold text-lg">{fmt(referralEarnings)}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-5">
        <h3 className="font-bold text-white flex items-center gap-2 mb-3">
          <FiUsers className="text-cyan-400" /> Clients parrainés ({referrals.length})
        </h3>
        {referrals.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">Aucun client référé pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex justify-between items-center py-2.5 border-b border-slate-700/50 last:border-0">
                <div>
                  <p className="text-slate-200 text-sm font-medium">{r.name}</p>
                  <p className="text-slate-500 text-xs">{r.email}</p>
                </div>
                <span className="text-green-400 text-sm font-bold">+{fmt(r.earned)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralPanel;
