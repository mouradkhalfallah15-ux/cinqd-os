import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../../../firebase';
import { POINT_TO_TND_RATE } from '../config/defaults';
import { FiStar, FiArrowRight, FiZap } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';

const fmtDate = (ts) => ts?.toDate?.().toLocaleDateString('fr-FR') ?? '—';

const PointsTracker = ({ uid, points = 0, pointsLog = [] }) => {
  const [productCode, setProductCode] = useState('');
  const [busy, setBusy] = useState(false);

  const tndValue = +(points * POINT_TO_TND_RATE).toFixed(3);

  const logProduct = async () => {
    if (!productCode.trim() || busy) return;
    setBusy(true);
    try {
      // Product catalog lookup would go here; defaulting to 5 pts per scan
      const pointsEarned = 5;
      await addDoc(collection(db, 'affiliates', uid, 'points'), {
        productCode: productCode.trim(),
        points: pointsEarned,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'affiliates', uid), { points: increment(pointsEarned) });
      toast.success(`+${pointsEarned} points enregistrés`);
      setProductCode('');
    } finally {
      setBusy(false);
    }
  };

  const convertPoints = async () => {
    if (points <= 0 || busy) return;
    setBusy(true);
    try {
      await addDoc(collection(db, 'affiliates', uid, 'wallet_transactions'), {
        type: 'credit',
        amount: tndValue,
        reason: 'points',
        points,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'affiliates', uid), {
        walletBalance: increment(tndValue),
        points: 0,
      });
      toast.success(`${tndValue} TND crédités dans votre Wallet`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <FiStar className="text-yellow-400" /> Points & Conversion
          </h3>
          <div className="text-right">
            <p className="text-yellow-300 text-3xl font-extrabold">{points} pts</p>
            <p className="text-slate-500 text-xs">≈ {tndValue} TND</p>
          </div>
        </div>

        <div>
          <p className="text-slate-400 text-xs mb-2">Chaque produit vendu détient une valeur en points. Scannez ou saisissez le code pour créditer.</p>
          <div className="flex gap-2">
            <input
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && logProduct()}
              placeholder="Code produit vendu..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
            />
            <button
              onClick={logProduct}
              disabled={busy || !productCode.trim()}
              className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <FiZap />
            </button>
          </div>
        </div>

        <button
          onClick={convertPoints}
          disabled={points <= 0 || busy}
          className="w-full flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
        >
          Convertir {points} pts <FiArrowRight /> {tndValue} TND
        </button>
      </div>

      {pointsLog.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-400 mb-3">Historique ({pointsLog.length} entrées)</h4>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {pointsLog.slice(0, 50).map((p) => (
              <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-slate-700/40 last:border-0">
                <span className="text-slate-400 font-mono text-xs">{p.productCode}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs">{fmtDate(p.createdAt)}</span>
                  <span className="text-yellow-400 font-bold text-xs">+{p.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsTracker;
