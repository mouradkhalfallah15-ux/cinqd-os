import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.js';
import { FiUsers, FiMapPin, FiTrendingUp, FiDollarSign, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const StatCard = ({ icon, label, value, sub }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 hover:bg-slate-800/60 transition-colors">
    <div className="text-3xl text-cyan-400">{icon}</div>
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    Actif:    'bg-green-900/40 text-green-400 border-green-800',
    Suspendu: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    Inactif:  'bg-red-900/40 text-red-400 border-red-800',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] ?? styles.Inactif}`}>
      {status}
    </span>
  );
};

// TODO: replace with real Firestore reads
const getMockFranchises = () => [
  { id: 'F-001', name: 'Franchise Sfax Centre',   region: 'Sfax',   revenue: '42,300 TND', status: 'Actif',    members: 12 },
  { id: 'F-002', name: 'Franchise Tunis Nord',    region: 'Tunis',  revenue: '38,700 TND', status: 'Actif',    members: 9  },
  { id: 'F-003', name: 'Franchise Sousse Côtier', region: 'Sousse', revenue: '0 TND',       status: 'Suspendu', members: 0  },
];

const FranchiseDashboard = () => {
  const [user, setUser] = useState(undefined);
  const [franchises] = useState(getMockFranchises());

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) window.location.replace('/admin/login');
    });
  }, []);

  if (user === undefined) return null;

  const totalRevenue = '81,000 TND';
  const activeCount  = franchises.filter((f) => f.status === 'Actif').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        <div>
          <h1 className="text-3xl font-extrabold text-white">Tableau de Bord Franchise & Affiliation</h1>
          <p className="text-slate-400 mt-1">Gérez et supervisez votre réseau de franchises et d'affiliés.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<FiMapPin />}      label="Franchises totales" value={franchises.length}  />
          <StatCard icon={<FiCheckCircle />} label="Actives"            value={activeCount}         />
          <StatCard icon={<FiUsers />}       label="Membres réseau"     value="21"                  />
          <StatCard icon={<FiDollarSign />}  label="CA réseau"          value={totalRevenue} sub="Ce mois" />
        </div>

        <div className="bg-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-cyan-400" /> Réseau de Franchises
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-3 pr-4">ID</th>
                  <th className="text-left py-3 pr-4">Nom</th>
                  <th className="text-left py-3 pr-4">Région</th>
                  <th className="text-left py-3 pr-4">Membres</th>
                  <th className="text-left py-3 pr-4">Revenu</th>
                  <th className="text-left py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {franchises.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 pr-4 text-slate-500 font-mono">{f.id}</td>
                    <td className="py-3 pr-4 font-medium text-white">{f.name}</td>
                    <td className="py-3 pr-4 text-slate-300">{f.region}</td>
                    <td className="py-3 pr-4 text-slate-300">{f.members}</td>
                    <td className="py-3 pr-4 text-cyan-400 font-semibold">{f.revenue}</td>
                    <td className="py-3"><StatusBadge status={f.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center text-slate-500">
          <FiAlertCircle className="mx-auto text-3xl mb-2" />
          <p className="font-medium">Ajouter une nouvelle franchise (À venir)</p>
          <p className="text-sm mt-1">Formulaire d'intégration et contrat numérique</p>
        </div>

      </div>
    </div>
  );
};

export default FranchiseDashboard;
