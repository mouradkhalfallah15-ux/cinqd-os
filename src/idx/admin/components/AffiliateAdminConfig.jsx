import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { DEFAULT_TIERS, TIER_KEYS } from '../../affiliate/config/defaults';
import { FiSettings, FiSave, FiRefreshCw } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';
import TierBadge from '../../affiliate/components/TierBadge.jsx';

const FIELD_LABELS = {
  cashbackPct:            'Cashback achat (%)',
  commissionPct:          'Commission vente (%)',
  referralPct:            'Commission parrainage (%)',
  sponsoringFeePct:       'Frais sponsoring (%)',
  penaltyPerFailedOrder:  'Pénalité / livraison échouée (TND)',
  minMonthlyOrders:       'Min. commandes/mois',
};

const AffiliateAdminConfig = () => {
  const [tiers, setTiers]       = useState(DEFAULT_TIERS);
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'idx_config', 'affiliate_tiers'), (snap) => {
      if (snap.exists()) setTiers({ ...DEFAULT_TIERS, ...snap.data().tiers });
      setLoaded(true);
    });
  }, []);

  const update = (tierKey, field, value) => {
    setTiers((prev) => ({
      ...prev,
      [tierKey]: { ...prev[tierKey], [field]: Number(value) },
    }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'idx_config', 'affiliate_tiers'), {
        tiers,
        updatedAt: serverTimestamp(),
      });
      toast.success('Configuration sauvegardée');
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setTiers(DEFAULT_TIERS);
    setDirty(true);
  };

  if (!loaded) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2 text-lg">
            <FiSettings className="text-cyan-400" /> Configuration des Niveaux Affiliés
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Les valeurs modifiées ici s'appliquent à tous les nouveaux calculs en temps réel.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            <FiRefreshCw className="text-xs" /> Défauts
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            <FiSave /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {TIER_KEYS.map((key) => {
          const tier = tiers[key];
          return (
            <div key={key} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <TierBadge tier={key} size="lg" />
                <span className="text-slate-500 text-xs">{tier.label}</span>
              </div>

              <div className="space-y-3">
                {Object.entries(FIELD_LABELS).map(([field, label]) => (
                  <div key={field} className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 flex-1 min-w-0">{label}</label>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        step={field.includes('Pct') ? '1' : '0.001'}
                        value={tier[field] ?? 0}
                        onChange={(e) => update(key, field, e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      <span className="text-slate-500 text-xs w-10">
                        {field.includes('Pct') ? '%' : field === 'penaltyPerFailedOrder' ? 'TND' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
        <p className="text-slate-400 text-xs">
          <span className="text-cyan-400 font-semibold">Auto-Churn:</span> Tout affilié sans commande pendant <span className="text-white font-bold">2 mois consécutifs</span> est automatiquement désactivé.
          Cette valeur est définie dans le code source (<span className="font-mono text-slate-300">CHURN_INACTIVE_MONTHS = 2</span>) et non modifiable ici.
        </p>
      </div>
    </div>
  );
};

export default AffiliateAdminConfig;
