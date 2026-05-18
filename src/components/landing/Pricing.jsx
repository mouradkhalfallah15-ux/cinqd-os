import React from 'react';

const PACKS = [
  { id: 'x1', label: '1 Bouteille', qty: 1, amount: 480,  product_name: 'CINQD Multi-Usage Premium Clean 1L', badge: null },
  { id: 'x2', label: '2 Bouteilles', qty: 2, amount: 900,  product_name: 'CINQD Multi-Usage Premium Clean 1L', badge: 'Best Seller' },
  { id: 'x3', label: '3 Bouteilles', qty: 3, amount: 1290, product_name: 'CINQD Multi-Usage Premium Clean 1L', badge: 'Meilleur Prix' },
];

function selectPack(pack) {
  if (typeof window !== 'undefined') {
    window.__cinqdPack = pack;
    window.dispatchEvent(new CustomEvent('cinqd:pack', { detail: pack }));
    const el = document.getElementById('checkout');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default function Pricing() {
  return (
    <div className="bg-white py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-4">Choisissez votre Pack</h2>
        <p className="text-center text-gray-500 mb-12">Livraison gratuite · Paiement à la livraison</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {PACKS.map(pack => (
            <div key={pack.id}
              className={`relative rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 border-2 ${
                pack.badge === 'Best Seller'
                  ? 'border-blue-600 shadow-xl scale-105'
                  : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
              }`}
              onClick={() => selectPack(pack)}
            >
              {pack.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {pack.badge}
                </div>
              )}
              <div className="text-5xl mb-4">🧴</div>
              <h3 className="text-xl font-black mb-2">{pack.label}</h3>
              <p className="text-3xl font-black text-blue-600 mb-1">{pack.amount.toLocaleString('fr-DZ')} DA</p>
              <p className="text-sm text-gray-400 mb-6">{Math.round(pack.amount / pack.qty)} DA / bouteille</p>
              <button
                onClick={e => { e.stopPropagation(); selectPack(pack); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl text-base transition-colors"
              >
                Commander →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
