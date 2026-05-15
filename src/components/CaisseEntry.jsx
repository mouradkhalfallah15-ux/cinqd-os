
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiPlus, FiShoppingBag, FiTruck, FiUsers, FiDollarSign, FiSave } from 'react-icons/fi';

const CaisseEntry = () => {
    const [amount, setAmount] = useState('');
    const [source, setSource] = useState('Direct'); // Direct, Commercial, Livraison, Affiliate
    const [caisse, setCaisse] = useState('caisse_directe'); // caisse_directe, caisse_commerciaux, caisse_livraison
    const [isSaving, setIsSaving] = useState(false);

    const handleSale = async (e) => {
        e.preventDefault();
        if (!amount || amount <= 0) return toast.error("أدخل المبلغ الصحيح");
        
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'sales_transactions'), {
                amount: parseFloat(amount),
                source,
                caisse,
                createdAt: serverTimestamp(),
                status: 'completed'
            });
            toast.success("تم تسجيل البيع بنجاح");
            setAmount('');
        } catch (error) {
            toast.error("خطأ في التسجيل");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FiPlus className="text-red-500"/> تسجيل عملية بيع جديدة
            </h3>
            <form onSubmit={handleSale} className="space-y-4">
                <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-black mb-2 tracking-widest">المبلغ (TND)</label>
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-2xl font-black text-green-400 outline-none focus:border-red-500 transition-all"
                        placeholder="0.00"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-black mb-2 tracking-widest">المصدر</label>
                        <select 
                            value={source} 
                            onChange={e => setSource(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none"
                        >
                            <option value="Direct">Vente Directe</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Livraison">Livraison</option>
                            <option value="Affiliate">Affiliate</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-black mb-2 tracking-widest">الكاسة</label>
                        <select 
                            value={caisse} 
                            onChange={e => setCaisse(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none"
                        >
                            <option value="caisse_directe">Caisse Directe</option>
                            <option value="caisse_commerciaux">Caisse Commerciaux</option>
                            <option value="caisse_livraison">Caisse Livraison</option>
                        </select>
                    </div>
                </div>
                <button 
                    disabled={isSaving}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-600/20"
                >
                    {isSaving ? "جاري التسجيل..." : <><FiSave/> تأكيد العملية</>}
                </button>
            </form>
        </div>
    );
};

export default CaisseEntry;
