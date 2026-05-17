import React from 'react';
import { FiAlertTriangle, FiShield } from 'react-icons/fi';

const fmt = (n) => `${Number(n ?? 0).toFixed(3)} TND`;
const fmtDate = (ts) => ts?.toDate?.().toLocaleDateString('fr-FR') ?? '—';

const PENALTY_REASONS = {
  failed_delivery:    'Échec de livraison',
  late_delivery:      'Livraison en retard',
  missing_items:      'Articles manquants',
  quality_issue:      'Problème qualité',
  no_show:            'Absent (commande non traitée)',
};

const PenaltyLog = ({ penalties = [] }) => {
  const total = penalties.reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-5 border ${
        penalties.length > 0
          ? 'bg-red-900/20 border-red-800/40'
          : 'bg-green-900/20 border-green-800/40'
      }`}>
        <div className="flex items-center gap-3">
          {penalties.length > 0
            ? <FiAlertTriangle className="text-red-400 text-2xl" />
            : <FiShield className="text-green-400 text-2xl" />}
          <div>
            <p className="text-white font-bold">{penalties.length > 0 ? 'Pénalités actives' : 'Aucune pénalité'}</p>
            <p className="text-slate-400 text-xs">
              {penalties.length > 0
                ? `Total déduit du Wallet: ${fmt(total)}`
                : 'Excellent bilan de livraison.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-5">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <FiAlertTriangle className="text-red-400" /> Journal des Pénalités
        </h3>
        {penalties.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">Aucune pénalité enregistrée.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {penalties.map((p) => (
              <div key={p.id} className="flex items-start gap-3 py-3 border-b border-slate-700/50 last:border-0">
                <FiAlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm">{PENALTY_REASONS[p.reason] ?? p.reason}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Commande: <span className="font-mono">{p.orderId}</span> · {fmtDate(p.createdAt)}
                  </p>
                </div>
                <span className="text-red-400 font-bold text-sm flex-shrink-0">-{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PenaltyLog;
