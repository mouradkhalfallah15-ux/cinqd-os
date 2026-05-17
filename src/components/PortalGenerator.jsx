import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.js';
import { FiLayout, FiPlus, FiExternalLink, FiCopy, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const MODULE_OPTIONS = ['Tableau de bord', 'Commandes', 'Stock', 'Facturation', 'RH', 'Rapport IA'];

// TODO: replace with real Firestore reads/writes
const getMockPortals = () => [
  {
    id: 'P-001',
    name: 'Portail Franchise Sfax',
    slug: 'sfax',
    modules: ['Tableau de bord', 'Commandes', 'Facturation'],
    active: true,
    url: 'https://erp.mkd-distrib.com/portal/sfax',
  },
];

const PortalCard = ({ portal, onToggle, onCopy }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-white font-bold text-base">{portal.name}</h3>
        <p className="text-slate-500 text-xs font-mono mt-0.5">/portal/{portal.slug}</p>
      </div>
      <button
        onClick={() => onToggle(portal.id)}
        className="text-xl text-slate-400 hover:text-cyan-400 transition-colors"
        title={portal.active ? 'Désactiver' : 'Activer'}
      >
        {portal.active ? <FiToggleRight className="text-cyan-400" /> : <FiToggleLeft />}
      </button>
    </div>

    <div className="flex flex-wrap gap-1.5">
      {portal.modules.map((m) => (
        <span key={m} className="text-xs bg-slate-700 text-slate-300 rounded-full px-2 py-0.5">{m}</span>
      ))}
    </div>

    <div className="flex gap-2 pt-1">
      <button
        onClick={() => onCopy(portal.url)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <FiCopy /> Copier le lien
      </button>
      <a
        href={portal.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
      >
        <FiExternalLink /> Ouvrir
      </a>
    </div>
  </div>
);

const PortalGenerator = () => {
  const [user, setUser]         = useState(undefined);
  const [portals, setPortals]   = useState(getMockPortals());
  const [creating, setCreating] = useState(false);
  const [draft, setDraft]       = useState({ name: '', slug: '', modules: [] });
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) window.location.replace('/admin/login');
    });
  }, []);

  const toggleModule = (m) =>
    setDraft((d) => ({
      ...d,
      modules: d.modules.includes(m) ? d.modules.filter((x) => x !== m) : [...d.modules, m],
    }));

  const handleCreate = () => {
    if (!draft.name || !draft.slug) return;
    setPortals((prev) => [
      ...prev,
      {
        id: `P-${String(prev.length + 1).padStart(3, '0')}`,
        ...draft,
        active: true,
        url: `https://erp.mkd-distrib.com/portal/${draft.slug}`,
      },
    ]);
    setDraft({ name: '', slug: '', modules: [] });
    setCreating(false);
  };

  const handleToggle = (id) =>
    setPortals((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (user === undefined) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <FiLayout className="text-cyan-400" /> Générateur de Portails
            </h1>
            <p className="text-slate-400 mt-1">Créez et gérez des micro-portails personnalisés pour vos franchisés.</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <FiPlus /> Nouveau portail
          </button>
        </div>

        {copied && (
          <div className="bg-green-900/40 border border-green-700 text-green-300 text-sm rounded-xl px-4 py-2">
            Lien copié dans le presse-papiers.
          </div>
        )}

        {creating && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouveau portail</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nom du portail</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Portail Franchise Tunis"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Slug (URL)</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="tunis"
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Modules activés</label>
              <div className="flex flex-wrap gap-2">
                {MODULE_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleModule(m)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      draft.modules.includes(m)
                        ? 'bg-cyan-700 border-cyan-600 text-white'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Créer le portail
              </button>
              <button
                onClick={() => setCreating(false)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-4 py-2 rounded-xl transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {portals.map((p) => (
            <PortalCard key={p.id} portal={p} onToggle={handleToggle} onCopy={handleCopy} />
          ))}
        </div>

        {portals.length === 0 && !creating && (
          <div className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500">
            <FiLayout className="mx-auto text-4xl mb-3" />
            <p className="font-medium">Aucun portail créé pour le moment.</p>
            <p className="text-sm mt-1">Cliquez sur « Nouveau portail » pour commencer.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default PortalGenerator;
