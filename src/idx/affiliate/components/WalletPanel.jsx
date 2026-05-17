import React from 'react';
import { FiArrowUpCircle, FiArrowDownCircle, FiDollarSign } from 'react-icons/fi';

const fmt = (n) => `${Number(n ?? 0).toFixed(3)} TND`;

const TX_LABELS = {
  cashback:      'Cashback achat',
  referral:      'Commission parrainage',
  points:        'Conversion points',
  penalty:       'Pénalité livraison',
  sponsoring:    'Frais sponsoring/ads',
  manual_credit: 'Crédit manuel',
  manual_debit:  'Débit manuel',
};

const fmtDate = (ts) => ts?.toDate?.().toLocaleDateString('fr-FR') ?? '—';

const WalletPanel = ({ balance, transactions = [] }) => {
  const totalIn  = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalOut = transactions.filter((t) => t.type === 'debit').reduce((s, t)  => s + (t.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-cyan-900/40 to-slate-900 border border-cyan-800/50 rounded-2xl p-6 flex items-center gap-5">
        <div className="bg-cyan-500/10 p-3 rounded-xl">
          <FiDollarSign className="text-3xl text-cyan-400" />
        </div>
        <div className="flex-1">
          <p className="text-slate-400 text-sm">Solde Wallet</p>
          <p className="text-white text-4xl font-extrabold tracking-tight">{fmt(balance)}</p>
        </div>
        <div className="space-y-1 text-right text-sm">
          <div className="flex items-center gap-1.5 text-green-400 justify-end">
            <FiArrowUpCircle /> {fmt(totalIn)}
          </div>
          <div className="flex items-center gap-1.5 text-red-400 justify-end">
            <FiArrowDownCircle /> {fmt(totalOut)}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-300 mb-3">Historique des transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Aucune transaction.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {transactions.slice(0, 60).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {tx.type === 'credit'
                    ? <FiArrowUpCircle className="text-green-400 flex-shrink-0" />
                    : <FiArrowDownCircle className="text-red-400 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-slate-200 text-sm truncate">{TX_LABELS[tx.reason] ?? tx.reason}</p>
                    <p className="text-slate-500 text-xs">{fmtDate(tx.createdAt)}{tx.ref ? ` · Réf: ${tx.ref}` : ''}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ml-3 ${tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletPanel;
