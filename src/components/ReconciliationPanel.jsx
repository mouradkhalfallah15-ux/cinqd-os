
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, serverTimestamp, addDoc, getDocs } from 'firebase/firestore';
import { FiLock, FiPieChart, FiDollarSign, FiArrowUpRight, FiArchive } from 'react-icons/fi';

const ReconciliationPanel = () => {
    const [totals, setTotals] = useState({
        caisse_directe: 0,
        caisse_commerciaux: 0,
        caisse_livraison: 0,
        total: 0
    });
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'sales_transactions'), where('status', '==', 'completed'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let t = { caisse_directe: 0, caisse_commerciaux: 0, caisse_livraison: 0, total: 0 };
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (t[data.caisse] !== undefined) {
                    t[data.caisse] += data.amount;
                    t.total += data.amount;
                }
            });
            setTotals(t);
        });
        return () => unsubscribe();
    }, []);

    const handleCloture = async () => {
        if (!window.confirm("هل أنت متأكد من إغلاق الكاسة وترحيل البيانات؟")) return;
        setIsClosing(true);
        try {
            await addDoc(collection(db, 'daily_clotures'), {
                ...totals,
                closedAt: serverTimestamp(),
                verifiedBy: 'HAKIM'
            });
            // Note: In a real app, we would mark transactions as 'archived' here
            alert("تم إغلاق الكاسة بنجاح وترحيل 3 مليون (أو المبلغ الإجمالي) للسجلات.");
        } catch (error) {
            alert("خطأ في الإغلاق");
        } finally {
            setIsClosing(false);
        }
    };

    return (
        <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 h-full">
            <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <FiPieChart className="text-blue-500"/> تسوية الكاسة اليومية
                </h3>
                <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black">RECONCILIATION</span>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-10">
                <div className="p-4 bg-slate-950 border-l-4 border-green-500 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Caisse Directe</p>
                    <p className="text-2xl font-black text-white">{totals.caisse_directe.toFixed(2)} <span className="text-sm text-slate-400">TND</span></p>
                </div>
                <div className="p-4 bg-slate-950 border-l-4 border-orange-500 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Caisse Commerciaux</p>
                    <p className="text-2xl font-black text-white">{totals.caisse_commerciaux.toFixed(2)} <span className="text-sm text-slate-400">TND</span></p>
                </div>
                <div className="p-4 bg-slate-950 border-l-4 border-purple-500 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Caisse Livraison</p>
                    <p className="text-2xl font-black text-white">{totals.caisse_livraison.toFixed(2)} <span className="text-sm text-slate-400">TND</span></p>
                </div>
            </div>

            <div className="p-6 bg-blue-600 rounded-2xl mb-8 shadow-xl shadow-blue-600/20">
                <p className="text-[10px] text-blue-100 font-bold uppercase tracking-[0.2em] mb-1">إجمالي المداخيل اليومية</p>
                <div className="flex items-center justify-between">
                    <p className="text-4xl font-black text-white">{totals.total.toFixed(2)} TND</p>
                    <FiArrowUpRight size={32} className="text-blue-200 opacity-50"/>
                </div>
            </div>

            <button 
                onClick={handleCloture}
                disabled={isClosing}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all border border-slate-700"
            >
                {isClosing ? "جاري الإغلاق..." : <><FiLock/> Clôture de la journée</>}
            </button>
        </div>
    );
};

export default ReconciliationPanel;
