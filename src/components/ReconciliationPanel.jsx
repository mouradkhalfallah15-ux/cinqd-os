import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, query, where,
  serverTimestamp, addDoc, getDocs, doc,
  writeBatch
} from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiLock, FiPieChart, FiArrowUpRight, FiArrowDownLeft, FiAlertCircle } from 'react-icons/fi';

// ─── Constants ────────────────────────────────────────────────────────────────
const CAISSES = ['caisse_directe', 'caisse_commerciaux', 'caisse_livraison'];

const CAISSE_LABELS = {
  caisse_directe:     'Caisse Directe',
  caisse_commerciaux: 'Caisse Commerciaux',
  caisse_livraison:   'Caisse Livraison',
};

const CAISSE_COLORS = {
  caisse_directe:     'border-l-green-500',
  caisse_commerciaux: 'border-l-orange-500',
  caisse_livraison:   'border-l-purple-500',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayDateString() {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function isToday(firestoreTimestamp) {
  if (!firestoreTimestamp) return false;
  try {
    return firestoreTimestamp.toDate().toISOString().split('T')[0] === todayDateString();
  } catch {
    return false;
  }
}

function blankTotals() {
  return { caisse_directe: 0, caisse_commerciaux: 0, caisse_livraison: 0, income: 0, expenses: 0, net: 0 };
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ReconciliationPanel = () => {
  const [totals, setTotals]       = useState(blankTotals());
  const [isClosing, setIsClosing] = useState(false);
  const [alreadyClosed, setAlreadyClosed] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // ── Check if today already has a closure ─────────────────────────────────
  useEffect(() => {
    getDocs(
      query(collection(db, 'daily_clotures'), where('date', '==', todayDateString()))
    ).then(snap => {
      setAlreadyClosed(!snap.empty);
    }).catch(err => {
      console.error('Closure check error:', err);
    });
  }, []);

  // ── Real-time totals — today's completed transactions only ────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'sales_transactions'),
      where('status', '==', 'completed')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const acc = blankTotals();

        snapshot.docs.forEach(d => {
          const data = d.data();

          // Client-side date filter — today only
          if (!isToday(data.createdAt)) return;

          const amount = typeof data.amount === 'number' ? data.amount : 0;

          if (amount > 0) {
            acc.income += amount;
            if (CAISSES.includes(data.caisse)) {
              acc[data.caisse] += amount;
            }
          } else if (amount < 0) {
            acc.expenses += Math.abs(amount);
          }
        });

        acc.net = acc.income - acc.expenses;
        setTotals(acc);
        setLoading(false);
      },
      (err) => {
        console.error('ReconciliationPanel Firestore error:', err);
        setError('خطأ في تحميل بيانات الكاسة.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ── Clôture ───────────────────────────────────────────────────────────────
  const handleCloture = async () => {
    if (alreadyClosed) {
      return toast.error('الكاسة مغلقة مسبقاً لهذا اليوم.');
    }
    if (totals.net <= 0) {
      return toast.error('لا يمكن إغلاق الكاسة بصافٍ صفر أو سلبي.');
    }

    const confirmed = window.confirm(
      `تأكيد إغلاق كاسة اليوم؟\n\nالمداخيل: ${totals.income.toFixed(3)} TND\nالمصاريف: ${totals.expenses.toFixed(3)} TND\nالصافي: ${totals.net.toFixed(3)} TND`
    );
    if (!confirmed) return;

    setIsClosing(true);
    const today = todayDateString();

    try {
      // Double-closure guard — re-check in case another session closed simultaneously
      const existingSnap = await getDocs(
        query(collection(db, 'daily_clotures'), where('date', '==', today))
      );
      if (!existingSnap.empty) {
        toast.error('الكاسة أُغلقت للتو من جلسة أخرى.');
        setAlreadyClosed(true);
        return;
      }

      // Get all of today's completed transactions for archival
      const txSnap = await getDocs(
        query(collection(db, 'sales_transactions'), where('status', '==', 'completed'))
      );
      const todayTxDocs = txSnap.docs.filter(d => isToday(d.data().createdAt));

      // Authenticated user for audit trail
      const user       = auth.currentUser;
      const verifiedBy = user?.displayName || user?.email || 'Unknown';

      // Batch: archive transactions + write closure record atomically
      const batch       = writeBatch(db);
      const closureRef  = doc(collection(db, 'daily_clotures'));

      todayTxDocs.forEach(d => {
        batch.update(doc(db, 'sales_transactions', d.id), { status: 'archived' });
      });

      batch.set(closureRef, {
        date:           today,
        caisse_directe:     totals.caisse_directe,
        caisse_commerciaux: totals.caisse_commerciaux,
        caisse_livraison:   totals.caisse_livraison,
        income:         totals.income,
        expenses:       totals.expenses,
        net:            totals.net,
        archivedCount:  todayTxDocs.length,
        verifiedBy,
        closedAt:       serverTimestamp(),
      });

      await batch.commit();

      setAlreadyClosed(true);
      toast.success(
        `تم إغلاق الكاسة بنجاح. الصافي: ${totals.net.toFixed(3)} TND — ${todayTxDocs.length} عملية مؤرشفة.`
      );
    } catch (err) {
      console.error('Cloture error:', err);
      toast.error('خطأ في إغلاق الكاسة. حاول مجدداً.');
    } finally {
      setIsClosing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 h-full">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <FiPieChart className="text-blue-500" /> تسوية الكاسة اليومية
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-bold">{todayDateString()}</span>
          <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black">
            RECONCILIATION
          </span>
        </div>
      </div>

      {/* Already closed notice */}
      {alreadyClosed && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-2xl px-5 py-3 mb-6">
          <FiAlertCircle className="flex-shrink-0" />
          <span>الكاسة مغلقة لهذا اليوم. لا يمكن تسجيل إغلاق جديد.</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl px-5 py-3 mb-6">
          <FiAlertCircle className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center text-slate-500 text-sm py-8">جارٍ تحميل بيانات اليوم...</div>
      )}

      {!loading && !error && (
        <>
          {/* Per-caisse breakdown */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            {CAISSES.map(caisse => (
              <div
                key={caisse}
                className={`p-4 bg-slate-950 border-l-4 ${CAISSE_COLORS[caisse]} rounded-xl flex justify-between items-center`}
              >
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {CAISSE_LABELS[caisse]}
                </p>
                <p className="text-2xl font-black text-white">
                  {totals[caisse].toFixed(3)}
                  <span className="text-sm text-slate-400 ml-1">TND</span>
                </p>
              </div>
            ))}
          </div>

          {/* Income vs Expenses */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-950 border border-green-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-1 text-green-400">
                <FiArrowUpRight size={14} />
                <p className="text-[10px] font-bold uppercase tracking-widest">مداخيل</p>
              </div>
              <p className="text-xl font-black text-green-400">
                {totals.income.toFixed(3)}
                <span className="text-xs text-slate-500 ml-1">TND</span>
              </p>
            </div>
            <div className="p-4 bg-slate-950 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-1 text-red-400">
                <FiArrowDownLeft size={14} />
                <p className="text-[10px] font-bold uppercase tracking-widest">مصاريف</p>
              </div>
              <p className="text-xl font-black text-red-400">
                {totals.expenses.toFixed(3)}
                <span className="text-xs text-slate-500 ml-1">TND</span>
              </p>
            </div>
          </div>

          {/* Net total */}
          <div className={`p-6 rounded-2xl mb-8 shadow-xl ${
            totals.net >= 0
              ? 'bg-blue-600 shadow-blue-600/20'
              : 'bg-red-700 shadow-red-700/20'
          }`}>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-[0.2em] mb-1">
              الصافي اليومي
            </p>
            <div className="flex items-center justify-between">
              <p className="text-4xl font-black text-white">
                {totals.net.toFixed(3)} TND
              </p>
              <FiArrowUpRight size={32} className="text-blue-200 opacity-50" />
            </div>
          </div>

          {/* Clôture button */}
          <button
            onClick={handleCloture}
            disabled={isClosing || alreadyClosed}
            className={`w-full font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all border ${
              alreadyClosed
                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
            }`}
          >
            {isClosing
              ? 'جارٍ الإغلاق...'
              : alreadyClosed
                ? 'تم الإغلاق اليوم'
                : <><FiLock /> Clôture de la journée</>
            }
          </button>
        </>
      )}
    </div>
  );
};

export default ReconciliationPanel;
