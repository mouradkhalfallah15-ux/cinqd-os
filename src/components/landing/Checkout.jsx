import React, { useState, useEffect } from 'react';

const PACKS = [
  { id: 'x1', label: '1 Bouteille',  qty: 1, amount: 480,  product_name: 'CINQD Multi-Usage Premium Clean 1L' },
  { id: 'x2', label: '2 Bouteilles', qty: 2, amount: 900,  product_name: 'CINQD Multi-Usage Premium Clean 1L' },
  { id: 'x3', label: '3 Bouteilles', qty: 3, amount: 1290, product_name: 'CINQD Multi-Usage Premium Clean 1L' },
];

export default function Checkout() {
  const [pack, setPack]       = useState(PACKS[1]);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(null);
  const [error, setError]     = useState('');
  const [affCode, setAffCode] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('code') || params.get('affiliate') || '';
    if (ref) setAffCode(ref);
    if (window.__cinqdPack) setPack(window.__cinqdPack);
    const handler = e => setPack(e.detail);
    window.addEventListener('cinqd:pack', handler);
    return () => window.removeEventListener('cinqd:pack', handler);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      const body = {
        name:         name.trim(),
        phone:        phone.trim(),
        address:      address.trim(),
        product_name: pack.product_name,
        qty:          pack.qty,
        amount:       pack.amount,
      };
      if (affCode) body.affiliate_code = affCode;
      const res = await fetch('/api/erp/webhook/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erreur. Veuillez réessayer.'); return; }
      setDone(data.doc_number);
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div id="checkout" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-10 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Commande Confirmée !</h2>
            <p className="text-gray-500 mb-4">Votre commande <span className="font-mono font-bold text-blue-600">{done}</span> a été enregistrée.</p>
            <p className="text-sm text-gray-400">Notre équipe vous contactera dans les 24h pour confirmer la livraison.</p>
            <div className="mt-6 bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700 font-medium">
              🚚 Livraison sous 2–3 jours ouvrables · Paiement à la livraison
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="checkout" className="bg-gray-50 py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-3">Commander</h2>
        <p className="text-center text-gray-500 mb-10">Paiement à la livraison · Livraison partout en Algérie</p>

        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-8 space-y-6">

          {/* Pack selector */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Pack sélectionné</p>
            <div className="grid grid-cols-3 gap-2">
              {PACKS.map(p => (
                <button key={p.id} type="button" onClick={() => setPack(p)}
                  className={`rounded-xl py-3 px-2 text-center text-sm font-black transition-all ${
                    pack.id === p.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  <div>{p.label}</div>
                  <div className={`text-xs font-normal mt-0.5 ${pack.id === p.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    {p.amount.toLocaleString('fr-DZ')} DA
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-gray-800">{pack.product_name}</div>
              <div className="text-xs text-gray-500">{pack.qty} × {Math.round(pack.amount / pack.qty).toLocaleString('fr-DZ')} DA</div>
            </div>
            <div className="text-xl font-black text-blue-600">{pack.amount.toLocaleString('fr-DZ')} DA</div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">Nom complet *</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: Ahmed Benali" required disabled={loading}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">Numéro de téléphone *</label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="0X XX XX XX XX" required disabled={loading}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">Adresse de livraison *</label>
              <textarea
                value={address} onChange={e => setAddress(e.target.value)}
                placeholder="Rue, Quartier, Wilaya" required disabled={loading} rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50 resize-none"
              />
            </div>
            {affCode && (
              <div className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                Code partenaire appliqué : <span className="font-mono font-bold">{affCode}</span>
              </div>
            )}
            <button
              type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-black py-4 px-8 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Envoi en cours…</>
              ) : (
                <>🛒 COMMANDER — {pack.amount.toLocaleString('fr-DZ')} DA</>
              )}
            </button>
            <p className="text-center text-xs text-gray-400">
              Paiement à la livraison · 100% sécurisé · Retour gratuit
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
