import React from 'react';

const PACKS = [
  {
    id: 'x1',
    qty: 1,
    amount: 480,
    product_name: 'CINQD Multi-Usage Premium Clean 1L',
    ar: 'زجاجة واحدة',
    fr: '1 Bouteille',
    per: '480 DA / زجاجة',
    badge: null,
    color: 'border-gray-200',
    img: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&q=80',
  },
  {
    id: 'x2',
    qty: 2,
    amount: 900,
    product_name: 'CINQD Multi-Usage Premium Clean 1L',
    ar: 'زجاجتان',
    fr: '2 Bouteilles',
    per: '450 DA / زجاجة',
    badge: '🔥 الأكثر طلباً',
    color: 'border-orange-400',
    img: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&q=80',
  },
  {
    id: 'x3',
    qty: 3,
    amount: 1290,
    product_name: 'CINQD Multi-Usage Premium Clean 1L',
    ar: '3 زجاجات',
    fr: '3 Bouteilles',
    per: '430 DA / زجاجة',
    badge: '💰 أوفر سعر',
    color: 'border-gray-200',
    img: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=300&q=80',
  },
];

function selectPack(pack) {
  if (typeof window === 'undefined') return;
  window.__cinqdPack = pack;
  window.dispatchEvent(new CustomEvent('cinqd:pack', { detail: pack }));
  document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Pricing() {
  return (
    <div className="bg-[#fafafa] py-20">
      <div className="container mx-auto px-6">

        <div className="text-center mb-14" dir="rtl">
          <h2 className="text-4xl font-black text-gray-900 mb-3">اختر حجمك</h2>
          <p className="text-gray-500">Choisissez votre pack — Livraison gratuite · Paiement à la livraison</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PACKS.map(pack => (
            <div key={pack.id}
              onClick={() => selectPack(pack)}
              className={`relative bg-white border-2 ${pack.color} rounded-2xl overflow-hidden text-center cursor-pointer transition-all hover:shadow-lg hover:border-orange-300 hover:-translate-y-1 ${pack.badge?.includes('طلباً') ? 'shadow-xl ring-2 ring-orange-400/30' : ''}`}
              dir="rtl"
            >
              {pack.badge && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-orange-500 text-white text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap">
                  {pack.badge}
                </div>
              )}

              {/* Product image */}
              <div className="relative h-48 overflow-hidden bg-gray-50">
                <img
                  src={pack.img}
                  alt={pack.ar}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* qty overlay */}
                <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-orange-600 font-black text-sm px-2 py-0.5 rounded-full border border-orange-200">
                  ×{pack.qty}
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-black text-gray-900 mb-1">{pack.ar}</h3>
                <p className="text-sm text-gray-400 mb-4">{pack.fr}</p>

                <div className="text-4xl font-black text-orange-500 mb-1">
                  {pack.amount.toLocaleString('fr-DZ')} <span className="text-lg">DA</span>
                </div>
                <p className="text-xs text-gray-400 mb-6">{pack.per}</p>

                <button
                  onClick={e => { e.stopPropagation(); selectPack(pack); }}
                  className={`w-full font-black py-3 px-6 rounded-xl text-base transition-colors ${
                    pack.badge?.includes('طلباً')
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200'
                      : 'bg-gray-100 hover:bg-orange-500 hover:text-white text-gray-800'
                  }`}
                >
                  اطلب الآن ←
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Trust row */}
        <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-gray-500" dir="rtl">
          {['🔒 دفع آمن','🚚 توصيل لجميع الولايات','📞 دعم على واتساب','✅ ضمان الجودة'].map(t => (
            <span key={t} className="font-medium">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
