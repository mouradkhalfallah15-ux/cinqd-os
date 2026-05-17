import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { FiFileText, FiPlus, FiCheckCircle, FiXCircle, FiClock, FiDownload } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';

// Tunisia RS and TVA rates
const RS_RATE  = 0.015;
const TVA_RATE = 0.19;

const STATUS_STYLES = {
  draft:     'bg-slate-700 text-slate-300 border-slate-600',
  pending:   'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  active:    'bg-green-900/40 text-green-300 border-green-700',
  expired:   'bg-orange-900/40 text-orange-300 border-orange-700',
  terminated:'bg-red-900/40 text-red-300 border-red-700',
};
const STATUS_LABELS = { draft: 'Brouillon', pending: 'En attente signature', active: 'Actif', expired: 'Expiré', terminated: 'Résilié' };

const INIT = {
  partnerName: '', partnerMF: '', partnerRNE: '', partnerAddress: '',
  contractType: 'supply', amount: '', currency: 'TND',
  paymentTerms: '60', deliveryTerms: 'EXW', startDate: '', endDate: '',
  description: '', penaltyPct: '1', confidentialityYears: '3',
};

const ContractManager = ({ uid }) => {
  const [contracts, setContracts] = useState([]);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState(INIT);
  const [view, setView]           = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'b2b_contracts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  const createContract = async () => {
    if (!form.partnerName || !form.amount) { toast.error('Renseignez au minimum le partenaire et le montant.'); return; }
    const amount = Number(form.amount);
    const rs     = amount > 1000 ? +(amount * RS_RATE).toFixed(3) : 0;
    const tva    = +(amount * TVA_RATE).toFixed(3);
    await addDoc(collection(db, 'b2b_contracts'), {
      ...form,
      amount, rs, tva,
      totalTTC: +(amount + tva - rs).toFixed(3),
      status: 'draft',
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    toast.success('Contrat créé');
    setForm(INIT);
    setCreating(false);
  };

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, 'b2b_contracts', id), { status, updatedAt: serverTimestamp() });
    toast.success(`Statut: ${STATUS_LABELS[status]}`);
  };

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  if (view) {
    const c = contracts.find((x) => x.id === view);
    if (!c) { setView(null); return null; }
    return (
      <div className="space-y-4">
        <button onClick={() => setView(null)} className="text-slate-400 hover:text-white text-sm transition-colors">← Retour</button>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white text-xl font-extrabold">{c.partnerName}</h3>
              <p className="text-slate-400 text-sm mt-0.5">MF: {c.partnerMF} · RNE: {c.partnerRNE}</p>
              <p className="text-slate-500 text-xs">{c.partnerAddress}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_STYLES[c.status]}`}>{STATUS_LABELS[c.status]}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Type de contrat', c.contractType === 'supply' ? 'Fourniture' : c.contractType],
              ['Montant HT', `${c.amount?.toFixed(3)} ${c.currency}`],
              ['TVA (19%)', `${c.tva?.toFixed(3)} ${c.currency}`],
              ['RS (1.5%)', `${c.rs?.toFixed(3)} ${c.currency}`],
              ['Total TTC (net RS)', `${c.totalTTC?.toFixed(3)} ${c.currency}`],
              ['Délai paiement', `${c.paymentTerms} jours`],
              ['Incoterm livraison', c.deliveryTerms],
              ['Pénalité retard', `${c.penaltyPct}%/semaine`],
              ['Confidentialité', `${c.confidentialityYears} ans`],
              ['Période', `${c.startDate} → ${c.endDate}`],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-900/60 rounded-xl px-4 py-3">
                <p className="text-slate-500 text-xs">{label}</p>
                <p className="text-white font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {c.description && (
            <div className="bg-slate-900/60 rounded-xl px-4 py-3">
              <p className="text-slate-500 text-xs mb-1">Objet du contrat</p>
              <p className="text-slate-200 text-sm">{c.description}</p>
            </div>
          )}

          {c.status === 'draft' && (
            <div className="flex gap-2">
              <button onClick={() => updateStatus(c.id, 'pending')} className="flex items-center gap-1.5 bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                <FiClock /> Soumettre signature
              </button>
              <button onClick={() => updateStatus(c.id, 'terminated')} className="flex items-center gap-1.5 bg-red-800 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                <FiXCircle /> Annuler
              </button>
            </div>
          )}
          {c.status === 'pending' && (
            <button onClick={() => updateStatus(c.id, 'active')} className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              <FiCheckCircle /> Marquer signé / Activer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2 text-lg">
          <FiFileText className="text-cyan-400" /> Gestionnaire de Contrats B2B
        </h3>
        <button onClick={() => setCreating(!creating)} className="flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
          <FiPlus /> Nouveau contrat
        </button>
      </div>

      {creating && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h4 className="font-bold text-white text-sm">Nouveau contrat B2B (conforme COC)</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['partnerName',    'Raison sociale partenaire *'],
              ['partnerMF',      'Matricule Fiscal (MF)'],
              ['partnerRNE',     'Numéro RNE'],
              ['partnerAddress', 'Adresse siège'],
              ['amount',         'Montant HT (TND) *'],
              ['paymentTerms',   'Délai paiement (jours)'],
              ['startDate',      'Date début'],
              ['endDate',        'Date fin'],
              ['penaltyPct',     'Pénalité retard (%/sem)'],
              ['confidentialityYears', 'Confidentialité (ans)'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="text-xs text-slate-400 block mb-1">{label}</label>
                <input
                  type={['amount', 'paymentTerms', 'penaltyPct', 'confidentialityYears'].includes(field) ? 'number' : 'text'}
                  value={form[field]} onChange={f(field)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Type de contrat</label>
              <select value={form.contractType} onChange={f('contractType')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
                <option value="supply">Fourniture</option>
                <option value="distribution">Distribution</option>
                <option value="service">Prestation de services</option>
                <option value="partnership">Partenariat</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Incoterm livraison</label>
              <select value={form.deliveryTerms} onChange={f('deliveryTerms')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
                {['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Objet du contrat</label>
            <textarea value={form.description} onChange={f('description')} rows={3}
              placeholder="Description détaillée des marchandises/services..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={createContract} className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Créer contrat</button>
            <button onClick={() => setCreating(false)} className="bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm px-4 py-2 rounded-lg transition-colors">Annuler</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {contracts.length === 0 && (
          <div className="bg-slate-800 rounded-2xl py-10 text-center text-slate-500">Aucun contrat créé.</div>
        )}
        {contracts.map((c) => (
          <button key={c.id} onClick={() => setView(c.id)}
            className="w-full bg-slate-800 hover:bg-slate-700/60 border border-slate-700 rounded-xl px-4 py-3.5 flex items-center justify-between transition-colors text-left">
            <div>
              <p className="text-white font-semibold text-sm">{c.partnerName}</p>
              <p className="text-slate-500 text-xs mt-0.5">{c.contractType} · MF: {c.partnerMF || '—'}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-cyan-400 font-bold text-sm">{Number(c.totalTTC ?? 0).toFixed(3)} TND</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[c.status] ?? STATUS_STYLES.draft}`}>
                {STATUS_LABELS[c.status] ?? c.status}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContractManager;
