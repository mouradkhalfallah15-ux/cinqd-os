
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { FiBook, FiArrowUpRight, FiArrowDownLeft, FiFilter } from 'react-icons/fi';

const GrandLivre = () => {
    const [transactions, setTransactions] = useState([]);
    const [filter, setFilter] = useState('All'); // All, Sales, Purchases

    useEffect(() => {
        // Querying from 'documents' because every invoice/BL is a transaction in Grand Livre
        const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <FiBook className="text-purple-500"/> الدفتر الكبير (Grand Livre)
                </h3>
                <div className="flex gap-2">
                    {['All', 'Sales', 'Purchases'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${filter === f ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {transactions.filter(t => filter === 'All' || t.tab === filter).map((t, i) => (
                    <div key={i} className="group p-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl flex items-center justify-between hover:bg-slate-900/50 transition-all border-l-4 border-l-purple-500/30">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${t.tab === 'Sales' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                {t.tab === 'Sales' ? <FiArrowUpRight/> : <FiArrowDownLeft/>}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white uppercase tracking-tight">{t.docType} #{(t.id).substring(0,6)}</p>
                                <p className="text-[10px] text-slate-500 font-bold">{t.client?.name} • {t.createdAt?.toDate().toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-white">{t.total.toFixed(2)} <span className="text-[10px] text-slate-500">TND</span></p>
                            <span className="text-[9px] font-black text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded uppercase">Verified</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GrandLivre;
