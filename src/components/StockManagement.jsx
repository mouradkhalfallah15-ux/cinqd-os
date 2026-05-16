import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query, where, getDocs, doc, updateDoc, increment
} from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import {
  FiPackage, FiLayers, FiAlertTriangle, FiPlus,
  FiSearch, FiRefreshCw, FiX, FiCheck
} from 'react-icons/fi';

// ─── Constants ────────────────────────────────────────────────────────────────
const UNITS      = ['Kg', 'L', 'Unit', 'g', 'ml', 'Tonne'];
const CATEGORIES = ['Raw Material', 'Intermediate Patch'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stockValue(material) {
  const qty   = typeof material.quantity  === 'number' ? material.quantity  : 0;
  const price = typeof material.unitPrice === 'number' ? material.unitPrice : 0;
  return (qty * price).toFixed(3);
}

function blankCompositionItem() {
  return { materialId: '', materialName: '', quantity: '', unit: 'Kg' };
}

// ─── Restock Modal ────────────────────────────────────────────────────────────
const RestockModal = ({ material, onConfirm, onClose }) => {
  const [qty, setQty] = useState('');

  const handleConfirm = () => {
    const val = parseFloat(qty);
    if (isNaN(val) || val <= 0) return toast.error('الكمية يجب أن تكون أكبر من صفر.');
    onConfirm(material.id, val);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-white">تجديد المخزون</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><FiX /></button>
        </div>
        <p className="text-sm text-slate-400">
          المادة: <strong className="text-white">{material.name}</strong><br />
          الكمية الحالية: <strong className="text-yellow-400">{material.quantity} {material.unit}</strong>
        </p>
        <div>
          <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">
            الكمية المضافة ({material.unit})
          </label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={qty}
            onChange={e => setQty(e.target.value)}
            autoFocus
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-yellow-500"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black py-2 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <FiCheck /> تأكيد الإضافة
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const StockManagement = () => {
  const [materials, setMaterials]   = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving]     = useState(false);
  const [restockTarget, setRestockTarget] = useState(null); // material being restocked

  // Form state
  const [form, setForm] = useState({
    name:        '',
    unit:        'Kg',
    quantity:    '',
    category:    'Raw Material',
    unitPrice:   '',
    minThreshold: '',
  });
  const [composition, setComposition] = useState([]); // structured: [{ materialId, materialName, quantity, unit }]

  // ── Firestore listener ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'raw_materials'),
      (snapshot) => setMaterials(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => {
        console.error('StockManagement error:', error);
        toast.error('خطأ في تحميل المخزون. تحقق من الاتصال.');
      }
    );
    return () => unsub();
  }, []);

  // ── Derived filtered list (no redundant state) ────────────────────────────
  const filtered = materials.filter(m =>
    (m.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (m.id?.toLowerCase()   || '').includes(searchTerm.toLowerCase())
  );

  // ── Form helpers ──────────────────────────────────────────────────────────
  const setField = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = () => {
    setForm({ name: '', unit: 'Kg', quantity: '', category: 'Raw Material', unitPrice: '', minThreshold: '' });
    setComposition([]);
  };

  // ── Composition management ────────────────────────────────────────────────
  const addCompositionItem = () => setComposition(prev => [...prev, blankCompositionItem()]);

  const updateCompositionItem = (index, fields) => {
    setComposition(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...fields };
      return next;
    });
  };

  const removeCompositionItem = (index) => {
    setComposition(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompositionMaterialSelect = (index, materialId) => {
    const selected = materials.find(m => m.id === materialId);
    updateCompositionItem(index, {
      materialId,
      materialName: selected?.name ?? '',
      unit:         selected?.unit ?? 'Kg',
    });
  };

  // ── Add Material ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const name  = form.name.trim();
    const qty   = parseFloat(form.quantity);
    const price = parseFloat(form.unitPrice);
    const min   = parseFloat(form.minThreshold);

    if (!name)
      return toast.error('اسم المادة مطلوب.');
    if (isNaN(qty)   || qty < 0)
      return toast.error('الكمية يجب أن تكون صفراً أو أكثر.');
    if (isNaN(price) || price < 0)
      return toast.error('السعر يجب أن يكون صفراً أو أكثر.');
    if (isNaN(min)   || min < 0)
      return toast.error('الحد الأدنى يجب أن يكون صفراً أو أكثر.');

    if (form.category === 'Intermediate Patch') {
      for (let i = 0; i < composition.length; i++) {
        const c = composition[i];
        if (!c.materialId)
          return toast.error(`مكوّن ${i + 1}: اختر المادة من القائمة.`);
        if (!c.quantity || parseFloat(c.quantity) <= 0)
          return toast.error(`مكوّن ${i + 1}: الكمية يجب أن تكون أكبر من صفر.`);
      }
    }

    setIsSaving(true);
    try {
      // Duplicate name check
      const existing = await getDocs(
        query(collection(db, 'raw_materials'), where('name', '==', name))
      );
      if (!existing.empty) {
        toast.error(`"${name}" موجود مسبقاً في المخزون.`);
        return;
      }

      const payload = {
        name,
        unit:         form.unit,
        quantity:     qty,
        category:     form.category,
        unitPrice:    price,
        minThreshold: min,
        createdAt:    serverTimestamp(),
      };

      if (form.category === 'Intermediate Patch') {
        payload.composition = composition.map(c => ({
          materialId:   c.materialId,
          materialName: c.materialName,
          quantity:     parseFloat(c.quantity),
          unit:         c.unit,
        }));
      }

      await addDoc(collection(db, 'raw_materials'), payload);
      toast.success(`"${name}" تمت الإضافة بنجاح.`);
      resetForm();
    } catch (error) {
      console.error('Add material error:', error);
      toast.error('فشل في إضافة المادة. حاول مجدداً.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Quick Restock ─────────────────────────────────────────────────────────
  const handleRestock = async (materialId, addedQty) => {
    try {
      await updateDoc(doc(db, 'raw_materials', materialId), {
        quantity: increment(addedQty),
      });
      const material = materials.find(m => m.id === materialId);
      toast.success(`تم إضافة ${addedQty} ${material?.unit ?? ''} إلى "${material?.name}".`);
      setRestockTarget(null);
    } catch (error) {
      console.error('Restock error:', error);
      toast.error('خطأ في تحديث المخزون.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const inputCls = "w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-slate-500";

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans">
      <Toaster position="top-right" toastOptions={{ style: { background: '#334155', color: '#fff' } }} />

      {restockTarget && (
        <RestockModal
          material={restockTarget}
          onConfirm={handleRestock}
          onClose={() => setRestockTarget(null)}
        />
      )}

      <main className="container mx-auto px-4 py-12">
        <header className="flex items-center mb-12">
          <a href="/industrial" className="text-red-500 hover:text-red-400 transition-colors mr-4">
            &lt; Back to Dashboard
          </a>
          <h1 className="text-4xl font-extrabold">
            Stock <span className="text-red-500">Management</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Add New Item Form ── */}
          <div className="lg:col-span-1 bg-slate-800 rounded-xl shadow-lg p-8 h-fit">
            <h2 className="text-2xl font-bold text-slate-200 mb-6 flex items-center">
              <FiPlus className="mr-2" /> Add New Item
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                <select
                  value={form.category}
                  onChange={e => setField('category', e.target.value)}
                  className={inputCls}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="ex: Sucre"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.quantity}
                    onChange={e => setField('quantity', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Unit</label>
                  <select
                    value={form.unit}
                    onChange={e => setField('unit', e.target.value)}
                    className={inputCls}
                  >
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Unit Price (TND) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.unitPrice}
                    onChange={e => setField('unitPrice', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Min. Threshold *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.minThreshold}
                    onChange={e => setField('minThreshold', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Structured composition for Intermediate Patch */}
              {form.category === 'Intermediate Patch' && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-400">Composition</label>
                    <button
                      type="button"
                      onClick={addCompositionItem}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <FiPlus size={12} /> Add Component
                    </button>
                  </div>
                  {composition.length === 0 && (
                    <p className="text-xs text-slate-600 italic">No components added yet.</p>
                  )}
                  {composition.map((comp, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 items-center">
                      <select
                        value={comp.materialId}
                        onChange={e => handleCompositionMaterialSelect(i, e.target.value)}
                        className="col-span-2 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="">Material *</option>
                        {materials
                          .filter(m => m.category === 'Raw Material')
                          .map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                        }
                      </select>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        placeholder="Qty *"
                        value={comp.quantity}
                        onChange={e => updateCompositionItem(i, { quantity: e.target.value })}
                        className="col-span-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                      />
                      <select
                        value={comp.unit}
                        onChange={e => updateCompositionItem(i, { unit: e.target.value })}
                        className="col-span-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                      >
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeCompositionItem(i)}
                        className="text-slate-500 hover:text-red-400 transition-colors justify-self-center"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center mt-6"
              >
                <FiPlus className="mr-2" />
                {isSaving ? 'Saving...' : 'Add Item to Inventory'}
              </button>
            </form>
          </div>

          {/* ── Inventory Table ── */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-lg p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold text-slate-200 flex items-center">
                <FiPackage className="mr-3" /> Current Inventory
              </h2>
              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-sm tracking-wider">Item</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-sm tracking-wider">Qty / Unit</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-sm tracking-wider">Stock Value</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-sm tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-600">
                        {searchTerm
                          ? `لا توجد نتائج لـ "${searchTerm}"`
                          : 'المخزون فارغ. أضف أول مادة من النموذج.'}
                      </td>
                    </tr>
                  ) : filtered.map((material) => {
                    const isLow = (material.quantity ?? 0) < (material.minThreshold ?? 0);
                    return (
                      <tr
                        key={material.id}
                        className={`border-b border-slate-800 hover:bg-slate-700/50 transition-colors ${isLow ? 'bg-red-900/20' : ''}`}
                      >
                        <td className="py-4 px-4 text-white">
                          <div className="flex items-center">
                            {material.category === 'Raw Material'
                              ? <FiPackage size={20} className="mr-4 text-red-500 flex-shrink-0" />
                              : <FiLayers  size={20} className="mr-4 text-blue-500 flex-shrink-0" />
                            }
                            <div>
                              <p className="font-bold">{material.name}</p>
                              <p className="text-xs text-slate-400">{material.category}</p>
                              {material.category === 'Intermediate Patch' && Array.isArray(material.composition) && (
                                <p className="text-xs text-blue-400 mt-0.5">
                                  {material.composition.map(c => `${c.materialName} ×${c.quantity}${c.unit}`).join(' | ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className={`py-4 px-4 font-mono ${isLow ? 'text-red-400' : 'text-white'}`}>
                          <div className="flex items-center gap-2">
                            {isLow && <FiAlertTriangle title="Low Stock" className="text-red-400" />}
                            {material.quantity ?? '—'} {material.unit}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-white font-mono">
                          {stockValue(material)} TND
                        </td>

                        <td className="py-4 px-4">
                          <button
                            onClick={() => setRestockTarget(material)}
                            className={`flex items-center gap-1 text-xs font-bold py-1.5 px-3 rounded-full transition-colors ${
                              isLow
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                            }`}
                          >
                            <FiRefreshCw size={12} />
                            {isLow ? 'Restock!' : 'Add Stock'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary footer */}
            {filtered.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between text-sm text-slate-400">
                <span>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
                <span>
                  Total Value:{' '}
                  <strong className="text-white">
                    {filtered.reduce((acc, m) => acc + parseFloat(stockValue(m)), 0).toFixed(3)} TND
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StockManagement;
