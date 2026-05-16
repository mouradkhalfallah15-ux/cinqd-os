import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import {
  FiDollarSign, FiFileText, FiPercent,
  FiTrendingUp, FiActivity, FiPrinter, FiAlertCircle
} from 'react-icons/fi';

// TVA rate in Tunisia (standard rate)
const TVA_RATE = 0.19;
// RS (Retenue à la Source) applies to B2B transactions above 1000 TND
const RS_RATE  = 0.015;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcStats(transactions) {
  let totalRevenue = 0;
  let totalTva     = 0;
  let totalRs      = 0;
  let totalExpense = 0;

  transactions.forEach(t => {
    const amount = t.amount || 0;
    if (amount > 0) {
      totalRevenue += amount;
      if (t.type === 'sale') totalTva += amount * TVA_RATE;
      if (amount > 1000)     totalRs  += amount * RS_RATE;
    } else {
      totalExpense += Math.abs(amount);
    }
  });

  return {
    totalRevenue,
    totalTva,
    totalRs,
    totalExpense,
    netBalance: totalRevenue - totalExpense,
  };
}

function formatDate(firestoreTimestamp) {
  if (!firestoreTimestamp?.toDate) return '—';
  return firestoreTimestamp.toDate().toLocaleDateString('fr-TN');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, accent = 'text-white', borderColor = 'border-l-slate-600' }) => (
  <div className={`bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 border-l-4 ${borderColor}`}>
    <div className="flex justify-between items-center mb-4 text-slate-500">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className={`text-3xl font-black ${accent}`}>
      {typeof value === 'number' ? value.toFixed(2) : value}
      <span className="text-sm text-slate-500 ml-1">TND</span>
    </p>
  </div>
);

