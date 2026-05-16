import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, serverTimestamp,
  runTransaction, doc, onSnapshot, query, orderBy
} from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import {
  FiFileText, FiTruck, FiPlus, FiPrinter,
  FiCheckCircle, FiTrash2, FiAlertCircle
} from 'react-icons/fi';

// ─── Company Config ───────────────────────────────────────────────────────────
// Set these in your .env file:
//   PUBLIC_FISCAL_ID=your_fiscal_id
//   PUBLIC_COMPANY_ADDRESS=your_address
//   PUBLIC_COMPANY_NAME=your_company_name
const COMPANY = {
  name:     import.meta.env.PUBLIC_COMPANY_NAME    || 'CINQD INDUSTRIAL',
  fiscalId: import.meta.env.PUBLIC_FISCAL_ID        || 'À CONFIGURER',
  address:  import.meta.env.PUBLIC_COMPANY_ADDRESS  || 'À CONFIGURER',
};

// ─── Tax Constants (Tunisia 2024) ─────────────────────────────────────────────
const TVA_RATE = 0.19;

// ─── Document Type Config ─────────────────────────────────────────────────────
const SALES_TYPES     = ['Devis', 'Bon de commande client', 'Bon de livraison', 'Facture client', 'Avoir'];
const PURCHASE_TYPES  = ["Demande d'achat", 'Bon de commande', "Bon d'achat / Livraison", "Facture d'achat", 'Avoir fournisseur'];
const STOCK_OUT_TYPES = ['Bon de livraison'];
const STOCK_IN_TYPES  = ["Bon d'achat / Livraison"];
const TVA_TYPES       = ['Facture client', "Facture d'achat", 'Devis'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blankItem() {
  return { stockId: '', name: '', quantity: 1, unitPrice: 0 };
}

function itemTotal(item) {
  const qty   = parseFloat(item.quantity)  || 0;
  const price = parseFloat(item.unitPrice) || 0;
  return qty * price;
}

function calcTotals(items) {
  const totalHT  = items.reduce((acc, i) => acc + itemTotal(i), 0);
  const totalTVA = totalHT * TVA_RATE;
  const totalTTC = totalHT + totalTVA;
  return { totalHT, totalTVA, totalTTC };
}

// Sequential document number using a Firestore counter (atomic)
async function getNextDocNumber(transaction, docType) {
  const key        = `doc_${docType.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
  const counterRef = doc(db, 'counters', key);
  const snap       = await transaction.get(counterRef);
  const next       = (snap.exists() ? snap.data().count : 0) + 1;
  transaction.set(counterRef, { count: next }, { merge: true });
  const prefix = docType.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X');
  return `${prefix}-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateDocument(clientData, items) {
  if (!clientData.name || clientData.name.trim().length < 2)
    return 'اسم العميل / المورد مطلوب (حرفان على الأقل).';

  if (items.length === 0)
    return 'أضف بنداً واحداً على الأقل.';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.stockId)
      return `البند ${i + 1}: اختر مادة من القائمة.`;
    const qty   = parseFloat(item.quantity);
    const price = parseFloat(item.unitPrice);
    if (isNaN(qty)  || qty <= 0)
      return `البند ${i + 1}: الكمية يجب أن تكون أكبر من صفر.`;
    if (isNaN(price) || price < 0)
      return `البند ${i + 1}: السعر غير صالح.`;
  }
  return null;
}

// ─── Print Layout ─────────────────────────────────────────────────────────────

