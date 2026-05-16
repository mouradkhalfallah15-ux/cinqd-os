import React, { useState } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, serverTimestamp,
  runTransaction, doc, getDocs, query, where
} from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import {
  FiShoppingCart, FiCreditCard, FiPackage,
  FiSave, FiUser, FiTruck
} from 'react-icons/fi';

// ─── Constants ────────────────────────────────────────────────────────────────
const UNITS      = ['Kg', 'L', 'Unit', 'g', 'ml', 'Tonne'];
const CATEGORIES = ['Raw Material', 'Intermediate Patch'];
const PAYMENT_METHODS = [
  { value: 'Cash',      label: 'Cash (كاش)'           },
  { value: 'Credit',    label: 'Credit (دين مورد)'     },
  { value: 'Traite',    label: 'Traite (كمبيالة)'       },
  { value: 'Bank Loan', label: 'Bank Loan (قرض بنكي)'  },
];

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(item, payment) {
  const name  = item.name.trim();
  const qty   = parseFloat(item.quantity);
  const price = parseFloat(item.totalPrice);
  const min   = parseFloat(item.minThreshold);

  if (!name || name.length < 2)
    return 'اسم المادة مطلوب (حرفان على الأقل).';
  if (isNaN(qty)   || qty <= 0)
    return 'الكمية يجب أن تكون أكبر من صفر.';
  if (isNaN(price) || price <= 0)
    return 'الثمن الإجمالي يجب أن يكون أكبر من صفر.';
  if (isNaN(min)   || min < 0)
    return 'حد التنبيه يجب أن يكون صفراً أو أكثر.';

  if (payment.method === 'Credit' || payment.method === 'Traite') {
    if (!payment.supplierName.trim())
      return 'اسم المورد مطلوب لعمليات الدين والكمبيالة.';
    if (!payment.dueDate)
      return 'تاريخ الخلاص مطلوب.';
    if (new Date(payment.dueDate) <= new Date())
      return 'تاريخ الخلاص يجب أن يكون في المستقبل.';
  }

  if (payment.method === 'Bank Loan') {
    if (!payment.bankName.trim())
      return 'اسم البنك مطلوب.';
    if (!payment.loanReference.trim())
      return 'رقم القرض / المرجع مطلوب.';
    if (!payment.loanDueDate)
      return 'تاريخ استحقاق القرض مطلوب.';
    if (new Date(payment.loanDueDate) <= new Date())
      return 'تاريخ استحقاق القرض يجب أن يكون في المستقبل.';
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function blankItem() {
  return { name: '', quantity: '', unit: 'Kg', category: 'Raw Material', barcode: '', totalPrice: '', minThreshold: '' };
}

function blankPayment() {
  return {
    method:        'Cash',
    targetCaisse:  'caisse_directe',
    supplierName:  '',
    dueDate:       '',
    bankName:      '',
    loanReference: '',
    interestRate:  '',
    loanDueDate:   '',
  };
}

const inputCls = "w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-sm outline-none focus:border-orange-500 transition-all placeholder-slate-600";

// ─── Main Component ───────────────────────────────────────────────────────────
const PurchasesManager = () => {
  const [item, setItem]       = useState(blankItem());
  const [payment, setPayment] = useState(blankPayment());
  const [isSaving, setIsSaving] = useState(false);

  const setItemField    = (k, v) => setItem(prev => ({ ...prev, [k]: v }));
  const setPaymentField = (k, v) => setPayment(prev => ({ ...prev, [k]: v }));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handlePurchase = async (e) => {
    e.preventDefault();

    const error = validate(item, payment);
    if (error) return toast.error(error);

    const name      = item.name.trim();
    const qty       = parseFloat(item.quantity);
    const total     = parseFloat(item.totalPrice);
    const unitPrice = total / qty;
    const minThreshold = parseFloat(item.minThreshold) || 0;
    const isPending = payment.method !== 'Cash';
    const status    = isPending ? 'pending' : 'completed';

    setIsSaving(true);
    try {
      // ── Pre-transaction read: find existing stock doc by name ──────────────
      const existingSnap = await getDocs(
        query(collection(db, 'raw_materials'), where('name', '==', name))
      );
      const existingDoc = existingSnap.empty ? null : existingSnap.docs[0];

      await runTransaction(db, async (transaction) => {

        // 1. Stock — update existing or create new
        if (existingDoc) {
          const stockRef  = doc(db, 'raw_materials', existingDoc.id);
          const stockSnap = await transaction.get(stockRef);
          const currentQty = parseFloat(stockSnap.data()?.quantity) || 0;

          transaction.update(stockRef, {
            quantity:     currentQty + qty,
            unitPrice,               // always update to latest purchase price
            lastUpdated:  serverTimestamp(),
          });
        } else {
          const newStockRef = doc(collection(db, 'raw_materials'));
          transaction.set(newStockRef, {
            name,
            quantity:     qty,
            unit:         item.unit,
            category:     item.category,
            unitPrice,
            minThreshold,
            barcode:      item.barcode.trim(),
            createdAt:    serverTimestamp(),
          });
        }

        // 2. Purchase record
        const purchaseRef = doc(collection(db, 'purchases'));
        transaction.set(purchaseRef, {
          name,
          quantity:      qty,
          unit:          item.unit,
          category:      item.category,
          barcode:       item.barcode.trim(),
          totalPrice:    total,
          unitPrice,
          paymentMethod: payment.method,
          status,
          createdAt:     serverTimestamp(),
        });

        // 3. Financial records by payment method
        if (payment.method === 'Cash') {
          const expRef = doc(collection(db, 'sales_transactions'));
          transaction.set(expRef, {
            amount:    -total,
            source:    `شراء: ${name}`,
            caisse:    payment.targetCaisse,
            type:      'expense',
            status:    'completed',
            purchaseId: purchaseRef.id,
            createdAt: serverTimestamp(),
          });

        } else if (payment.method === 'Credit' || payment.method === 'Traite') {
          const debtRef = doc(collection(db, 'supplier_debts'));
          transaction.set(debtRef, {
            supplierName: payment.supplierName.trim(),
            amount:       total,
            dueDate:      payment.dueDate,
            type:         payment.method,
            status:       'pending',
            purchaseId:   purchaseRef.id,
            itemName:     name,
            createdAt:    serverTimestamp(),
          });

        } else if (payment.method === 'Bank Loan') {
          const loanRef = doc(collection(db, 'bank_loan_records'));
          transaction.set(loanRef, {
            bankName:      payment.bankName.trim(),
            loanReference: payment.loanReference.trim(),
            interestRate:  parseFloat(payment.interestRate) || 0,
            amount:        total,
            dueDate:       payment.loanDueDate,
            status:        'pending',
            purchaseId:    purchaseRef.id,
            itemName:      name,
            createdAt:     serverTimestamp(),
          });
        }
      });

      toast.success(
        existingDoc
          ? `تم إضافة ${qty} ${item.unit} إلى "${name}" وتسجيل الشراء.`
          : `تم تسجيل "${name}" كمادة جديدة وتحديث الستوك.`
      );
      setItem(blankItem());
      setPayment(blankPayment());

    } catch (err) {
      console.error('PurchasesManager error:', err);
      toast.error(err.message || 'خطأ أثناء معالجة العملية. حاول مجدداً.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const qty       = parseFloat(item.quantity);
  const total     = parseFloat(item.totalPrice);
  const unitPrice = (!isNaN(qty) && qty > 0 && !isNaN(total)) ? (total / qty) : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900/80 p-8 rounded-[2rem] border border-slate-800 shadow-2xl">
      <Toaster position="top-right" />

      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
        <FiShoppingCart className="text-orange-500" /> تسجيل مشتريات
      </h3>

      <form onSubmit={handlePurchase} className="space-y-6">

        {/* ── Item Details ── */}
        <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase">
            <FiPackage /> تفاصيل المادة
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase">اسم المادة / السلعة *</label>
              <input
                type="text"
                value={item.name}
                onChange={e => setItemField('name', e.target.value)}
                placeholder="ex: Sucre"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase">كود بار (Barcode)</label>
              <input
                type="text"
                value={item.barcode}
                onChange={e => setItemField('barcode', e.target.value)}
                placeholder="اختياري"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase">الصنف</label>
              <select
                value={item.category}
                onChange={e => setItemField('category', e.target.value)}
                className={inputCls}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase">الوحدة</label>
              <select
                value={item.unit}
                onChange={e => setItemField('unit', e.target.value)}
                className={inputCls}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase">حد التنبيه *</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={item.minThreshold}
                onChange={e => setItemField('minThreshold', e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase">الكمية *</label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={item.quantity}
                onChange={e => setItemField('quantity', e.target.value)}
                placeholder="0.000"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase">الثمن الإجمالي (TND) *</label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={item.totalPrice}
                onChange={e => setItemField('totalPrice', e.target.value)}
                placeholder="0.000"
                className={`${inputCls} text-orange-400 font-bold`}
              />
            </div>
          </div>

          {/* Unit price preview */}
          {unitPrice !== null && (
            <div className="flex justify-between text-xs text-slate-500 bg-slate-900 px-4 py-2 rounded-lg">
              <span>سعر الوحدة المحسوب</span>
              <span className="text-orange-400 font-black">
                {unitPrice.toFixed(3)} TND / {item.unit}
              </span>
            </div>
          )}
        </div>

        {/* ── Payment Details ── */}
        <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase">
            <FiCreditCard /> طريقة الدفع والتمويل
          </h4>

          <select
            value={payment.method}
            onChange={e => setPaymentField('method', e.target.value)}
            className={inputCls}
          >
            {PAYMENT_METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Cash — caisse selector */}
          {payment.method === 'Cash' && (
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase">من أي كاسة؟</label>
              <select
                value={payment.targetCaisse}
                onChange={e => setPaymentField('targetCaisse', e.target.value)}
                className={inputCls}
              >
                <option value="caisse_directe">كاسة المقر (Directe)</option>
                <option value="caisse_commerciaux">كاسة الممثلين (Commerciaux)</option>
              </select>
            </div>
          )}

          {/* Credit / Traite — supplier + due date */}
          {(payment.method === 'Credit' || payment.method === 'Traite') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase flex items-center gap-1">
                  <FiTruck size={10} /> اسم المورد *
                </label>
                <input
                  type="text"
                  value={payment.supplierName}
                  onChange={e => setPaymentField('supplierName', e.target.value)}
                  placeholder="ex: Fournisseur ABC"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase">تاريخ الخلاص *</label>
                <input
                  type="date"
                  value={payment.dueDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setPaymentField('dueDate', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* Bank Loan — full loan details */}
          {payment.method === 'Bank Loan' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase">اسم البنك *</label>
                <input
                  type="text"
                  value={payment.bankName}
                  onChange={e => setPaymentField('bankName', e.target.value)}
                  placeholder="ex: STB, BIAT, BNA..."
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase">رقم القرض / المرجع *</label>
                <input
                  type="text"
                  value={payment.loanReference}
                  onChange={e => setPaymentField('loanReference', e.target.value)}
                  placeholder="ex: LN-2025-001"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase">نسبة الفائدة (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payment.interestRate}
                  onChange={e => setPaymentField('interestRate', e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase">تاريخ الاستحقاق *</label>
                <input
                  type="date"
                  value={payment.loanDueDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setPaymentField('loanDueDate', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-600/20"
        >
          {isSaving
            ? 'جارٍ المعالجة...'
            : <><FiSave /> تأكيد الشراء وتحديث الستوك</>
          }
        </button>
      </form>
    </div>
  );
};

export default PurchasesManager;
