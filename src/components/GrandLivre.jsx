import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { FiBook, FiArrowUpRight, FiArrowDownLeft, FiInbox } from 'react-icons/fi';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Supports both old format (total) and new InvoicingManager format (totalTTC / totalHT)
function resolveAmount(doc) {
  const val = doc.totalTTC ?? doc.totalHT ?? doc.total;
  return typeof val === 'number' ? val : 0;
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  try {
    return timestamp.toDate().toLocaleDateString('fr-TN');
  } catch {
    return '—';
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  confirmed: { label: 'Confirmé',  cls: 'bg-green-400/10  text-green-400'  },
  draft:     { label: 'Brouillon', cls: 'bg-slate-400/10  text-slate-400'  },
  cancelled: { label: 'Annulé',    cls: 'bg-red-400/10    text-red-400'    },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status ?? '—', cls: 'bg-slate-400/10 text-slate-400' };
  return (
    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const GrandLivre = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter]             = useState('All');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Rebuild Firestore query when filter changes so limit applies per-filter,
  // not on a mixed result that is then sliced client-side.
  useEffect(() => {
    setLoading(true);
    setError(null);

    const constraints = [orderBy('createdAt', 'desc'), limit(PAGE_LIMIT)];
    if (filter !== 'All') {
      constraints.unshift(where('tab', '==', filter));
    }

    const q = query(collection(db, 'documents'), ...constraints);

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('GrandLivre Firestore error:', err);
        setError('خطأ في تحميل الدفتر الكبير. تحقق من الاتصال.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [filter]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <FiBook className="text-purple-500" /> الدفتر الكبير (Grand Livre)
        </h3>
        <div className="flex gap-2">
          {['All', 'Sales', 'Purchases'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${
                filter === f ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-slate-500 py-12 text-sm">
          جارٍ تحميل السجلات...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center text-red-400 py-12 text-sm bg-red-500/5 rounded-2xl border border-red-500/20">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
          <FiInbox size={36} />
          <p className="text-sm">
            {filter === 'All'
              ? 'لا توجد وثائق مسجّلة بعد.'
              : `لا توجد وثائق من نوع "${filter}".`}
          </p>
        </div>
      )}

      {/* Transaction list */}
      {!loading && !error && transactions.length > 0 && (
        <div className="space-y-4">
          {transactions.map(t => {
            const amount   = resolveAmount(t);
            const isSale   = t.tab === 'Sales';
            const showTTC  = typeof t.totalTTC === 'number' && typeof t.totalHT === 'number';

            return (
              <div
                key={t.id}
                className="group p-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl flex items-center justify-between hover:bg-slate-900/50 transition-all border-l-4 border-l-purple-500/30"
              >
                {/* Left — icon + info */}
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isSale ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                    {isSale ? <FiArrowUpRight /> : <FiArrowDownLeft />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">
                      {t.docType} — {t.docNumber ?? `#${t.id.substring(0, 6)}`}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      {t.client?.name ?? '—'} • {formatDate(t.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Right — amount + status */}
                <div className="text-right space-y-1">
                  <p className="text-lg font-black text-white">
                    {amount.toFixed(3)}
                    <span className="text-[10px] text-slate-500 ml-1">TND</span>
                  </p>
                  {showTTC && (
                    <p className="text-[9px] text-slate-500">
                      HT {t.totalHT.toFixed(3)} + TVA {t.totalTVA?.toFixed(3) ?? '0.000'}
                    </p>
                  )}
                  <StatusBadge status={t.status} />
                </div>
              </div>
            );
          })}

          {/* Footer — total of visible entries */}
          <div className="pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-500">
            <span>{transactions.length} entrée{transactions.length !== 1 ? 's' : ''} affichée{transactions.length !== 1 ? 's' : ''}</span>
            <span>
              Total:{' '}
              <strong className="text-white">
                {transactions.reduce((acc, t) => acc + resolveAmount(t), 0).toFixed(3)} TND
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrandLivre;