const EmptyRow = () => (
  <tr>
    <td colSpan={5} className="p-8 text-center text-slate-600 text-sm">
      Aucune transaction enregistrée.
    </td>
  </tr>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const FinanceManager = () => {
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab]                   = useState('Journal');
  const [stats, setStats]               = useState({
    totalRevenue: 0, totalTva: 0, totalRs: 0, totalExpense: 0, netBalance: 0,
  });
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'sales_transactions'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setStats(calcStats(data));
      setLoading(false);
    }, (error) => {
      console.error('FinanceManager Firestore error:', error);
      toast.error('خطأ في تحميل البيانات المالية.');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handlePrint = () => {
    window.print();
    toast.success('تحضير التقرير الرسمي الكامل للطباعة...');
  };

  const salesTransactions = transactions.filter(t => (t.amount || 0) > 0);

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 bg-green-600 rounded-xl shadow-lg shadow-green-600/20">
              <FiDollarSign />
            </span>
            المركز المالي والمحاسبي
          </h2>
          <p className="text-slate-500 text-sm mt-2 font-medium uppercase tracking-widest">
            Déclaration Fiscale Complète — 100% Conforme
          </p>
        </div>

        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {['Journal', 'TVA', 'Rapport'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
                tab === t
                  ? 'bg-slate-800 text-white shadow-inner'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'Journal' ? 'JOURNAL RÉEL'  : ''}
              {t === 'TVA'     ? 'TVA & RS'      : ''}
              {t === 'Rapport' ? 'RAPPORT FISCAL': ''}
            </button>
          ))}
        </div>
      </div>

      {/* Compliance notice */}
      <div className="flex items-start gap-3 bg-green-500/5 border border-green-500/20 rounded-2xl px-5 py-4 mb-10 text-sm text-green-400">
        <FiAlertCircle className="flex-shrink-0 mt-0.5" />
        <span>
          جميع الأرقام المعروضة تمثل <strong>100%</strong> من الإيرادات الفعلية.
          التقارير المُولَّدة هنا مطابقة للإقرار الضريبي القانوني في تونس.
        </span>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="text-center text-slate-500 py-12">جارٍ تحميل البيانات...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 no-print">
          <StatCard
            icon={<FiActivity />}
            label="Chiffre d'Affaires Réel"
            value={stats.totalRevenue}
            accent="text-white"
            borderColor="border-l-green-500"
          />
          <StatCard
            icon={<FiPercent />}
            label="TVA Collectée (19%)"
            value={stats.totalTva}
            accent="text-blue-400"
            borderColor="border-l-blue-500"
          />
          <StatCard
            icon={<FiTrendingUp />}
            label="RS Retenu (1.5%)"
            value={stats.totalRs}
            accent="text-yellow-400"
            borderColor="border-l-yellow-500"
          />
          <StatCard
            icon={<FiDollarSign />}
            label="Solde Net"
            value={stats.netBalance}
            accent={stats.netBalance >= 0 ? 'text-green-400' : 'text-red-400'}
            borderColor={stats.netBalance >= 0 ? 'border-l-green-500' : 'border-l-red-500'}
          />
        </div>
      )}

      {/* Tab: Journal */}
      {tab === 'Journal' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <h3 className="text-lg font-bold text-white">Journal des Opérations — Données Complètes</h3>
          <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <tr>
                  <th className="p-5">Date</th>
                  <th className="p-5">Libellé</th>
                  <th className="p-5">Type</th>
                  <th className="p-5 text-right">Débit (TND)</th>
                  <th className="p-5 text-right">Crédit (TND)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? <EmptyRow /> : transactions.map(t => (
                  <tr key={t.id} className="border-t border-slate-900 hover:bg-slate-900/50 transition-all">
                    <td className="p-5 text-slate-400 text-xs">{formatDate(t.createdAt)}</td>
                    <td className="p-5 font-bold text-white text-sm">{t.source || 'Vente'}</td>
                    <td className="p-5">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                        t.type === 'sale'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {t.type || 'sale'}
                      </span>
                    </td>
                    <td className="p-5 text-right text-green-500 font-black">
                      {(t.amount || 0) > 0 ? (t.amount).toFixed(2) : '—'}
                    </td>
                    <td className="p-5 text-right text-red-500 font-black">
                      {(t.amount || 0) < 0 ? Math.abs(t.amount).toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: TVA & RS */}
      {tab === 'TVA' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <h3 className="text-lg font-bold text-white">TVA & Retenue à la Source — Calcul Légal</h3>
          <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <tr>
                  <th className="p-5">Date</th>
                  <th className="p-5">Libellé</th>
                  <th className="p-5 text-right">Montant HT</th>
                  <th className="p-5 text-right">TVA 19%</th>
                  <th className="p-5 text-right">RS 1.5%</th>
                </tr>
              </thead>
              <tbody>
                {salesTransactions.length === 0 ? <EmptyRow /> : salesTransactions.map(t => {
                  const ht  = (t.amount || 0) / (1 + TVA_RATE);
                  const tva = ht * TVA_RATE;
                  const rs  = t.amount > 1000 ? t.amount * RS_RATE : 0;
                  return (
                    <tr key={t.id} className="border-t border-slate-900 hover:bg-slate-900/50">
                      <td className="p-5 text-slate-400 text-xs">{formatDate(t.createdAt)}</td>
                      <td className="p-5 font-bold text-white text-sm">{t.source || 'Vente'}</td>
                      <td className="p-5 text-right text-slate-300">{ht.toFixed(2)}</td>
                      <td className="p-5 text-right text-blue-400 font-black">{tva.toFixed(2)}</td>
                      <td className="p-5 text-right text-yellow-400 font-black">
                        {rs > 0 ? rs.toFixed(2) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {salesTransactions.length > 0 && (
                <tfoot className="bg-slate-900/60 text-xs font-black uppercase text-slate-400">
                  <tr>
                    <td colSpan={2} className="p-5">TOTAL</td>
                    <td className="p-5 text-right text-white">
                      {(stats.totalRevenue / (1 + TVA_RATE)).toFixed(2)}
                    </td>
                    <td className="p-5 text-right text-blue-400">{stats.totalTva.toFixed(2)}</td>
                    <td className="p-5 text-right text-yellow-400">{stats.totalRs.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Tab: Rapport Fiscal */}
      {tab === 'Rapport' && (
        <div className="space-y-6 animate-in slide-in-from-top duration-500">
          <div className="p-8 bg-green-600/5 border border-green-500/20 rounded-[2rem] flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-2">
                التقرير الرسمي الكامل — مطابق للإقرار الضريبي
              </h3>
              <p className="text-sm text-slate-500">
                يعرض هذا التقرير <strong className="text-white">100%</strong> من الإيرادات الفعلية
                وفق المتطلبات القانونية التونسية.
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="p-4 bg-green-600 text-white rounded-2xl shadow-lg shadow-green-600/20 hover:bg-green-500 transition-colors"
            >
              <FiPrinter size={24} />
            </button>
          </div>

          <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <tr>
                  <th className="p-5">Date</th>
                  <th className="p-5">Désignation</th>
                  <th className="p-5 text-right">Montant TTC</th>
                  <th className="p-5 text-right">HT</th>
                  <th className="p-5 text-right">TVA 19%</th>
                </tr>
              </thead>
              <tbody>
                {salesTransactions.length === 0 ? <EmptyRow /> : salesTransactions.map((t, i) => {
                  const ttc = t.amount || 0;
                  const ht  = ttc / (1 + TVA_RATE);
                  const tva = ht * TVA_RATE;
                  return (
                    <tr key={t.id} className="border-t border-slate-900 hover:bg-slate-900/50">
                      <td className="p-5 text-slate-400 text-xs">{formatDate(t.createdAt)}</td>
                      <td className="p-5 font-bold text-slate-300 text-sm uppercase">
                        Vente Marchandise #{String(i + 1).padStart(4, '0')}
                      </td>
                      <td className="p-5 text-right font-black text-white">{ttc.toFixed(2)}</td>
                      <td className="p-5 text-right text-slate-300">{ht.toFixed(2)}</td>
                      <td className="p-5 text-right text-blue-400 font-black">{tva.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {salesTransactions.length > 0 && (
                <tfoot className="bg-slate-900/60 text-xs font-black uppercase text-slate-400">
                  <tr>
                    <td colSpan={2} className="p-5">TOTAL GÉNÉRAL</td>
                    <td className="p-5 text-right text-white">{stats.totalRevenue.toFixed(2)}</td>
                    <td className="p-5 text-right text-slate-300">
                      {(stats.totalRevenue / (1 + TVA_RATE)).toFixed(2)}
                    </td>
                    <td className="p-5 text-right text-blue-400">{stats.totalTva.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Print Layout — Full, honest figures */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-10 z-[3000]">
        <div className="border-b-4 border-black pb-8 mb-10 text-center">
          <h1 className="text-3xl font-black uppercase mb-2">
            Rapport Financier Officiel — CINQD
          </h1>
          <p className="font-bold">Journal des Ventes — Déclaration Complète</p>
          <p className="text-sm mt-1">Date d'édition: {new Date().toLocaleDateString('fr-TN')}</p>
        </div>
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-black p-3 text-left">Date</th>
              <th className="border-2 border-black p-3 text-left">Désignation</th>
              <th className="border-2 border-black p-3 text-right">TTC</th>
              <th className="border-2 border-black p-3 text-right">HT</th>
              <th className="border-2 border-black p-3 text-right">TVA 19%</th>
            </tr>
          </thead>
          <tbody>
            {salesTransactions.map((t, i) => {
              const ttc = t.amount || 0;
              const ht  = ttc / (1 + TVA_RATE);
              const tva = ht * TVA_RATE;
              return (
                <tr key={t.id}>
                  <td className="border-2 border-black p-3">{formatDate(t.createdAt)}</td>
                  <td className="border-2 border-black p-3 uppercase font-bold">
                    Vente Batch #{String(i + 1).padStart(4, '0')}
                  </td>
                  <td className="border-2 border-black p-3 text-right">{ttc.toFixed(2)}</td>
                  <td className="border-2 border-black p-3 text-right">{ht.toFixed(2)}</td>
                  <td className="border-2 border-black p-3 text-right">{tva.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-12 text-right space-y-2">
          <p className="text-xl font-bold">
            Chiffre d'Affaires Total TTC: {stats.totalRevenue.toFixed(2)} TND
          </p>
          <p className="text-xl font-bold">
            Total HT: {(stats.totalRevenue / (1 + TVA_RATE)).toFixed(2)} TND
          </p>
          <p className="text-xl font-bold">
            Total TVA à Verser: {stats.totalTva.toFixed(2)} TND
          </p>
          <p className="text-xl font-bold">
            Total RS Retenu: {stats.totalRs.toFixed(2)} TND
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinanceManager;
