
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiUsers, FiPlus } from 'react-icons/fi';

const PartnerManager = () => {
    const [type, setType] = useState('Client'); // Client or Supplier
    const [partners, setPartners] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        patent: '',
        category: '',
        creditLimit: 0
    });

    useEffect(() => {
        const q = query(collection(db, 'partners'), where('type', '==', type));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [type]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return toast.error("أدخل الاسم");
        
        try {
            await addDoc(collection(db, 'partners'), {
                ...formData,
                type,
                currentBalance: 0,
                createdAt: serverTimestamp()
            });
            toast.success(`${type === 'Client' ? 'حريف' : 'مزود'} جديد تمت إضافته`);
            setFormData({ name: '', address: '', phone: '', patent: '', category: '', creditLimit: 0 });
        } catch (error) {
            toast.error("خطأ في الإضافة");
        }
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
            <Toaster position="top-right" />
            <div className="flex items-center justify-between mb-8">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button onClick={() => setType('Client')} className={`px-6 py-2 rounded-lg font-bold text-xs transition-all ${type === 'Client' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>HRIF (CLIENTS)</button>
                    <button onClick={() => setType('Supplier')} className={`px-6 py-2 rounded-lg font-bold text-xs transition-all ${type === 'Supplier' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}>MZAWED (SUPPLIERS)</button>
                </div>
                <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><FiUsers/></div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <input type="text" placeholder="الاسم الكامل / الشركة" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none focus:border-blue-500"/>
                <input type="text" placeholder="الباتيندا (Patent / B.T)" value={formData.patent} onChange={e => setFormData({...formData, patent: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none"/>
                <input type="text" placeholder="الهاتف" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none"/>
                <input type="text" placeholder="العنوان" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none"/>
                <input type="text" placeholder="التصنيف (Catégorie)" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none"/>
                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                    <span className="pl-3 text-[10px] font-bold text-slate-500 uppercase">سقف الكريدي</span>
                    <input type="number" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: parseFloat(e.target.value)})} className="bg-transparent w-full p-2 text-sm outline-none text-red-500 font-bold"/>
                </div>
                <button type="submit" className="md:col-span-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    <FiPlus/> إضافة للدفتر
                </button>
            </form>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {partners.map(p => (
                    <div key={p.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${type === 'Client' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                {p.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{p.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{p.patent || 'No Patent'} • {p.phone}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-black">Balance</p>
                            <p className={`text-sm font-black ${p.currentBalance > p.creditLimit ? 'text-red-500' : 'text-green-500'}`}>
                                {p.currentBalance.toFixed(2)} TND
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartnerManager;
