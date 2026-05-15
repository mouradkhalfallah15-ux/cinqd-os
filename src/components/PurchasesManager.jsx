
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, runTransaction, doc, increment } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiShoppingCart, FiCreditCard, FiCalendar, FiPackage, FiSave, FiAlertCircle } from 'react-icons/fi';

const PurchasesManager = () => {
    const [isSaving, setIsSaving] = useState(false);
    
    // Purchase Details
    const [itemData, setItemData] = useState({
        name: '',
        volume: '',
        quantity: '',
        category: 'Raw Material',
        barcode: '',
        price: ''
    });

    // Payment Details
    const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash, Credit, Traite, Bank Loan
    const [dueDate, setDueDate] = useState('');
    const [targetCaisse, setTargetCaisse] = useState('caisse_directe');

    const handlePurchase = async (e) => {
        e.preventDefault();
        if (!itemData.name || !itemData.quantity || !itemData.price) {
            return toast.error("أكمل بيانات السلعة والسعر");
        }

        if ((paymentMethod === 'Credit' || paymentMethod === 'Traite') && !dueDate) {
            return toast.error("يرجى تحديد تاريخ الخلاص");
        }

        setIsSaving(true);
        try {
            await runTransaction(db, async (transaction) => {
                // 1. Record the Purchase
                const purchaseRef = collection(db, 'purchases');
                const newPurchaseRef = doc(purchaseRef);
                const purchaseRecord = {
                    ...itemData,
                    quantity: parseFloat(itemData.quantity),
                    price: parseFloat(itemData.price),
                    paymentMethod,
                    dueDate: (paymentMethod === 'Credit' || paymentMethod === 'Traite') ? dueDate : null,
                    createdAt: serverTimestamp(),
                };
                transaction.set(newPurchaseRef, purchaseRecord);

                // 2. Update Stock (Add to existing or create new)
                // Note: Simplified logic - adding to raw_materials. 
                // In a production app, we would search by barcode or name first.
                const stockRef = collection(db, 'raw_materials');
                const newStockRef = doc(stockRef); // For now creating new entry or we could query.
                // Better: we assume we add a new batch entry for traceability
                transaction.set(newStockRef, {
                    name: itemData.name,
                    quantity: parseFloat(itemData.quantity),
                    unit: itemData.volume ? 'L' : 'Kg', // Simplified
                    category: itemData.category,
                    lastPurchasePrice: parseFloat(itemData.price) / parseFloat(itemData.quantity),
                    barcode: itemData.barcode,
                    createdAt: serverTimestamp()
                });

                // 3. Financial Logic
                if (paymentMethod === 'Cash') {
                    // Record an expense transaction to deduct from Caisse
                    const transactionRef = collection(db, 'sales_transactions');
                    const newTransRef = doc(transactionRef);
                    transaction.set(newTransRef, {
                        amount: -parseFloat(itemData.price),
                        source: 'Purchase/Expense',
                        caisse: targetCaisse,
                        createdAt: serverTimestamp(),
                        status: 'completed',
                        type: 'expense'
                    });
                } else if (paymentMethod === 'Credit' || paymentMethod === 'Traite') {
                    // Record a Supplier Debt
                    const debtRef = collection(db, 'supplier_debts');
                    const newDebtRef = doc(debtRef);
                    transaction.set(newDebtRef, {
                        supplierName: 'General Supplier', // Could be an input
                        amount: parseFloat(itemData.price),
                        dueDate,
                        type: paymentMethod,
                        status: 'pending',
                        purchaseId: newPurchaseRef.id,
                        createdAt: serverTimestamp()
                    });
                } else if (paymentMethod === 'Bank Loan') {
                    // Link to Bank Loan account (Simple record for now)
                    const loanRef = collection(db, 'bank_loan_records');
                    const newLoanRef = doc(loanRef);
                    transaction.set(newLoanRef, {
                        amount: parseFloat(itemData.price),
                        purchaseId: newPurchaseRef.id,
                        createdAt: serverTimestamp()
                    });
                }
            });

            toast.success("تم تسجيل المشتريات وتحديث الستوك بنجاح");
            setItemData({ name: '', volume: '', quantity: '', category: 'Raw Material', barcode: '', price: '' });
            setDueDate('');
        } catch (error) {
            console.error(error);
            toast.error("خطأ أثناء معالجة العملية");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-slate-900/80 p-8 rounded-[2rem] border border-slate-800 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <FiShoppingCart className="text-orange-500"/> تسجيل مشتريات (سلعة جديدة)
            </h3>
            
            <form onSubmit={handlePurchase} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase">اسم المادة / السلعة</label>
                        <input type="text" value={itemData.name} onChange={e => setItemData({...itemData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none focus:border-orange-500 transition-all"/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase">كود بار (Barcode)</label>
                        <input type="text" value={itemData.barcode} onChange={e => setItemData({...itemData, barcode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none focus:border-orange-500 transition-all"/>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase">الكمية</label>
                        <input type="number" value={itemData.quantity} onChange={e => setItemData({...itemData, quantity: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none"/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase">السعة (L/Kg)</label>
                        <input type="text" value={itemData.volume} onChange={e => setItemData({...itemData, volume: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none"/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-black uppercase">الثمن الإجمالي (TND)</label>
                        <input type="number" value={itemData.price} onChange={e => setItemData({...itemData, price: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-orange-400 font-bold outline-none"/>
                    </div>
                </div>

                <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2"><FiCreditCard/> طريقة الدفع والتمويل</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm outline-none">
                            <option value="Cash">Cash (كاش)</option>
                            <option value="Credit">Credit (دين مورد)</option>
                            <option value="Traite">Traite (كمبيالة)</option>
                            <option value="Bank Loan">Bank Loan (قرض بنكي)</option>
                        </select>

                        {paymentMethod === 'Cash' ? (
                             <select value={targetCaisse} onChange={e => setTargetCaisse(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm outline-none">
                                <option value="caisse_directe">من كاسة المقر</option>
                                <option value="caisse_commerciaux">من كاسة الممثلين</option>
                            </select>
                        ) : (paymentMethod === 'Credit' || paymentMethod === 'Traite') && (
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm outline-none text-white"/>
                        )}
                    </div>
                </div>

                <button disabled={isSaving} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-600/20">
                    {isSaving ? "جاري المعالجة..." : <><FiSave/> تأكيد الشراء وإدخال الستوك</>}
                </button>
            </form>
        </div>
    );
};

export default PurchasesManager;
