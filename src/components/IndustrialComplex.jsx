import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, addDoc, deleteDoc, updateDoc,
  doc, query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import {
  FiBox, FiFlask, FiCpu, FiShield, FiPlus, FiTrash2,
  FiSave, FiX, FiAlertTriangle, FiPackage, FiTag,
  FiInbox, FiClipboard, FiCheck, FiAlertCircle, FiActivity,
  FiCode, FiChevronDown, FiChevronUp, FiArrowRight,
} from 'react-icons/fi';

// ─── Constants ─────────────────────────────────────────────────────────────────
const CHEM_UNITS  = ['kg', 'L', 'g', 'mL'];
const APPEARANCES = ['Limpide', 'Légèrement trouble', 'Trouble', 'Opaque'];

const MODULE_TABS = [
  { id: 'stock',      label: 'Stock',            Icon: FiBox,      accent: 'blue'   },
  { id: 'formula',    label: 'Formule',           Icon: FiFlask,    accent: 'purple' },
  { id: 'production', label: 'Ordre de Prod.',    Icon: FiCpu,      accent: 'red'    },
  { id: 'qa',         label: 'Assurance Qualité', Icon: FiShield,   accent: 'green'  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function genBatchId() {
  const d   = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ds  = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return `PROD-${ds}-${Math.floor(Math.random() * 900 + 100)}`;
}

function isLow(item) {
  return typeof item.quantity === 'number' && item.quantity <= (item.minThreshold ?? 0);
}

// pH auto-correction — citric acid (too high) or NaOH solution (too low)
// Empirical factors validated for aqueous surfactant systems
function calcPhCorrection(ph, phMin, phMax, batchL) {
  const target = (phMin + phMax) / 2;
  const delta  = ph - target;

  if (delta > 0) {
    const qty = parseFloat((Math.abs(delta) * batchL * 0.0012).toFixed(3));
    return {
      metric: 'pH', direction: 'trop élevé',
      chemical: 'Acide Citrique Solution 50%', qty, unit: 'kg',
      steps: [
        `Préparer ${qty} kg d'acide citrique en solution 50% à 20 °C.`,
        `Ajouter par fractions de 25 % sous agitation continue (40 RPM).`,
        `Contrôler le pH toutes les 2 min. Cible : [${phMin} – ${phMax}].`,
        `Stopper dès que le pH entre dans la plage cible.`,
        `Consigner la quantité exacte ajoutée dans le rapport de lot.`,
      ],
    };
  }

  const qty = parseFloat((Math.abs(delta) * batchL * 0.0008).toFixed(3));
  return {
    metric: 'pH', direction: 'trop bas',
    chemical: 'Solution NaOH 30%', qty, unit: 'kg',
    steps: [
      `Porter la solution NaOH 30 % à 20 °C avant toute addition.`,
      `Ajouter ${qty} kg par fractions de 20 % sous agitation forte (50 RPM).`,
      `Mesurer le pH entre chaque fraction. Cible : [${phMin} – ${phMax}].`,
      `Ne pas dépasser la dose calculée sans remesure.`,
      `Documenter chaque déviation dans le rapport correctif.`,
    ],
  };
}

// Density auto-correction — dilution with DI water (too dense) or active concentrate (too light)
// Based on mass-balance equation: V_add = V_batch × (ρ_current − ρ_target) / (ρ_target − ρ_add)
function calcDensityCorrection(density, dMin, dMax, batchL) {
  const target = (dMin + dMax) / 2;

  if (density > dMax) {
    const waterL = parseFloat((batchL * (density - target) / (target - 1.0)).toFixed(2));
    return {
      metric: 'Densité', direction: 'trop élevée',
      chemical: 'Eau purifiée (DI Water)', qty: waterL, unit: 'L',
      steps: [
        `Ajouter ${waterL} L d'eau purifiée (DI) au tank principal.`,
        `Homogénéiser pendant 15 min à 30 RPM.`,
        `Mesurer la densité à 20 °C avec un densimètre étalonné.`,
        `Répéter si nécessaire par fractions de 10 %.`,
      ],
    };
  }

  const concL = parseFloat((batchL * (target - density) / (1.12 - target)).toFixed(2));
  return {
    metric: 'Densité', direction: 'trop faible',
    chemical: 'Concentré actif — Phase Stage 1', qty: concL, unit: 'L',
    steps: [
      `Préparer ${concL} L de concentré actif Stage 1 selon la formule.`,
      `Incorporer sous agitation forte (70 RPM) pendant 20 min.`,
      `Mesurer la densité à 20 °C. Cible : [${dMin} – ${dMax}] g/cm³.`,
      `Si hors cible après correction, contacter le responsable technique.`,
    ],
  };
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
const EmptyState = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-2">
    <FiInbox size={28} />
    <p className="text-sm">{label}</p>
  </div>
);

const Input = ({ label, className = '', ...props }) => (
  <div className="space-y-1">
    {label && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>}
    <input
      {...props}
      className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700 ${className}`}
    />
  </div>
);

const Select = ({ label, children, className = '', ...props }) => (
  <div className="space-y-1">
    {label && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>}
    <select
      {...props}
      className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-colors ${className}`}
    >
      {children}
    </select>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1 — STOCK
// ═══════════════════════════════════════════════════════════════════════════════
const StockModule = () => {
  const [tab,       setTab]       = useState('chemicals');
  const [chemicals, setChemicals] = useState([]);
  const [packaging, setPackaging] = useState([]);
  const [stickers,  setStickers]  = useState([]);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'industrial_chemicals'), s =>
      setChemicals(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, 'industrial_packaging'), s =>
      setPackaging(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, 'industrial_stickers'),  s =>
      setStickers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, []);

  const resetForm = () => { setForm({}); setShowForm(false); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'chemicals') {
        if (!form.name?.trim() || !form.quantity || !form.unit)
          return toast.error('Nom, quantité et unité obligatoires.');
        await addDoc(collection(db, 'industrial_chemicals'), {
          name:         form.name.trim(),
          quantity:     parseFloat(form.quantity),
          unit:         form.unit,
          minThreshold: parseFloat(form.minThreshold) || 0,
          unitCost:     parseFloat(form.unitCost)     || 0,
          createdAt:    serverTimestamp(),
        });
      } else if (tab === 'packaging') {
        if (!form.name?.trim() || !form.sizeL || !form.quantity)
          return toast.error('Nom, volume contenant et quantité obligatoires.');
        await addDoc(collection(db, 'industrial_packaging'), {
          name:      form.name.trim(),
          sizeL:     parseFloat(form.sizeL),
          quantity:  parseInt(form.quantity, 10),
          unitCost:  parseFloat(form.unitCost) || 0,
          createdAt: serverTimestamp(),
        });
      } else {
        if (!form.name?.trim() || !form.productCode?.trim() || !form.quantity)
          return toast.error('Nom, code produit et quantité obligatoires.');
        await addDoc(collection(db, 'industrial_stickers'), {
          name:            form.name.trim(),
          productCode:     form.productCode.trim(),
          quantity:        parseInt(form.quantity, 10),
          linkedPackaging: form.linkedPackaging || '',
          createdAt:       serverTimestamp(),
        });
      }
      toast.success('Enregistré.');
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (col, id) => {
    if (!window.confirm('Supprimer cet élément ?')) return;
    try {
      await deleteDoc(doc(db, col, id));
      toast.success('Supprimé.');
    } catch {
      toast.error('Erreur de suppression.');
    }
  };

  const STOCK_TABS = [
    { id: 'chemicals', label: 'Produits Chimiques', count: chemicals.length },
    { id: 'packaging', label: 'Emballages',         count: packaging.length },
    { id: 'stickers',  label: 'Étiquettes',         count: stickers.length  },
  ];

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-950/70 p-1 rounded-2xl border border-slate-800">
        {STOCK_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); resetForm(); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] ${tab === t.id ? 'bg-blue-700' : 'bg-slate-800'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Add toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(!showForm); setForm({}); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all"
        >
          {showForm ? <FiX size={12} /> : <FiPlus size={12} />}
          {showForm ? 'Annuler' : 'Ajouter'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-950/70 border border-blue-500/20 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
          {tab === 'chemicals' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nom du produit *" className="col-span-2" placeholder="ex: LABSA" value={form.name||''} onChange={e => setForm({...form, name: e.target.value})} />
              <Input label="Quantité *" type="number" min="0" placeholder="0" value={form.quantity||''} onChange={e => setForm({...form, quantity: e.target.value})} />
              <Select label="Unité *" value={form.unit||'kg'} onChange={e => setForm({...form, unit: e.target.value})}>
                {CHEM_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
              <Input label="Seuil min. alerte" type="number" min="0" placeholder="0" value={form.minThreshold||''} onChange={e => setForm({...form, minThreshold: e.target.value})} />
              <Input label="Coût unitaire (TND)" type="number" min="0" step="0.001" placeholder="0.000" value={form.unitCost||''} onChange={e => setForm({...form, unitCost: e.target.value})} />
            </div>
          )}
          {tab === 'packaging' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nom de l'emballage *" className="col-span-2" placeholder="ex: Bouteille HDPE 1L" value={form.name||''} onChange={e => setForm({...form, name: e.target.value})} />
              <Input label="Volume contenant (L) *" type="number" min="0" step="0.001" placeholder="1.000" value={form.sizeL||''} onChange={e => setForm({...form, sizeL: e.target.value})} />
              <Input label="Quantité en stock *" type="number" min="0" placeholder="0" value={form.quantity||''} onChange={e => setForm({...form, quantity: e.target.value})} />
              <Input label="Coût unitaire (TND)" className="col-span-2" type="number" min="0" step="0.001" placeholder="0.000" value={form.unitCost||''} onChange={e => setForm({...form, unitCost: e.target.value})} />
            </div>
          )}
          {tab === 'stickers' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nom de l'étiquette *" placeholder="ex: Étiquette CN5-1L" value={form.name||''} onChange={e => setForm({...form, name: e.target.value})} />
              <Input label="Code produit *" placeholder="ex: CN5-1L" value={form.productCode||''} onChange={e => setForm({...form, productCode: e.target.value})} />
              <Input label="Quantité en stock *" type="number" min="0" placeholder="0" value={form.quantity||''} onChange={e => setForm({...form, quantity: e.target.value})} />
              <Select label="Lier à un emballage" value={form.linkedPackaging||''} onChange={e => setForm({...form, linkedPackaging: e.target.value})}>
                <option value="">— Optionnel —</option>
                {packaging.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <FiSave size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* Chemicals list */}
      {tab === 'chemicals' && (
        <div className="space-y-2">
          {chemicals.length === 0 && <EmptyState label="Aucun produit chimique enregistré." />}
          {chemicals.map(c => (
            <div key={c.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isLow(c) ? 'bg-red-500/5 border-red-500/30' : 'bg-slate-950/40 border-slate-800'}`}>
              <div>
                <p className="font-bold text-white text-sm">{c.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {c.quantity} {c.unit} &nbsp;·&nbsp; Min: {c.minThreshold} {c.unit} &nbsp;·&nbsp; {c.unitCost} TND/{c.unit}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isLow(c) && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                    <FiAlertTriangle size={9} /> STOCK BAS
                  </span>
                )}
                <button onClick={() => handleDelete('industrial_chemicals', c.id)} className="text-slate-600 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Packaging list */}
      {tab === 'packaging' && (
        <div className="space-y-2">
          {packaging.length === 0 && <EmptyState label="Aucun emballage enregistré." />}
          {packaging.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/60 transition-all">
              <div className="flex items-center gap-3">
                <FiPackage className="text-orange-500" size={18} />
                <div>
                  <p className="font-bold text-white text-sm">{p.name}</p>
                  <p className="text-[11px] text-slate-500">{p.sizeL} L · {p.quantity} unités · {p.unitCost} TND/u</p>
                </div>
              </div>
              <button onClick={() => handleDelete('industrial_packaging', p.id)} className="text-slate-600 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Stickers list */}
      {tab === 'stickers' && (
        <div className="space-y-2">
          {stickers.length === 0 && <EmptyState label="Aucune étiquette enregistrée." />}
          {stickers.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/60 transition-all">
              <div className="flex items-center gap-3">
                <FiTag className="text-purple-400" size={18} />
                <div>
                  <p className="font-bold text-white text-sm">{s.name}</p>
                  <p className="text-[11px] text-slate-500">Code: {s.productCode} · {s.quantity} unités</p>
                </div>
              </div>
              <button onClick={() => handleDelete('industrial_stickers', s.id)} className="text-slate-600 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2 — FORMULA
// ═══════════════════════════════════════════════════════════════════════════════
const BLANK_FORMULA = () => ({
  name: '', productCode: '', description: '',
  stage1: {
    label: 'Concentrated Patch Mix',
    volumeRatio: 20,
    ingredients: [],
    process: { mixSpeedRPM: 60, temperatureC: 25, durationMinutes: 30 },
  },
  stage2: {
    label: 'Finished Product Bulk Tank',
    ingredients: [],
    process: { mixSpeedRPM: 40, temperatureC: 20, durationMinutes: 45 },
  },
  packagingConfig: [],
  qualityTargets: { phMin: 6.5, phMax: 7.5, densityMin: 1.00, densityMax: 1.05 },
});

const FormulaModule = () => {
  const [formulas,  setFormulas]  = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [packaging, setPackaging] = useState([]);
  const [stickers,  setStickers]  = useState([]);
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState(BLANK_FORMULA());
  const [saving,    setSaving]    = useState(false);
  const [expanded,  setExpanded]  = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'industrial_formulas'),  s => setFormulas(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, 'industrial_chemicals'), s => setChemicals(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, 'industrial_packaging'), s => setPackaging(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(collection(db, 'industrial_stickers'),  s => setStickers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // ── Stage 1 ingredient helpers ──────────────────────────────────────────────
  const addS1 = () => setForm(f => ({
    ...f, stage1: { ...f.stage1, ingredients: [...f.stage1.ingredients, { chemId: '', chemName: '', percentage: 0, unit: 'kg' }] },
  }));

  const updateS1 = (idx, field, val) => setForm(f => {
    const ings = f.stage1.ingredients.map((ing, i) => {
      if (i !== idx) return ing;
      const updated = { ...ing, [field]: val };
      if (field === 'chemId') {
        const chem = chemicals.find(c => c.id === val);
        updated.chemName = chem?.name || '';
        updated.unit = chem?.unit || 'kg';
      }
      return updated;
    });
    return { ...f, stage1: { ...f.stage1, ingredients: ings } };
  });

  const removeS1 = idx => setForm(f => ({
    ...f, stage1: { ...f.stage1, ingredients: f.stage1.ingredients.filter((_, i) => i !== idx) },
  }));

  // ── Stage 2 ingredient helpers ──────────────────────────────────────────────
  const addS2 = () => setForm(f => ({
    ...f, stage2: { ...f.stage2, ingredients: [...f.stage2.ingredients, { chemId: '', chemName: '', qtyPerLiter: 0, unit: 'kg' }] },
  }));

  const updateS2 = (idx, field, val) => setForm(f => {
    const ings = f.stage2.ingredients.map((ing, i) => {
      if (i !== idx) return ing;
      const updated = { ...ing, [field]: val };
      if (field === 'chemId') {
        const chem = chemicals.find(c => c.id === val);
        updated.chemName = chem?.name || '';
        updated.unit = chem?.unit || 'kg';
      }
      return updated;
    });
    return { ...f, stage2: { ...f.stage2, ingredients: ings } };
  });

  const removeS2 = idx => setForm(f => ({
    ...f, stage2: { ...f.stage2, ingredients: f.stage2.ingredients.filter((_, i) => i !== idx) },
  }));

  // ── Packaging config helpers ────────────────────────────────────────────────
  const addPkg = () => setForm(f => ({
    ...f, packagingConfig: [...f.packagingConfig, { packagingId: '', packagingName: '', sizeL: 0, stickerId: '', stickerName: '' }],
  }));

  const updatePkg = (idx, field, val) => setForm(f => {
    const pcs = f.packagingConfig.map((pc, i) => {
      if (i !== idx) return pc;
      const updated = { ...pc, [field]: val };
      if (field === 'packagingId') {
        const pkg = packaging.find(p => p.id === val);
        updated.packagingName = pkg?.name || '';
        updated.sizeL = pkg?.sizeL || 0;
      }
      if (field === 'stickerId') {
        const stk = stickers.find(s => s.id === val);
        updated.stickerName = stk?.name || '';
      }
      return updated;
    });
    return { ...f, packagingConfig: pcs };
  });

  const removePkg = idx => setForm(f => ({
    ...f, packagingConfig: f.packagingConfig.filter((_, i) => i !== idx),
  }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.productCode.trim())
      return toast.error('Nom de formule et code produit obligatoires.');
    if (form.stage1.ingredients.length === 0)
      return toast.error('Stage 1 doit avoir au moins 1 ingrédient.');
    const s1Total = form.stage1.ingredients.reduce((a, i) => a + parseFloat(i.percentage || 0), 0);
    if (s1Total > 100)
      return toast.error(`Total Stage 1 = ${s1Total.toFixed(1)}%. Doit être ≤ 100%.`);

    setSaving(true);
    try {
      await addDoc(collection(db, 'industrial_formulas'), { ...form, createdAt: serverTimestamp() });
      toast.success('Formule enregistrée.');
      setEditing(false);
      setForm(BLANK_FORMULA());
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer cette formule ?')) return;
    await deleteDoc(doc(db, 'industrial_formulas', id));
    toast.success('Formule supprimée.');
  };

  const ProcessRow = ({ label, field, stageKey, suffix, step, min = 0 }) => (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-1">
        <input
          type="number" min={min} step={step || 1}
          value={form[stageKey].process[field] || ''}
          onChange={e => setForm(f => ({ ...f, [stageKey]: { ...f[stageKey], process: { ...f[stageKey].process, [field]: parseFloat(e.target.value) || 0 } } }))}
          className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 text-center"
        />
        <span className="text-[10px] text-slate-600">{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{formulas.length} formule(s)</p>
        <button
          onClick={() => { setEditing(!editing); setForm(BLANK_FORMULA()); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-all"
        >
          {editing ? <><FiX size={12} /> Annuler</> : <><FiPlus size={12} /> Nouvelle Formule</>}
        </button>
      </div>

      {/* ── Editor ── */}
      {editing && (
        <div className="bg-slate-950/70 border border-purple-500/20 rounded-2xl p-5 space-y-6 animate-in fade-in duration-200">

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom de la formule *" className="col-span-2" placeholder="ex: Soin Nettoyant CINQD No.5" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <Input label="Code produit *" placeholder="ex: CN5" value={form.productCode} onChange={e => setForm({...form, productCode: e.target.value})} />
            <Input label="Description" placeholder="optionnel" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          {/* ─ Stage 1: Concentrated Patch Mix ─ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-red-600 text-white text-[9px] font-black flex items-center justify-center">1</span>
              <p className="text-xs font-black text-white uppercase tracking-widest">Stage 1 — Concentrated Patch Mix</p>
            </div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] text-slate-500 font-bold">Volume Stage 1 =</span>
              <input
                type="number" min="1" max="99" step="1"
                value={form.stage1.volumeRatio}
                onChange={e => setForm(f => ({ ...f, stage1: { ...f.stage1, volumeRatio: parseFloat(e.target.value) || 0 } }))}
                className="w-14 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-red-500 text-center"
              />
              <span className="text-[10px] text-slate-500 font-bold">% du lot total</span>
            </div>

            {/* S1 ingredient rows */}
            {form.stage1.ingredients.map((ing, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900 rounded-xl p-3 border border-slate-800">
                <select
                  value={ing.chemId}
                  onChange={e => updateS1(idx, 'chemId', e.target.value)}
                  className="col-span-5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                >
                  <option value="">Sélectionner produit</option>
                  {chemicals.map(c => <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>)}
                </select>
                <input
                  type="number" min="0" max="100" step="0.1"
                  placeholder="%" value={ing.percentage}
                  onChange={e => updateS1(idx, 'percentage', parseFloat(e.target.value) || 0)}
                  className="col-span-3 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none"
                />
                <span className="col-span-3 text-[10px] text-slate-500 font-bold">% du Stage 1 ({ing.unit})</span>
                <button onClick={() => removeS1(idx)} className="col-span-1 text-slate-600 hover:text-red-500 transition-colors flex justify-center"><FiX size={14} /></button>
              </div>
            ))}
            <button onClick={addS1} className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 font-bold transition-colors">
              <FiPlus size={12} /> Ajouter ingrédient Stage 1
            </button>

            {/* S1 process params */}
            <div className="flex gap-4 pt-1">
              <ProcessRow label="Vitesse (RPM)" field="mixSpeedRPM"    stageKey="stage1" suffix="RPM" />
              <ProcessRow label="Température"   field="temperatureC"   stageKey="stage1" suffix="°C"  />
              <ProcessRow label="Durée"         field="durationMinutes" stageKey="stage1" suffix="min" />
            </div>
          </div>

          {/* ─ Stage 2: Bulk Tank Mixing ─ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">2</span>
              <p className="text-xs font-black text-white uppercase tracking-widest">Stage 2 — Finished Product Bulk Tank</p>
            </div>
            <p className="text-[10px] text-slate-600">Ingrédients additionnels (au-delà du concentré Stage 1) — quantité par litre de lot final.</p>

            {form.stage2.ingredients.map((ing, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900 rounded-xl p-3 border border-slate-800">
                <select
                  value={ing.chemId}
                  onChange={e => updateS2(idx, 'chemId', e.target.value)}
                  className="col-span-5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                >
                  <option value="">Sélectionner produit</option>
                  {chemicals.map(c => <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>)}
                </select>
                <input
                  type="number" min="0" step="0.0001"
                  placeholder="q/L" value={ing.qtyPerLiter}
                  onChange={e => updateS2(idx, 'qtyPerLiter', parseFloat(e.target.value) || 0)}
                  className="col-span-3 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none"
                />
                <span className="col-span-3 text-[10px] text-slate-500 font-bold">{ing.unit}/L de lot</span>
                <button onClick={() => removeS2(idx)} className="col-span-1 text-slate-600 hover:text-red-500 transition-colors flex justify-center"><FiX size={14} /></button>
              </div>
            ))}
            <button onClick={addS2} className="flex items-center gap-2 text-xs text-slate-500 hover:text-blue-400 font-bold transition-colors">
              <FiPlus size={12} /> Ajouter ingrédient Stage 2
            </button>

            <div className="flex gap-4 pt-1">
              <ProcessRow label="Vitesse (RPM)" field="mixSpeedRPM"    stageKey="stage2" suffix="RPM" />
              <ProcessRow label="Température"   field="temperatureC"   stageKey="stage2" suffix="°C"  />
              <ProcessRow label="Durée"         field="durationMinutes" stageKey="stage2" suffix="min" />
            </div>
          </div>

          {/* ─ Packaging config ─ */}
          <div className="space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Emballages & Étiquettes associés</p>
            {form.packagingConfig.map((pc, idx) => (
              <div key={idx} className="grid grid-cols-11 gap-2 items-center bg-slate-900 rounded-xl p-3 border border-slate-800">
                <select
                  value={pc.packagingId}
                  onChange={e => updatePkg(idx, 'packagingId', e.target.value)}
                  className="col-span-5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                >
                  <option value="">Emballage…</option>
                  {packaging.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sizeL}L)</option>)}
                </select>
                <select
                  value={pc.stickerId}
                  onChange={e => updatePkg(idx, 'stickerId', e.target.value)}
                  className="col-span-5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                >
                  <option value="">Étiquette…</option>
                  {stickers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={() => removePkg(idx)} className="col-span-1 text-slate-600 hover:text-red-500 transition-colors flex justify-center"><FiX size={14} /></button>
              </div>
            ))}
            <button onClick={addPkg} className="flex items-center gap-2 text-xs text-slate-500 hover:text-orange-400 font-bold transition-colors">
              <FiPlus size={12} /> Ajouter type d'emballage
            </button>
          </div>

          {/* ─ Quality targets ─ */}
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cibles Qualité</p>
            <div className="grid grid-cols-4 gap-3">
              <Input label="pH min" type="number" step="0.1" min="0" max="14" value={form.qualityTargets.phMin} onChange={e => setForm(f => ({ ...f, qualityTargets: { ...f.qualityTargets, phMin: parseFloat(e.target.value) } }))} />
              <Input label="pH max" type="number" step="0.1" min="0" max="14" value={form.qualityTargets.phMax} onChange={e => setForm(f => ({ ...f, qualityTargets: { ...f.qualityTargets, phMax: parseFloat(e.target.value) } }))} />
              <Input label="Densité min (g/cm³)" type="number" step="0.001" min="0" value={form.qualityTargets.densityMin} onChange={e => setForm(f => ({ ...f, qualityTargets: { ...f.qualityTargets, densityMin: parseFloat(e.target.value) } }))} />
              <Input label="Densité max (g/cm³)" type="number" step="0.001" min="0" value={form.qualityTargets.densityMax} onChange={e => setForm(f => ({ ...f, qualityTargets: { ...f.qualityTargets, densityMax: parseFloat(e.target.value) } }))} />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <FiSave size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer la Formule'}
          </button>
        </div>
      )}

      {/* ── Formula list ── */}
      <div className="space-y-3">
        {formulas.length === 0 && !editing && <EmptyState label="Aucune formule enregistrée." />}
        {formulas.map(f => (
          <div key={f.id} className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/40 transition-all"
              onClick={() => setExpanded(expanded === f.id ? null : f.id)}
            >
              <div>
                <p className="font-black text-white text-sm">{f.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {f.productCode} &nbsp;·&nbsp;
                  pH [{f.qualityTargets?.phMin}–{f.qualityTargets?.phMax}] &nbsp;·&nbsp;
                  ρ [{f.qualityTargets?.densityMin}–{f.qualityTargets?.densityMax}] g/cm³
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={e => { e.stopPropagation(); handleDelete(f.id); }} className="text-slate-600 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
                {expanded === f.id ? <FiChevronUp size={16} className="text-slate-500" /> : <FiChevronDown size={16} className="text-slate-500" />}
              </div>
            </div>
            {expanded === f.id && (
              <div className="border-t border-slate-800 p-4 space-y-4 text-xs text-slate-400">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-black text-red-500 mb-2 uppercase tracking-wider text-[10px]">Stage 1 — {f.stage1?.label}</p>
                    <p className="text-slate-600 text-[10px] mb-1">Volume: {f.stage1?.volumeRatio}% du lot · {f.stage1?.process?.mixSpeedRPM} RPM · {f.stage1?.process?.temperatureC}°C · {f.stage1?.process?.durationMinutes} min</p>
                    {(f.stage1?.ingredients || []).map((ing, i) => (
                      <p key={i} className="text-slate-400">→ {ing.chemName} : {ing.percentage}%</p>
                    ))}
                  </div>
                  <div>
                    <p className="font-black text-blue-400 mb-2 uppercase tracking-wider text-[10px]">Stage 2 — {f.stage2?.label}</p>
                    <p className="text-slate-600 text-[10px] mb-1">{f.stage2?.process?.mixSpeedRPM} RPM · {f.stage2?.process?.temperatureC}°C · {f.stage2?.process?.durationMinutes} min</p>
                    {(f.stage2?.ingredients || []).map((ing, i) => (
                      <p key={i} className="text-slate-400">→ {ing.chemName} : {ing.qtyPerLiter} {ing.unit}/L</p>
                    ))}
                    {(f.stage2?.ingredients || []).length === 0 && <p className="text-slate-700 italic">Aucun ingrédient additionnel.</p>}
                  </div>
                </div>
                {(f.packagingConfig || []).length > 0 && (
                  <div>
                    <p className="font-black text-orange-400 mb-1 uppercase tracking-wider text-[10px]">Emballages</p>
                    {f.packagingConfig.map((pc, i) => (
                      <p key={i} className="text-slate-400">→ {pc.packagingName} + {pc.stickerName}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3 — PRODUCTION ORDER
// ═══════════════════════════════════════════════════════════════════════════════
const ProductionOrderModule = () => {
  const [formulas,    setFormulas]    = useState([]);
  const [chemicals,   setChemicals]   = useState([]);
  const [packaging,   setPackaging]   = useState([]);
  const [stickers,    setStickers]    = useState([]);
  const [orders,      setOrders]      = useState([]);
  const [selectedF,   setSelectedF]   = useState(null);
  const [targetQty,   setTargetQty]   = useState('');
  const [feasibility, setFeasibility] = useState(null);
  const [machineJSON, setMachineJSON] = useState(null);
  const [copied,      setCopied]      = useState(false);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'industrial_formulas'),  s => setFormulas(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, 'industrial_chemicals'), s => setChemicals(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, 'industrial_packaging'), s => setPackaging(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(collection(db, 'industrial_stickers'),  s => setStickers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u5 = onSnapshot(query(collection(db, 'production_orders'), orderBy('createdAt', 'desc'), limit(8)), s =>
      setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const checkFeasibility = () => {
    if (!selectedF || !targetQty || parseFloat(targetQty) <= 0)
      return toast.error('Sélectionner une formule et saisir une quantité positive.');

    const qty      = parseFloat(targetQty);
    const f        = selectedF;
    const s1Vol    = qty * (f.stage1?.volumeRatio ?? 20) / 100;
    const shortages = [];

    // Stage 1 chemicals
    (f.stage1?.ingredients || []).forEach(ing => {
      const needed    = parseFloat((s1Vol * ing.percentage / 100).toFixed(3));
      const stock     = chemicals.find(c => c.id === ing.chemId);
      const available = stock?.quantity ?? 0;
      if (needed > available) {
        shortages.push({
          stage: 'Stage 1', name: ing.chemName,
          needed, available, unit: ing.unit,
          ratio: available / needed,
        });
      }
    });

    // Stage 2 chemicals
    (f.stage2?.ingredients || []).forEach(ing => {
      const needed    = parseFloat((qty * ing.qtyPerLiter).toFixed(3));
      const stock     = chemicals.find(c => c.id === ing.chemId);
      const available = stock?.quantity ?? 0;
      if (needed > available) {
        shortages.push({
          stage: 'Stage 2', name: ing.chemName,
          needed, available, unit: ing.unit,
          ratio: available / needed,
        });
      }
    });

    // Packaging & stickers
    (f.packagingConfig || []).forEach(pc => {
      const pkg = packaging.find(p => p.id === pc.packagingId);
      if (!pkg) return;
      const needed    = Math.ceil(qty / pkg.sizeL);
      const available = pkg.quantity;
      if (needed > available) {
        shortages.push({
          stage: 'Emballage', name: pkg.name,
          needed, available, unit: 'u',
          ratio: available / needed,
        });
      }
      const stk = stickers.find(s => s.id === pc.stickerId);
      if (stk && needed > stk.quantity) {
        shortages.push({
          stage: 'Étiquette', name: stk.name,
          needed, available: stk.quantity, unit: 'u',
          ratio: stk.quantity / needed,
        });
      }
    });

    const maxRatio       = shortages.length > 0 ? Math.min(...shortages.map(s => s.ratio)) : 1;
    const maxAchievable  = parseFloat((qty * maxRatio).toFixed(1));

    setFeasibility({ ok: shortages.length === 0, shortages, qty, maxAchievable });
    setMachineJSON(null);
  };

  const generateConfig = (overrideQty) => {
    const qty = parseFloat(overrideQty ?? targetQty);
    if (!selectedF || !qty) return;
    const f       = selectedF;
    const s1Vol   = qty * (f.stage1?.volumeRatio ?? 20) / 100;
    const batchId = genBatchId();

    const config = {
      batchId,
      generatedAt: new Date().toISOString(),
      formula: { id: f.id, name: f.name, productCode: f.productCode },
      targetQuantity: qty,
      unit: 'L',
      stage1: {
        label:        f.stage1?.label ?? 'Concentrated Patch Mix',
        sequence:     1,
        targetVolume: parseFloat(s1Vol.toFixed(2)),
        ingredients:  (f.stage1?.ingredients ?? []).map(ing => ({
          id:         ing.chemId,
          name:       ing.chemName,
          percentage: ing.percentage,
          quantity:   parseFloat((s1Vol * ing.percentage / 100).toFixed(3)),
          unit:       ing.unit,
        })),
        process: f.stage1?.process ?? { mixSpeedRPM: 60, temperatureC: 25, durationMinutes: 30 },
      },
      stage2: {
        label:                 f.stage2?.label ?? 'Finished Product Bulk Tank',
        sequence:              2,
        targetVolume:          qty,
        stage1InputVolume:     parseFloat(s1Vol.toFixed(2)),
        additionalIngredients: (f.stage2?.ingredients ?? []).map(ing => ({
          id:              ing.chemId,
          name:            ing.chemName,
          quantityPerLiter: ing.qtyPerLiter,
          totalQuantity:   parseFloat((qty * ing.qtyPerLiter).toFixed(3)),
          unit:            ing.unit,
        })),
        process: f.stage2?.process ?? { mixSpeedRPM: 40, temperatureC: 20, durationMinutes: 45 },
      },
      packaging: (f.packagingConfig ?? []).map(pc => {
        const pkg = packaging.find(p => p.id === pc.packagingId);
        return {
          id:       pc.packagingId,
          name:     pc.packagingName,
          sizeL:    pkg?.sizeL ?? 0,
          units:    pkg ? Math.ceil(qty / pkg.sizeL) : 0,
          sticker:  pc.stickerName || null,
        };
      }),
      qualityTargets: {
        ph:      { min: f.qualityTargets?.phMin ?? 6.5,      max: f.qualityTargets?.phMax ?? 7.5      },
        density: { min: f.qualityTargets?.densityMin ?? 1.00, max: f.qualityTargets?.densityMax ?? 1.05 },
      },
      status:           'PENDING_EXECUTION',
      machineReadySignal: true,
    };

    setMachineJSON(config);
    return config;
  };

  const handleSaveOrder = async () => {
    if (!machineJSON) return toast.error('Générer la configuration d\'abord.');
    setSaving(true);
    try {
      await addDoc(collection(db, 'production_orders'), {
        batchId:      machineJSON.batchId,
        formulaId:    selectedF.id,
        formulaName:  selectedF.name,
        productCode:  selectedF.productCode,
        targetQuantity: machineJSON.targetQuantity,
        unit:         machineJSON.unit,
        machineConfig: JSON.stringify(machineJSON),
        status:       'pending_qa',
        createdAt:    serverTimestamp(),
      });
      toast.success(`Ordre ${machineJSON.batchId} enregistré. En attente QA.`);
      setSelectedF(null); setTargetQty(''); setFeasibility(null); setMachineJSON(null);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(machineJSON, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const STATUS_COLORS = {
    pending_qa:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    qa_passed:   'text-green-400 bg-green-400/10 border-green-400/20',
    qa_failed:   'text-red-400 bg-red-400/10 border-red-400/20',
    corrected:   'text-blue-400 bg-blue-400/10 border-blue-400/20',
  };

  return (
    <div className="space-y-6">
      {/* ── Order form ── */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Configurer l'Ordre</p>

        <Select label="Formule *" value={selectedF?.id ?? ''} onChange={e => { setSelectedF(formulas.find(f => f.id === e.target.value) ?? null); setFeasibility(null); setMachineJSON(null); }}>
          <option value="">— Sélectionner une formule —</option>
          {formulas.map(f => <option key={f.id} value={f.id}>{f.name} ({f.productCode})</option>)}
        </Select>

        <Input
          label="Quantité cible (L) *"
          type="number" min="1" step="1"
          placeholder="ex: 500"
          value={targetQty}
          onChange={e => { setTargetQty(e.target.value); setFeasibility(null); setMachineJSON(null); }}
        />

        <button
          onClick={checkFeasibility}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-black text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <FiActivity size={14} /> Vérifier le Stock
        </button>
      </div>

      {/* ── Feasibility result ── */}
      {feasibility && (
        <div className={`rounded-2xl border p-5 space-y-4 ${feasibility.ok ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          <div className="flex items-center gap-3">
            {feasibility.ok
              ? <FiCheck className="text-green-400" size={18} />
              : <FiAlertCircle className="text-red-400" size={18} />
            }
            <p className={`font-black text-sm ${feasibility.ok ? 'text-green-400' : 'text-red-400'}`}>
              {feasibility.ok
                ? `Stock suffisant pour ${feasibility.qty} L.`
                : `${feasibility.shortages.length} rupture(s) détectée(s) pour ${feasibility.qty} L.`
              }
            </p>
          </div>

          {/* Shortage details */}
          {feasibility.shortages.length > 0 && (
            <div className="space-y-2">
              {feasibility.shortages.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-red-500/10">
                  <div>
                    <p className="text-sm font-bold text-white">{s.name}</p>
                    <p className="text-[10px] text-slate-500">{s.stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-red-400 font-bold">Besoin: {s.needed} {s.unit}</p>
                    <p className="text-[10px] text-slate-500">Dispo: {s.available} {s.unit}</p>
                  </div>
                </div>
              ))}

              {/* Alternative batch suggestion */}
              <div className="mt-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs font-black text-blue-400 mb-1">Lot alternatif suggéré</p>
                <p className="text-sm text-white font-bold">
                  Batch maximum réalisable : <span className="text-blue-400">{feasibility.maxAchievable} L</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Basé sur le stock le plus limitant.</p>
                <button
                  onClick={() => { setTargetQty(String(feasibility.maxAchievable)); setFeasibility(null); setMachineJSON(null); }}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition-all flex items-center gap-2"
                >
                  <FiArrowRight size={12} /> Adopter {feasibility.maxAchievable} L
                </button>
              </div>
            </div>
          )}

          {/* Generate config button */}
          {feasibility.ok && (
            <button
              onClick={() => generateConfig()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
            >
              <FiCode size={14} /> Générer Config Machine (JSON)
            </button>
          )}
        </div>
      )}

      {/* ── Machine JSON output ── */}
      {machineJSON && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FiCode size={12} /> Configuration Machine — {machineJSON.batchId}
            </p>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-black rounded-lg transition-all ${copied ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              {copied ? <><FiCheck size={11} /> Copié!</> : <><FiClipboard size={11} /> Copier</>}
            </button>
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] text-green-400 font-mono overflow-x-auto overflow-y-auto max-h-64 leading-relaxed">
            {JSON.stringify(machineJSON, null, 2)}
          </pre>
          <button
            onClick={handleSaveOrder}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
          >
            <FiSave size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer l\'Ordre & Lancer en QA'}
          </button>
        </div>
      )}

      {/* ── Recent orders ── */}
      {orders.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ordres récents</p>
          {orders.map(o => (
            <div key={o.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
              <div>
                <p className="text-xs font-bold text-white">{o.batchId}</p>
                <p className="text-[10px] text-slate-500">{o.formulaName} · {o.targetQuantity} {o.unit}</p>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${STATUS_COLORS[o.status] || 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                {o.status?.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 4 — QUALITY ASSURANCE
// ═══════════════════════════════════════════════════════════════════════════════
const QAModule = () => {
  const [orders,       setOrders]       = useState([]);
  const [batches,      setBatches]      = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [measurements, setMeasurements] = useState({ ph: '', density: '', viscosity: '', color: '', appearance: 'Limpide', temperatureC: 20 });
  const [result,       setResult]       = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [viewTab,      setViewTab]      = useState('pending');

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'production_orders'), orderBy('createdAt', 'desc'), limit(30)), s =>
      setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(query(collection(db, 'quality_batches'), orderBy('createdAt', 'desc'), limit(20)), s =>
      setBatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const pendingOrders = orders.filter(o => o.status === 'pending_qa');

  const getTargets = (order) => {
    try {
      const cfg = typeof order.machineConfig === 'string' ? JSON.parse(order.machineConfig) : order.machineConfig;
      return {
        phMin:      cfg?.qualityTargets?.ph?.min      ?? 6.5,
        phMax:      cfg?.qualityTargets?.ph?.max      ?? 7.5,
        densityMin: cfg?.qualityTargets?.density?.min ?? 1.00,
        densityMax: cfg?.qualityTargets?.density?.max ?? 1.05,
      };
    } catch {
      return { phMin: 6.5, phMax: 7.5, densityMin: 1.00, densityMax: 1.05 };
    }
  };

  const runAnalysis = () => {
    if (!selectedOrder) return toast.error('Sélectionner un lot de production.');
    if (!measurements.ph || !measurements.density) return toast.error('pH et densité sont obligatoires.');

    const ph      = parseFloat(measurements.ph);
    const density = parseFloat(measurements.density);
    const targets = getTargets(selectedOrder);
    const batchL  = selectedOrder.targetQuantity ?? 100;
    const issues  = [];

    if (ph < targets.phMin || ph > targets.phMax)          issues.push('ph');
    if (density < targets.densityMin || density > targets.densityMax) issues.push('density');

    const corrections = [];
    if (issues.includes('ph'))      corrections.push(calcPhCorrection(ph, targets.phMin, targets.phMax, batchL));
    if (issues.includes('density')) corrections.push(calcDensityCorrection(density, targets.densityMin, targets.densityMax, batchL));

    setResult({ isCompliant: issues.length === 0, issues, corrections, targets, ph, density, batchL });
  };

  const handleSubmitQA = async () => {
    if (!result) return toast.error('Analyser le batch d\'abord.');
    setSaving(true);
    try {
      const targets = getTargets(selectedOrder);
      await addDoc(collection(db, 'quality_batches'), {
        productionOrderId: selectedOrder.id,
        batchId:           selectedOrder.batchId,
        formulaId:         selectedOrder.formulaId,
        formulaName:       selectedOrder.formulaName,
        measurements:      { ...measurements, ph: parseFloat(measurements.ph), density: parseFloat(measurements.density) },
        targets,
        isCompliant:         result.isCompliant,
        nonCompliantMetrics: result.issues,
        corrections:         result.isCompliant ? null : result.corrections,
        qaStatus:            result.isCompliant ? 'compliant' : 'correction_pending',
        createdAt:           serverTimestamp(),
      });
      await updateDoc(doc(db, 'production_orders', selectedOrder.id), {
        status: result.isCompliant ? 'qa_passed' : 'qa_failed',
      });
      toast.success(result.isCompliant ? 'Batch CONFORME. Validé.' : 'Non-conforme. Protocole correctif envoyé au Responsable Qualité.');
      setSelectedOrder(null);
      setMeasurements({ ph: '', density: '', viscosity: '', color: '', appearance: 'Limpide', temperatureC: 20 });
      setResult(null);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const METRIC_IN_RANGE = (val, min, max) => parseFloat(val) >= min && parseFloat(val) <= max;

  return (
    <div className="space-y-6">
      {/* View tabs */}
      <div className="flex gap-1 bg-slate-950/70 p-1 rounded-2xl border border-slate-800">
        {[{ id: 'pending', label: `En attente (${pendingOrders.length})` }, { id: 'history', label: `Historique (${batches.length})` }].map(t => (
          <button
            key={t.id}
            onClick={() => setViewTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${viewTab === t.id ? 'bg-green-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Pending QA tab ── */}
      {viewTab === 'pending' && (
        <div className="space-y-5">
          {/* Order selector */}
          <Select label="Sélectionner le lot à analyser" value={selectedOrder?.id ?? ''} onChange={e => { setSelectedOrder(orders.find(o => o.id === e.target.value) ?? null); setResult(null); }}>
            <option value="">— Lots en attente de QA ({pendingOrders.length}) —</option>
            {pendingOrders.map(o => <option key={o.id} value={o.id}>{o.batchId} — {o.formulaName} — {o.targetQuantity} L</option>)}
          </Select>

          {selectedOrder && (
            <>
              {/* Lot info banner */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Lot sélectionné</p>
                <p className="font-black text-white">{selectedOrder.batchId}</p>
                <p className="text-xs text-slate-400">{selectedOrder.formulaName} · {selectedOrder.targetQuantity} L</p>
                {(() => {
                  const t = getTargets(selectedOrder);
                  return (
                    <div className="flex gap-4 mt-2">
                      <span className="text-[10px] text-slate-500">pH cible: <span className="text-white font-bold">[{t.phMin}–{t.phMax}]</span></span>
                      <span className="text-[10px] text-slate-500">ρ cible: <span className="text-white font-bold">[{t.densityMin}–{t.densityMax}] g/cm³</span></span>
                    </div>
                  );
                })()}
              </div>

              {/* Measurements */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Mesures Labo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">pH *</p>
                    <input
                      type="number" step="0.01" min="0" max="14"
                      placeholder="ex: 7.2"
                      value={measurements.ph}
                      onChange={e => { setMeasurements({...measurements, ph: e.target.value}); setResult(null); }}
                      className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors ${
                        measurements.ph
                          ? METRIC_IN_RANGE(measurements.ph, getTargets(selectedOrder).phMin, getTargets(selectedOrder).phMax)
                            ? 'border-green-500/50 focus:border-green-500'
                            : 'border-red-500/50 focus:border-red-500'
                          : 'border-slate-800 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Densité (g/cm³) *</p>
                    <input
                      type="number" step="0.001" min="0"
                      placeholder="ex: 1.02"
                      value={measurements.density}
                      onChange={e => { setMeasurements({...measurements, density: e.target.value}); setResult(null); }}
                      className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors ${
                        measurements.density
                          ? METRIC_IN_RANGE(measurements.density, getTargets(selectedOrder).densityMin, getTargets(selectedOrder).densityMax)
                            ? 'border-green-500/50 focus:border-green-500'
                            : 'border-red-500/50 focus:border-red-500'
                          : 'border-slate-800 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  <Input label="Viscosité (cP)" type="number" min="0" placeholder="optionnel" value={measurements.viscosity} onChange={e => setMeasurements({...measurements, viscosity: e.target.value})} />
                  <Input label="Température de mesure (°C)" type="number" step="0.1" value={measurements.temperatureC} onChange={e => setMeasurements({...measurements, temperatureC: e.target.value})} />
                  <Input label="Couleur" placeholder="ex: Blanc laiteux" value={measurements.color} onChange={e => setMeasurements({...measurements, color: e.target.value})} />
                  <Select label="Aspect" value={measurements.appearance} onChange={e => setMeasurements({...measurements, appearance: e.target.value})}>
                    {APPEARANCES.map(a => <option key={a} value={a}>{a}</option>)}
                  </Select>
                </div>

                <button
                  onClick={runAnalysis}
                  className="w-full bg-green-700 hover:bg-green-600 text-white font-black text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <FiActivity size={14} /> Analyser la Conformité
                </button>
              </div>

              {/* ── Analysis result ── */}
              {result && (
                <div className={`rounded-2xl border p-5 space-y-4 ${result.isCompliant ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  {/* Verdict */}
                  <div className="flex items-center gap-3">
                    {result.isCompliant
                      ? <><FiCheck className="text-green-400" size={22} /><p className="font-black text-green-400 text-base">BATCH CONFORME</p></>
                      : <><FiAlertCircle className="text-red-400" size={22} /><p className="font-black text-red-400 text-base">BATCH NON-CONFORME</p></>
                    }
                  </div>

                  {/* Metric summary */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'pH mesuré',     val: result.ph,      min: result.targets.phMin, max: result.targets.phMax,      unit: '' },
                      { label: 'Densité mesurée', val: result.density, min: result.targets.densityMin, max: result.targets.densityMax, unit: ' g/cm³' },
                    ].map(m => (
                      <div key={m.label} className={`p-3 rounded-xl border ${m.val >= m.min && m.val <= m.max ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">{m.label}</p>
                        <p className={`text-lg font-black ${m.val >= m.min && m.val <= m.max ? 'text-green-400' : 'text-red-400'}`}>{m.val}{m.unit}</p>
                        <p className="text-[9px] text-slate-600">Cible: [{m.min}–{m.max}]{m.unit}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── Auto-correction protocol ── */}
                  {!result.isCompliant && result.corrections.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-xs font-black text-red-400 uppercase tracking-widest border-t border-red-500/10 pt-4">
                        Protocole de Correction Automatique
                      </p>
                      {result.corrections.map((corr, ci) => (
                        <div key={ci} className="bg-slate-950/70 border border-orange-500/20 rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-orange-400 uppercase tracking-widest">{corr.metric} {corr.direction}</p>
                              <p className="text-sm font-bold text-white mt-1">{corr.chemical}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-2xl font-black text-orange-400">{corr.qty}</p>
                              <p className="text-[10px] text-slate-500">{corr.unit}</p>
                            </div>
                          </div>
                          <ol className="space-y-1.5">
                            {corr.steps.map((step, si) => (
                              <li key={si} className="flex items-start gap-2 text-xs text-slate-400">
                                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 text-[8px] font-black flex items-center justify-center mt-0.5">{si + 1}</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={handleSubmitQA}
                    disabled={saving}
                    className={`w-full font-black text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                      result.isCompliant
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
                        : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20'
                    }`}
                  >
                    <FiSave size={14} />
                    {saving
                      ? 'Enregistrement…'
                      : result.isCompliant
                        ? 'Valider & Enregistrer'
                        : 'Enregistrer et envoyer au Responsable Qualité'
                    }
                  </button>
                </div>
              )}
            </>
          )}

          {pendingOrders.length === 0 && !selectedOrder && (
            <EmptyState label="Aucun lot en attente de contrôle qualité." />
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {viewTab === 'history' && (
        <div className="space-y-3">
          {batches.length === 0 && <EmptyState label="Aucun rapport qualité enregistré." />}
          {batches.map(b => (
            <div key={b.id} className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-black text-white text-sm">{b.batchId}</p>
                  <p className="text-[10px] text-slate-500">{b.formulaName} · {b.createdAt?.toDate?.().toLocaleDateString('fr-TN') || '—'}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${b.isCompliant ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                  {b.isCompliant ? 'CONFORME' : 'NON-CONFORME'}
                </span>
              </div>
              <div className="flex gap-4 text-[10px] text-slate-500">
                <span>pH: <span className="text-white font-bold">{b.measurements?.ph ?? '—'}</span></span>
                <span>ρ: <span className="text-white font-bold">{b.measurements?.density ?? '—'} g/cm³</span></span>
                {b.measurements?.viscosity && <span>Viscosité: <span className="text-white font-bold">{b.measurements.viscosity} cP</span></span>}
              </div>
              {!b.isCompliant && (
                <p className="text-[10px] text-orange-400 font-bold">
                  Corrections: {(b.corrections || []).map(c => c.chemical).join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN — IndustrialComplex
// ═══════════════════════════════════════════════════════════════════════════════
const IndustrialComplex = () => {
  const [activeTab, setActiveTab] = useState('stock');

  const ACCENT = {
    blue:   'bg-blue-600',
    purple: 'bg-purple-600',
    red:    'bg-red-600',
    green:  'bg-green-700',
  };

  const ACTIVE_TAB_STYLE = {
    blue:   'bg-blue-600 text-white',
    purple: 'bg-purple-600 text-white',
    red:    'bg-red-600 text-white',
    green:  'bg-green-700 text-white',
  };

  const current = MODULE_TABS.find(t => t.id === activeTab);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Industrial Complex</h2>
          <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Système de Production Intégré — CINQD</p>
        </div>
        <div className={`w-2 h-8 rounded-full ${ACCENT[current?.accent]}`} />
      </div>

      {/* Module tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {MODULE_TABS.map(({ id, label, Icon, accent }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
              activeTab === id
                ? `${ACTIVE_TAB_STYLE[accent]} border-transparent shadow-lg`
                : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* Active module content */}
      <div className="min-h-[400px]">
        {activeTab === 'stock'      && <StockModule />}
        {activeTab === 'formula'    && <FormulaModule />}
        {activeTab === 'production' && <ProductionOrderModule />}
        {activeTab === 'qa'         && <QAModule />}
      </div>
    </div>
  );
};

export default IndustrialComplex;
