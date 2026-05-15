
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, runTransaction, doc, increment } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiTrash2, FiClipboard, FiAlertTriangle, FiPrinter, FiCheck, FiX } from 'react-icons/fi';

const StockControl = () => {
    const [stock, setStock] = useState([]);
    const [tab, setTab] = useState('Casse'); // Casse, Inventory, Matching
    
    // Casse State
    const [casseData, setCasseData] = useState({ itemId: '', quantity: '', reason: '' });
    
    // Matching State
    const [physicalCounts, setPhysicalCounts] = useState({});
    const [justifications, setJustifications] = useState({});

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'raw_materials'), (snapshot) => {
            setStock(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const handleCasse = async (e) => {
        e.preventDefault();
        if (!casseData.itemId || !casseData.quantity) return toast.error("أكمل البيانات");
        
        try {
            await runTransaction(db, async (transaction) => {
                const itemRef = doc(db, 'raw_materials', casseData.itemId);
                const itemDoc = await transaction.get(itemRef);
                if (!itemDoc.exists()) throw "المنتج غير موجود";

                const newQty = itemDoc.data().quantity - parseFloat(casseData.quantity);
                transaction.update(itemRef, { quantity: newQty });

                const logsRef = collection(db, 'stock_logs');
                transaction.set(doc(logsRef), {
                    type: 'Casse',
                    itemId: casseData.itemId,
                    itemName: itemDoc.data().name,
                    quantity: parseFloat(casseData.quantity),
                    reason: casseData.reason,
                    createdAt: serverTimestamp()
                });
            });
            toast.success("تم تسجيل الكسر وخصمه من الستوك");
            setCasseData({ itemId: '', quantity: '', reason: '' });
        } catch (error) {
            toast.error("خطأ في العملية");
        }
    };

    const handlePrintInventory = () => {
        window.print();
        toast.success("جاري تحضير ورقة الجرد للطباعة...");
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
            <Toaster position="top-right" />
            
            <div className="flex items-center justify-between mb-8">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button onClick={() => setTab('Casse')} className={`px-6 py-2 rounded-lg font-bold text-xs transition-all ${tab === 'Casse' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>CASSE (الكسر)</button>
                    <button onClick={() => setTab('Inventory')} className={`px-6 py-2 rounded-lg font-bold text-xs transition-all ${tab === 'Inventory' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>INVENTORY (الجرد)</button>
                    <button onClick={() => setTab('Matching')} className={`px-6 py-2 rounded-lg font-bold text-xs transition-all ${tab === 'Matching' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>MATCHING (المطابقة)</button>
                </div>
                <div className="text-slate-500 hover:text-white cursor-pointer" onClick={handlePrintInventory}>
                    <FiPrinter size={20}/>
                </div>
            </div>

            {tab === 'Casse' && (
                <form onSubmit={handleCasse} className="space-y-4 animate-in fade-in duration-500">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><FiTrash2 className="text-red-500"/> تسجيل سلعة تالفة</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={casseData.itemId} onChange={e => setCasseData({...casseData, itemId: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none">
                            <option value="">اختر السلعة</option>
                            {stock.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input type="number" placeholder="الكمية التالفة" value={casseData.quantity} onChange={e => setCasseData({...casseData, quantity: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none"/>
                    </div>
                    <textarea placeholder="سبب الكسر (تبرير)" value={casseData.reason} onChange={e => setCasseData({...casseData, reason: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none h-24"></textarea>
                    <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-600/20">تأكيد الخصم من الستوك</button>
                </form>
            )}

            {tab === 'Inventory' && (
                <div className="animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><FiClipboard className="text-blue-500"/> ورقة الجرد الدوري</h3>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-800">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black">
                                <tr>
                                    <th className="p-4">المنتج</th>
                                    <th className="p-4">الستوك الحالي</th>
                                    <th className="p-4">الحالة (سليمة/مكسرة)</th>
                                    <th className="p-4">الجرد الفعلي</th>
                                </tr>
                            </thead>
                            <tbody className="bg-slate-900/40">
                                {stock.map(s => (
                                    <tr key={s.id} className="border-t border-slate-800">
                                        <td className="p-4 font-bold text-white">{s.name}</td>
                                        <td className="p-4 text-slate-400">{s.quantity} {s.unit}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                                <span className="w-3 h-3 rounded-full bg-red-500 opacity-30"></span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="w-20 h-8 border border-slate-700 rounded bg-slate-950"></div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'Matching' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><FiAlertTriangle className="text-purple-500"/> لوحة مطابقة الستوك</h3>
                    <div className="space-y-4">
                        {stock.map(s => {
                            const virtual = s.quantity;
                            const real = physicalCounts[s.id] || 0;
                            const loss = virtual - real;
                            return (
                                <div key={s.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex flex-col gap-4 transition-all hover:border-purple-500/30">
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold text-white">{s.name}</p>
                                        <div className="flex gap-4 text-xs font-black">
                                            <span className="text-slate-500 uppercase">Virtual: {virtual}</span>
                                            <span className="text-blue-500 uppercase">Real: <input type="number" className="bg-transparent border-b border-blue-500 w-12 outline-none text-center" onChange={e => setPhysicalCounts({...physicalCounts, [s.id]: parseFloat(e.target.value)})}/></span>
                                        </div>
                                    </div>
                                    {loss !== 0 && (
                                        <div className="flex items-center gap-4 animate-in slide-in-from-left duration-300">
                                            <div className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black">PERTE: {loss.toFixed(2)}</div>
                                            <input type="text" placeholder="برر الفرق (Justification)..." className="flex-1 bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs outline-none focus:border-red-500" onChange={e => setJustifications({...justifications, [s.id]: e.target.value})}/>
                                            <button className="p-2 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition-all"><FiCheck/></button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Print Layout (Hidden on Screen) */}
            <div className="hidden print:block fixed inset-0 bg-white text-black p-10 z-[2000]">
                <div className="flex justify-between items-center border-b-2 border-black pb-6 mb-10">
                    <h1 className="text-3xl font-black">CINQD - ورقة الجرد الدوري</h1>
                    <p className="text-sm font-bold">التاريخ: {new Date().toLocaleDateString()}</p>
                </div>
                <table className="w-full border-collapse border-2 border-black">
                    <thead>
                        <tr className="bg-gray-100 uppercase text-xs">
                            <th className="border-2 border-black p-3">المنتج</th>
                            <th className="border-2 border-black p-3">الستوك الدفتري</th>
                            <th className="border-2 border-black p-3">الحالة (سليم)</th>
                            <th className="border-2 border-black p-3">الحالة (مكسر)</th>
                            <th className="border-2 border-black p-3">الجرد الفعلي</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stock.map(s => (
                            <tr key={s.id}>
                                <td className="border-2 border-black p-3 font-bold">{s.name}</td>
                                <td className="border-2 border-black p-3 text-center">{s.quantity}</td>
                                <td className="border-2 border-black p-3"></td>
                                <td className="border-2 border-black p-3"></td>
                                <td className="border-2 border-black p-3"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-20 flex justify-between px-20 italic">
                    <p>إمضاء أمين المخزن</p>
                    <p>إمضاء الإدارة (حكيم)</p>
                </div>
            </div>
        </div>
    );
};

export default StockControl;
