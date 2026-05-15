
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiDollarSign, FiFileText, FiShield, FiPercent, FiTrendingUp, FiActivity, FiPrinter, FiEyeOff } from 'react-icons/fi';

const FinanceManager = () => {
    const [transactions, setTransactions] = useState([]);
    const [tab, setTab] = useState('Journal'); // Journal, RS, Reports, Official
    const [stats, setStats] = useState({ totalTva: 0, totalRs: 0, balance: 0 });
    const [officialStats, setOfficialStats] = useState({ tva: 0, revenue: 0 });

    useEffect(() => {
        const q = query(collection(db, 'sales_transactions'), orderBy('createdAt', 'desc'));
        const unsubTrans = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(data);
            
            let tva = 0;
            let rs = 0;
            let bal = 0;
            let offRev = 0;

            data.forEach(t => {
                bal += (t.amount || 0);
                
                // خوارزمية المناورة: اختيار 40% فقط من المبيعات للتصريح
                // نفضل المبيعات التي تحتوي على RS أو مبيعات الشركات الكبرى
                const isOfficial = t.amount > 1000 || t.caisse === 'caisse_directe'; 
                if (t.amount > 0 && isOfficial) {
                    offRev += (t.amount * 0.4); // تصريح بـ 40% من قيمة العملية
                }

                if (t.type === 'sale') tva += (t.amount * 0.19);
                if (t.amount > 1000) rs += (t.amount * 0.015);
            });

            setStats({ totalTva: tva, totalRs: rs, balance: bal });
            setOfficialStats({ revenue: offRev, tva: offRev * 0.19 });
        });

        return () => unsubTrans();
    }, []);

    const handlePrint = () => {
        window.print();
        toast.success("تحضير التقارير للطباعة...");
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl">
            <Toaster position="top-right" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <span className="p-2 bg-green-600 rounded-xl shadow-lg shadow-green-600/20"><FiDollarSign/></span>
                        المركز المالي والمحاسبي
                    </h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium uppercase tracking-widest italic">Optimisation Fiscale Active 🔐</p>
                </div>
                
                <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    <button onClick={() => setTab('Journal')} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tab === 'Journal' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}>JOURNAL RÉEL</button>
                    <button onClick={() => setTab('Official')} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tab === 'Official' ? 'bg-red-600/20 text-red-500 border border-red-500/20' : 'text-slate-500 hover:text-slate-300'}`}>RAPPORT QABAZA (40%)</button>
                    <button onClick={() => setTab('Reports')} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tab === 'Reports' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}>REPORTS</button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 no-print">
                <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 border-l-4 border-l-green-500">
                    <div className="flex justify-between items-center mb-4 text-slate-500"><FiActivity/> <span className="text-[10px] font-black uppercase tracking-widest">Balance Réelle</span></div>
                    <p className="text-3xl font-black text-white">{stats.balance.toFixed(2)} <span className="text-sm text-slate-500">TND</span></p>
                </div>
                <div className="bg-red-950/20 p-6 rounded-[2rem] border border-red-900/30 border-l-4 border-l-red-600">
                    <div className="flex justify-between items-center mb-4 text-red-500/50"><FiEyeOff/> <span className="text-[10px] font-black uppercase tracking-widest">Revenue Officiel (Caché)</span></div>
                    <p className="text-3xl font-black text-red-500">{officialStats.revenue.toFixed(2)} <span className="text-sm text-slate-500">TND</span></p>
                </div>
                <div className="bg-blue-950/20 p-6 rounded-[2rem] border border-blue-900/30 border-l-4 border-l-blue-600">
                    <div className="flex justify-between items-center mb-4 text-blue-500/50"><FiPercent/> <span className="text-[10px] font-black uppercase tracking-widest">TVA à Déclarer</span></div>
                    <p className="text-3xl font-black text-blue-400">{officialStats.tva.toFixed(2)} <span className="text-sm text-slate-500">TND</span></p>
                </div>
            </div>

            {tab === 'Journal' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <h3 className="text-lg font-bold text-white">Journal des Opérations Réelles</h3>
                    <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/80 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                                <tr>
                                    <th className="p-5">Date</th>
                                    <th className="p-5">Libellé</th>
                                    <th className="p-5">Débit</th>
                                    <th className="p-5">Crédit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t, i) => (
                                    <tr key={i} className="border-t border-slate-900 hover:bg-slate-900/50 transition-all">
                                        <td className="p-5 text-slate-400 text-xs">{t.createdAt?.toDate().toLocaleDateString()}</td>
                                        <td className="p-5 font-bold text-white text-sm">{t.source || 'Vente'}</td>
                                        <td className="p-5 text-green-500 font-black">{t.amount > 0 ? t.amount.toFixed(2) : '--'}</td>
                                        <td className="p-5 text-red-500 font-black">{t.amount < 0 ? Math.abs(t.amount).toFixed(2) : '--'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'Official' && (
                <div className="space-y-6 animate-in slide-in-from-top duration-500">
                    <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[2rem] flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-blue-500 mb-2">التقرير الرسمي الموجه للقباضة</h3>
                            <p className="text-sm text-slate-500">تم اختيار العمليات بذكاء (نسبة 40%) وتعديل المصاريف لخفض الأرباح.</p>
                        </div>
                        <button onClick={handlePrint} className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20"><FiPrinter size={24}/></button>
                    </div>

                    <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/80 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                                <tr>
                                    <th className="p-5">Date</th>
                                    <th className="p-5">Opération Déclarée (Official)</th>
                                    <th className="p-5 text-right">Montant HT</th>
                                    <th className="p-5 text-right">TVA (19%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.filter(t => t.amount > 1000 || t.caisse === 'caisse_directe').map((t, i) => (
                                    <tr key={i} className="border-t border-slate-900">
                                        <td className="p-5 text-slate-500 text-xs">{t.createdAt?.toDate().toLocaleDateString()}</td>
                                        <td className="p-5 font-bold text-slate-300 text-sm">VENTE MARCHANDISE #{(t.id).substring(0,4)}</td>
                                        <td className="p-5 text-right font-black">{(t.amount * 0.4 / 1.19).toFixed(2)}</td>
                                        <td className="p-5 text-right font-bold text-blue-400">{(t.amount * 0.4 * 0.19 / 1.19).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Print Layout for Tax Inspection (Only shows 40%) */}
            <div className="hidden print:block fixed inset-0 bg-white text-black p-10 z-[3000]">
                <div className="border-b-4 border-black pb-8 mb-10 text-center">
                    <h1 className="text-3xl font-black uppercase mb-2">Rapport Financier Officiel - CINQD</h1>
                    <p className="font-bold">Journal des Ventes Déclarées</p>
                </div>
                <table className="w-full border-collapse border-2 border-black">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border-2 border-black p-3 text-left">Date</th>
                            <th className="border-2 border-black p-3 text-left">Désignation</th>
                            <th className="border-2 border-black p-3 text-right">HT</th>
                            <th className="border-2 border-black p-3 text-right">TVA</th>
                            <th className="border-2 border-black p-3 text-right">TTC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.filter(t => t.amount > 1000 || t.caisse === 'caisse_directe').map((t, i) => (
                            <tr key={i}>
                                <td className="border-2 border-black p-3">{t.createdAt?.toDate().toLocaleDateString()}</td>
                                <td className="border-2 border-black p-3 uppercase font-bold">Vente Batch #{(t.id).substring(0,4)}</td>
                                <td className="border-2 border-black p-3 text-right">{(t.amount * 0.4 / 1.19).toFixed(2)}</td>
                                <td className="border-2 border-black p-3 text-right">{(t.amount * 0.4 * 0.19 / 1.19).toFixed(2)}</td>
                                <td className="border-2 border-black p-3 text-right">{(t.amount * 0.4).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-12 text-right">
                    <p className="text-xl font-bold">Total Chiffre d'Affaires Déclaré: {officialStats.revenue.toFixed(2)} TND</p>
                    <p className="text-xl font-bold">Total TVA à Verser: {officialStats.tva.toFixed(2)} TND</p>
                </div>
            </div>
        </div>
    );
};

export default FinanceManager;
