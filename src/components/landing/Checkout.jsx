import React, { useState, useEffect } from 'react';

const PACKS = [
  { id: 'x1', qty: 1, amount: 480,  ar: 'زجاجة واحدة',  product_name: 'CINQD Multi-Usage Premium Clean 1L' },
  { id: 'x2', qty: 2, amount: 900,  ar: 'زجاجتان',       product_name: 'CINQD Multi-Usage Premium Clean 1L' },
  { id: 'x3', qty: 3, amount: 1290, ar: '3 زجاجات',     product_name: 'CINQD Multi-Usage Premium Clean 1L' },
];

const WILAYAS = [
  'أدرار','الشلف','الأغواط','أم البواقي','باتنة','بجاية','بسكرة','بشار','البليدة','البويرة',
  'تمنراست','تبسة','تلمسان','تيارت','تيزي وزو','الجزائر','الجلفة','جيجل','سطيف','سعيدة',
  'سكيكدة','سيدي بلعباس','عنابة','قالمة','قسنطينة','المدية','مستغانم','المسيلة','معسكر',
  'ورقلة','وهران','البيض','إليزي','برج بوعريريج','بومرداس','الطارف','تندوف','تيسمسيلت',
  'الوادي','خنشلة','سوق أهراس','تيبازة','ميلة','عين الدفلى','النعامة','عين تموشنت',
  'غرداية','غليزان','تيميمون','برج باجي مختار','أولاد جلال','بني عباس','عين صالح',
  'عين قزام','توقرت','جانت','إن قزام','إن صالح',
];

export default function Checkout() {
  const [pack, setPack]     = useState(PACKS[1]);
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [wilaya, setWilaya] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(null);
  const [error, setError]   = useState('');
  const [affCode, setAffCode] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const ref = p.get('ref') || p.get('code') || p.get('affiliate') || '';
    if (ref) setAffCode(ref);
    if (window.__cinqdPack) setPack(window.__cinqdPack);
    const h = e => setPack(e.detail);
    window.addEventListener('cinqd:pack', h);
    return () => window.removeEventListener('cinqd:pack', h);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !phone.trim() || !wilaya || !address.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    setLoading(true);
    try {
      const body = {
        name:         name.trim(),
        phone:        phone.trim(),
        address:      `${wilaya} — ${address.trim()}`,
        product_name: pack.product_name,
        qty:          pack.qty,
        amount:       pack.amount,
      };
      if (affCode) body.affiliate_code = affCode;
      const res  = await fetch('/api/erp/webhook/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'حدث خطأ، حاول مجدداً'); return; }
      setDone(data.doc_number);
    } catch {
      setError('خطأ في الاتصال، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div id="checkout" className="bg-orange-50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-10 text-center" dir="rtl">
            <div className="text-7xl mb-6">🎉</div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">تم استلام طلبك!</h2>
            <p className="text-gray-500 mb-2">رقم طلبك:</p>
            <p className="font-mono font-black text-orange-500 text-2xl mb-6">{done}</p>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 space-y-2 text-sm text-gray-700">
              <p>📞 سيتصل بك فريقنا خلال <strong>24 ساعة</strong> لتأكيد التوصيل</p>
              <p>🚚 التوصيل خلال <strong>2–3 أيام عمل</strong></p>
              <p>💳 الدفع عند الاستلام — بدون دفع مسبق</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="checkout" className="bg-orange-50 py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12" dir="rtl">
          <h2 className="text-4xl font-black text-gray-900 mb-3">أكمل طلبك</h2>
          <p className="text-gray-500">Finalisez votre commande — Paiement à la livraison</p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

            {/* Pack selector */}
            <div className="bg-gray-50 border-b border-gray-100 p-6" dir="rtl">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">اختر الكمية</p>
              <div className="grid grid-cols-3 gap-2">
                {PACKS.map(p => (
                  <button key={p.id} type="button" onClick={() => setPack(p)}
                    className={`rounded-xl py-3 px-2 text-center text-sm font-black transition-all ${
                      pack.id === p.id
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
                    }`}>
                    <div>{p.ar}</div>
                    <div className={`text-xs font-normal mt-0.5 ${pack.id === p.id ? 'text-orange-100' : 'text-gray-400'}`}>
                      {p.amount.toLocaleString('fr-DZ')} DA
                    </div>
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 flex items-center justify-between bg-orange-500 text-white rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm font-black">{pack.ar} × {Math.round(pack.amount / pack.qty).toLocaleString('fr-DZ')} DA</div>
                  <div className="text-xs text-orange-100">🚚 توصيل مجاني · دفع عند الاستلام</div>
                </div>
                <div className="text-2xl font-black">{pack.amount.toLocaleString('fr-DZ')} DA</div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="p-6 space-y-4" dir="rtl">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-gray-500 mb-1.5">الاسم الكامل *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="مثال: أحمد بن علي" required disabled={loading}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition disabled:opacity-50 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 mb-1.5">رقم الهاتف *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="07 XX XX XX XX" required disabled={loading}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition disabled:opacity-50 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 mb-1.5">الولاية *</label>
                <select value={wilaya} onChange={e => setWilaya(e.target.value)} required disabled={loading}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition disabled:opacity-50 text-right bg-white"
                >
                  <option value="">اختر ولايتك...</option>
                  {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 mb-1.5">العنوان التفصيلي *</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="الحي، الشارع، رقم البناية..." required disabled={loading} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition disabled:opacity-50 resize-none text-right"
                />
              </div>

              {affCode && (
                <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  ✅ كود الشريك مُطبَّق: <span className="font-mono font-bold">{affCode}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 px-8 rounded-2xl text-lg transition-all shadow-lg shadow-orange-200 mt-2">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⏳</span> جاري الإرسال...</span>
                  : `🛒 اطلب الآن — ${pack.amount.toLocaleString('fr-DZ')} DA`
                }
              </button>

              <p className="text-center text-xs text-gray-400 pb-2">
                الدفع عند الاستلام · توصيل مجاني · ضمان الجودة
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
