
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { FiActivity, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const QualityOutputMonitor = () => {
    const [recentOrders, setRecentOrders] = useState([]);
    const [stats, setStats] = useState({ totalDailyVolume: 0, avgPh: 0, count: 0 });

    useEffect(() => {
        const q = query(collection(db, 'production_orders'), orderBy('createdAt', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecentOrders(orders);

            // Calculate daily stats (simplified for today)
            let vol = 0;
            let totalPh = 0;
            orders.forEach(o => {
                vol += (o.totalVolume || 0);
                totalPh += parseFloat(o.qualityControl?.ph || 0);
            });
            setStats({
                totalDailyVolume: vol,
                avgPh: orders.length > 0 ? (totalPh / orders.length).toFixed(2) : 0,
                count: orders.length
            });
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 mt-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <FiActivity className="text-red-500"/> MONITORING QUALITÉ & SORTIE
                </h3>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Volume Total</p>
                        <p className="text-lg font-black text-green-400">{stats.totalDailyVolume} L</p>
                    </div>
                    <div className="text-right border-l border-slate-800 pl-4">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Moyenne pH</p>
                        <p className="text-lg font-black text-blue-400">{stats.avgPh}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {recentOrders.map((order, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800/50 hover:bg-slate-800/60 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                <FiCheckCircle size={16}/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white uppercase">{order.recipeName?.split('-')[0] || 'BATCH'}</p>
                                <p className="text-[10px] text-slate-500">{order.createdAt?.toDate().toLocaleTimeString()}</p>
                            </div>
                        </div>
                        <div className="flex gap-6 text-right">
                            <div>
                                <p className="text-[9px] text-slate-500 uppercase">Qualité</p>
                                <p className="text-xs font-bold text-slate-300">pH: {order.qualityControl?.ph || '--'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 uppercase">Volume</p>
                                <p className="text-xs font-bold text-red-500">{order.totalVolume}L</p>
                            </div>
                        </div>
                    </div>
                ))}
                {recentOrders.length === 0 && (
                    <div className="text-center py-10 text-slate-600">
                        <FiAlertCircle className="mx-auto mb-2" size={24}/>
                        <p className="text-sm italic">Aucune donnée de production récente.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QualityOutputMonitor;