const PrintLayout = ({ docType, docNumber, clientData, deliveryData, items, showTVA }) => {
  const { totalHT, totalTVA, totalTTC } = calcTotals(items);
  const fmt = n => (typeof n === 'number' ? n.toFixed(3) : '—');

  return (
    <div className="hidden print:block fixed inset-0 bg-white text-black p-10 z-[1000] text-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-black">
        <div>
          <h1 className="text-3xl font-black uppercase mb-1">{COMPANY.name}</h1>
          <p>Matricule Fiscal: <strong>{COMPANY.fiscalId}</strong></p>
          <p>Adresse: {COMPANY.address}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold uppercase">{docType}</h2>
          <p>N°: <strong>{docNumber || 'BROUILLON'}</strong></p>
          <p>Date: {new Date().toLocaleDateString('fr-TN')}</p>
        </div>
      </div>

      {/* Client */}
      <div className="mb-8 p-4 border border-black rounded">
        <p className="font-bold uppercase text-xs mb-1">Destinataire / Client</p>
        <p className="font-bold text-base">{clientData.name}</p>
        {clientData.address && <p>{clientData.address}</p>}
        {STOCK_OUT_TYPES.includes(docType) && (
          <p className="mt-2">
            <strong>Mode de livraison:</strong> {deliveryData.type}
            {deliveryData.carrier && ` — ${deliveryData.carrier}`}
            {deliveryData.vehicle && ` | Véhicule: ${deliveryData.vehicle}`}
          </p>
        )}
      </div>

      {/* Items */}
      <table className="w-full border-collapse border border-black mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left">Article</th>
            <th className="border border-black p-2 text-center">Qté</th>
            <th className="border border-black p-2 text-right">Prix Unit. HT</th>
            <th className="border border-black p-2 text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="border border-black p-2">{item.name}</td>
              <td className="border border-black p-2 text-center">{item.quantity}</td>
              <td className="border border-black p-2 text-right">{fmt(parseFloat(item.unitPrice))}</td>
              <td className="border border-black p-2 text-right">{fmt(itemTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="text-right space-y-1 mb-12">
        <p>Total HT: <strong>{fmt(totalHT)} TND</strong></p>
        {showTVA && (
          <>
            <p>TVA ({(TVA_RATE * 100).toFixed(0)}%): <strong>{fmt(totalTVA)} TND</strong></p>
            <p className="text-xl font-black border-t-2 border-black pt-2">
              Total TTC: {fmt(totalTTC)} TND
            </p>
          </>
        )}
        {!showTVA && (
          <p className="text-xl font-black border-t-2 border-black pt-2">
            Total: {fmt(totalHT)} TND
          </p>
        )}
      </div>

      {/* Signatures */}
      <div className="flex justify-around text-center text-xs italic mt-20">
        <div>Signature & Cachet<br />{COMPANY.name}</div>
        <div>Accusé de réception<br />Client / Destinataire</div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const InvoicingManager = () => {
  const [tab, setTab]               = useState('Sales');
  const [docType, setDocType]       = useState('Devis');
  const [items, setItems]           = useState([blankItem()]);
  const [clientData, setClientData] = useState({ name: '', address: '' });
  const [deliveryData, setDeliveryData] = useState({ type: 'Direct', carrier: '', vehicle: '' });
  const [stock, setStock]           = useState([]);
  const [isSaving, setIsSaving]     = useState(false);
  const [docNumber, setDocNumber]   = useState('');

  // Firestore stock listener with error handler
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'raw_materials'),
      (snapshot) => setStock(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => {
        console.error('InvoicingManager stock error:', error);
        toast.error('خطأ في تحميل المخزون.');
      }
    );
    return () => unsub();
  }, []);

  // ── Item Management ─────────────────────────────────────────────────────────
  const updateItem = useCallback((index, fields) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...fields };
      return next;
    });
  }, []);

  const removeItem = useCallback((index) => {
    setItems(prev => prev.length === 1 ? [blankItem()] : prev.filter((_, i) => i !== index));
  }, []);

  const handleStockSelect = useCallback((index, stockId) => {
    const selected = stock.find(s => s.id === stockId);
    updateItem(index, {
      stockId,
      name:      selected?.name      ?? '',
      unitPrice: selected?.unitPrice ?? 0,
    });
  }, [stock, updateItem]);

  // ── Tab switch resets docType ───────────────────────────────────────────────
  const switchTab = (newTab) => {
    setTab(newTab);
    setDocType(newTab === 'Sales' ? 'Devis' : "Bon de commande");
    setItems([blankItem()]);
    setClientData({ name: '', address: '' });
    setDocNumber('');
  };

  // ── Create Document ─────────────────────────────────────────────────────────
  const handleCreateDocument = async () => {
    const validationError = validateDocument(clientData, items);
    if (validationError) return toast.error(validationError);

    setIsSaving(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Sequential document number
        const number = await getNextDocNumber(transaction, docType);

        // 2. Stock operations — reads MUST come before writes in Firestore transactions
        const isStockOut = STOCK_OUT_TYPES.includes(docType);
        const isStockIn  = STOCK_IN_TYPES.includes(docType);

        const stockUpdates = [];

        if (isStockOut || isStockIn) {
          for (const item of items) {
            if (!item.stockId) continue;
            const stockRef  = doc(db, 'raw_materials', item.stockId);
            const stockSnap = await transaction.get(stockRef);

            if (!stockSnap.exists()) {
              throw new Error(`المادة "${item.name}" غير موجودة في المخزون.`);
            }

            const currentQty = parseFloat(stockSnap.data().quantity) || 0;
            const qty        = parseFloat(item.quantity);

            if (isStockOut && currentQty < qty) {
              throw new Error(
                `مخزون "${item.name}" غير كافٍ. متوفر: ${currentQty}, مطلوب: ${qty}`
              );
            }

            const newQty = isStockOut ? currentQty - qty : currentQty + qty;
            stockUpdates.push({ ref: stockRef, quantity: newQty });
          }
        }

        // 3. All reads done — now write
        const newDocRef = doc(collection(db, 'documents'));
        transaction.set(newDocRef, {
          tab,
          docType,
          docNumber: number,
          client:   clientData,
          delivery: deliveryData,
          items:    items.map(i => ({
            stockId:   i.stockId,
            name:      i.name,
            quantity:  parseFloat(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
            total:     itemTotal(i),
          })),
          totalHT:  calcTotals(items).totalHT,
          totalTVA: TVA_TYPES.includes(docType) ? calcTotals(items).totalTVA : 0,
          totalTTC: calcTotals(items).totalTTC,
          status:   'confirmed',
          createdAt: serverTimestamp(),
        });

        stockUpdates.forEach(({ ref, quantity }) => {
          transaction.update(ref, { quantity });
        });

        setDocNumber(number);
      });

      toast.success(`${docType} enregistré avec succès`);
    } catch (error) {
      console.error('Document creation error:', error);
      toast.error(error.message || 'خطأ في معالجة الوثيقة.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const { totalHT, totalTVA, totalTTC } = calcTotals(items);
  const showTVA   = TVA_TYPES.includes(docType);
  const inputCls  = "w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500 placeholder-slate-600";

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl">
      <Toaster position="top-right" />

      <PrintLayout
        docType={docType}
        docNumber={docNumber}
        clientData={clientData}
        deliveryData={deliveryData}
        items={items}
        showTVA={showTVA}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => switchTab('Sales')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${tab === 'Sales' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Sales (المبيعات)
          </button>
          <button
            onClick={() => switchTab('Purchases')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${tab === 'Purchases' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Purchases (الشراءات)
          </button>
        </div>
        <button
          onClick={() => window.print()}
          className="p-4 bg-slate-800 rounded-2xl text-white hover:bg-slate-700 transition-all border border-slate-700"
          title="طباعة"
        >
          <FiPrinter size={20} />
        </button>
      </div>

      {/* Fiscal ID warning if not configured */}
      {COMPANY.fiscalId === 'À CONFIGURER' && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm rounded-2xl px-5 py-3 mb-8">
          <FiAlertCircle className="flex-shrink-0" />
          <span>
            المعرّف الجبائي غير مضبوط. أضف <code className="bg-slate-800 px-1 rounded">PUBLIC_FISCAL_ID</code> في ملف <code className="bg-slate-800 px-1 rounded">.env</code> قبل طباعة أي وثيقة رسمية.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Left Panel */}
        <div className="lg:col-span-4 space-y-6">

          {/* Document type */}
          <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 block">
              Type de Document
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className={inputCls}
            >
              {(tab === 'Sales' ? SALES_TYPES : PURCHASE_TYPES).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {docNumber && (
              <p className="text-xs text-cyan-400 font-mono mt-3">N°: {docNumber}</p>
            )}
          </div>

          {/* Client info */}
          <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 space-y-4">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">
              Client / Fournisseur
            </label>
            <input
              type="text"
              placeholder="Nom complet *"
              value={clientData.name}
              onChange={e => setClientData({ ...clientData, name: e.target.value })}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="Adresse"
              value={clientData.address}
              onChange={e => setClientData({ ...clientData, address: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Delivery details — only for BL, all inputs fully bound */}
          {STOCK_OUT_TYPES.includes(docType) && (
            <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-3xl space-y-4">
              <h4 className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase">
                <FiTruck /> Détails Bon de Sortie
              </h4>
              <select
                value={deliveryData.type}
                onChange={e => setDeliveryData({ ...deliveryData, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white outline-none"
              >
                <option value="Direct">Direct / B2B (شاحنة الشركة)</option>
                <option value="E-commerce">E-commerce (شركة توصيل)</option>
              </select>
              <input
                type="text"
                placeholder={deliveryData.type === 'E-commerce' ? 'Société de livraison' : 'Chauffeur'}
                value={deliveryData.carrier}
                onChange={e => setDeliveryData({ ...deliveryData, carrier: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white outline-none placeholder-slate-600"
              />
              <input
                type="text"
                placeholder="Matricule Véhicule"
                value={deliveryData.vehicle}
                onChange={e => setDeliveryData({ ...deliveryData, vehicle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white outline-none placeholder-slate-600"
              />
            </div>
          )}
        </div>

        {/* Right Panel — Items */}
        <div className="lg:col-span-8">
          <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Article</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Qté</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Prix Unit. HT</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500 text-right">Total HT</th>
                  <th className="p-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-900/50">
                    <td className="p-2">
                      <select
                        value={item.stockId}
                        onChange={e => handleStockSelect(index, e.target.value)}
                        className="w-full bg-transparent text-white p-2 text-sm outline-none"
                      >
                        <option value="">Sélectionner *</option>
                        {stock.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={e => updateItem(index, { quantity: e.target.value })}
                        className="w-20 bg-slate-900 border border-slate-800 p-2 rounded-lg text-sm text-center outline-none text-white"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.unitPrice}
                        onChange={e => updateItem(index, { unitPrice: e.target.value })}
                        className="w-28 bg-slate-900 border border-slate-800 p-2 rounded-lg text-sm text-center outline-none text-green-400 font-bold"
                      />
                    </td>
                    <td className="p-4 text-right font-bold text-white">
                      {itemTotal(item).toFixed(3)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                        title="حذف البند"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setItems(prev => [...prev, blankItem()])}
              className="w-full p-4 text-slate-500 hover:text-white flex items-center justify-center gap-2 transition-all border-t border-slate-800"
            >
              <FiPlus /> Ajouter un article
            </button>
          </div>

          {/* Totals */}
          <div className="mt-8 flex justify-between items-end gap-6">
            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-2 min-w-[220px]">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total HT</span>
                <span className="font-mono">{totalHT.toFixed(3)} TND</span>
              </div>
              {showTVA && (
                <div className="flex justify-between text-xs text-blue-400">
                  <span>TVA ({(TVA_RATE * 100).toFixed(0)}%)</span>
                  <span className="font-mono">{totalTVA.toFixed(3)} TND</span>
                </div>
              )}
              <div className="flex justify-between text-white font-black border-t border-slate-700 pt-2">
                <span>{showTVA ? 'Total TTC' : 'Total'}</span>
                <span className="font-mono text-lg">
                  {(showTVA ? totalTTC : totalHT).toFixed(3)} TND
                </span>
              </div>
            </div>

            <button
              onClick={handleCreateDocument}
              disabled={isSaving}
              className="px-12 py-5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-green-600/20"
            >
              <FiCheckCircle size={24} />
              {isSaving ? 'جارٍ الحفظ...' : STOCK_OUT_TYPES.includes(docType) ? 'Valider & Bon de Sortie' : 'Valider Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicingManager;
