import React, { useState, useEffect } from 'react';
import { FiUsers, FiTrendingUp, FiPackage, FiDollarSign, FiCpu, FiActivity, FiArrowUpCircle, FiArrowDownCircle } from 'react-icons/fi';

// Helper component for stat cards
const StatCard = ({ icon, title, value, change }) => {
    return (
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:bg-slate-800/60 transition-colors duration-300">
            <div className="flex items-center gap-4">
                <div className="text-3xl text-cyan-400">{icon}</div>
                <div>
                    <p className="text-slate-400 text-sm font-medium">{title}</p>
                    <p className="text-white text-3xl font-bold">{value}</p>
                </div>
            </div>
            {change && (
                <p className={`text-sm mt-2 flex items-center gap-1 ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {change.startsWith('+') ? <FiArrowUpCircle /> : <FiArrowDownCircle />}
                    {change} vs last period
                </p>
            )}
        </div>
    );
};

// Mock data - replace with Firebase data fetching
const getMockData = () => ({
    production: {
        todayVolume: '1,250 L',
        change: '+5.2%',
        recentBatches: [
            { id: 'B-001', product: "Jus d'orange 1L", quantity: 500, status: 'Completed' },
            { id: 'B-002', product: 'Nectar de mangue 50cl', quantity: 750, status: 'In Progress' },
            { id: 'B-003', product: 'Jus de fraise 1L', quantity: 300, status: 'Completed' },
        ]
    },
    sales: {
        todayRevenue: '18,540 TND',
        change: '-1.8%',
        salesByChannel: [
            { name: 'Direct', value: 7400 },
            { name: 'Commercial', value: 9140 },
            { name: 'Livraison', value: 2000 },
        ]
    },
    cash: {
        balance: '125,830 TND',
        change: '+12.5%',
        inflow: '25,300 TND',
        outflow: '7,150 TND'
    },
    aiAuditor: {
        insights: [
            "Difference detected in 'Caisse Direct' of +85 TND. Check records.",
            "Invoice #INV-982 for 'Client X' is approaching its due date.",
            "Low stock on 'Bouteilles 1L'. Suggesting alternative packaging 'Bouteilles 75cl' for next production batch.",
        ]
    }
});


const CinqdDashboard = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        // In a real app, you would fetch this data from Firebase
        const timer = setTimeout(() => {
            setData(getMockData());
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    if (!data) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-950">
                 <div className="text-cyan-400 text-xl flex items-center gap-3">
                    <FiCpu className="animate-spin" />
                    <span>Loading CINQD Industrial OS...</span>
                </div>
            </div>
        );
    }
    
    const { production, sales, cash, aiAuditor } = data;
    const maxSale = Math.max(...sales.salesByChannel.map(s => s.value));

    return (
        <div className="bg-slate-950 min-h-screen text-white font-sans">
            {/* Header */}
            <header className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        <span className="text-cyan-400">CINQD</span> Industrial OS
                    </h1>
                    <p className="text-slate-400">Enterprise Build 1.1 - Real-time Datastream</p>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-medium">H. Ben Hassine</p>
                        <p className="text-xs text-slate-500">Administrator</p>
                    </div>
                    <img src="https://via.placeholder.com/40" alt="Admin" className="rounded-full w-10 h-10 border-2 border-cyan-500"/>
                </div>
            </header>

            {/* Main Dashboard Grid */}
            <main className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* --- STATS --- */}
                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard icon={<FiTrendingUp/>} title="Today's Sales" value={sales.todayRevenue} change={sales.change} />
                    <StatCard icon={<FiPackage/>} title="Production Volume" value={production.todayVolume} change={production.change} />
                    <StatCard icon={<FiDollarSign/>} title="Cash Balance" value={cash.balance} change={cash.change} />
                </div>
                
                {/* --- AI AUDITOR --- */}
                <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 animate-in fade-in duration-500">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><FiCpu className="text-cyan-400"/> AI Auditor Insights</h3>
                    <ul className="space-y-3">
                        {aiAuditor.insights.map((insight, index) => (
                            <li key={index} className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0 animate-pulse"></div>
                                <span>{insight}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* --- SALES BY CHANNEL --- */}
                <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 animate-in fade-in duration-500">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><FiUsers className="text-cyan-400"/> Sales by Channel</h3>
                    <div className="space-y-4">
                        {sales.salesByChannel.map(channel => (
                            <div key={channel.name} className="grid grid-cols-3 gap-2 items-center">
                                <span className="text-slate-400 text-sm col-span-1">{channel.name}</span>
                                <div className="col-span-2 bg-slate-800 rounded-full h-6">
                                    <div 
                                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-6 rounded-full flex items-center justify-end pr-2 text-xs font-bold" 
                                        style={{ width: `${(channel.value / maxSale) * 100}%` }}
                                    >
                                        {channel.value.toLocaleString('fr-FR')} TND
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- RECENT PRODUCTION --- */}
                <div className="lg:col-span-4 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 animate-in fade-in duration-500">
                     <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><FiActivity className="text-cyan-400"/> Recent Production Batches</h3>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-slate-500 uppercase text-[10px] font-black">
                                <tr>
                                    <th className="p-3">Batch ID</th>
                                    <th className="p-3">Product</th>
                                    <th className="p-3">Quantity (Units)</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {production.recentBatches.map(batch => (
                                    <tr key={batch.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                        <td className="p-3 font-mono text-cyan-400">{batch.id}</td>
                                        <td className="p-3">{batch.product}</td>
                                        <td className="p-3">{batch.quantity}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${batch.status === 'Completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                {batch.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default CinqdDashboard;
