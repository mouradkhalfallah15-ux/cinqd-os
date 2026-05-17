
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FiCpu, FiLoader, FiZap, FiTrendingUp, FiAlertOctagon, FiGitBranch } from 'react-icons/fi';
import { getAiAudit, getDailyCost } from '../firebase-ai.js';

const AiAuditor = ({ branchId = 'sfax' }) => {
    const [productionOrders, setProductionOrders] = useState([]);
    const [packagingStock, setPackagingStock] = useState([]);
    const [auditResult, setAuditResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [dailyCost, setDailyCost] = useState(getDailyCost());

    const dailyBudget = 50;
    const costPercentage = Math.min((dailyCost / dailyBudget) * 100, 100);

    // Met en majuscule le nom de la branche pour l'affichage
    const branchName = branchId.charAt(0).toUpperCase() + branchId.slice(1);

    useEffect(() => {
        // Pour l'instant, on lit les données globales.
        // TODO: Adapter les requêtes pour lire les données spécifiques à la branche (ex: `sfax_production_orders`)
        const ordersQuery = query(collection(db, 'production_orders'), orderBy('createdAt', 'desc'), limit(5));
        const unsubOrders = onSnapshot(ordersQuery, 
            (snapshot) => setProductionOrders(snapshot.docs.map(doc => doc.data())),
            () => toast.error(`Erreur: Impossible de charger les ordres pour la branche ${branchName}.`)
        );

        const unsubPackaging = onSnapshot(collection(db, 'packaging_options'),
            (snapshot) => setPackagingStock(snapshot.docs.map(doc => ({...doc.data(), id: doc.id}))),
            () => toast.error(`Erreur: Impossible de charger le stock pour la branche ${branchName}.`)
        );
        
        return () => {
            unsubOrders();
            unsubPackaging();
        };
    }, [branchId]); // On relance le chargement si l'ID de la branche change

    const handleRunAudit = async () => {
        setIsLoading(true);
        setAuditResult(null);
        const result = await getAiAudit(productionOrders, packagingStock);
        setIsLoading(false);
        
        if (result && !result.error) {
            setAuditResult(result);
            toast.success(`Audit IA pour la branche ${branchName} terminé.`);
        }
        setDailyCost(getDailyCost());
    };

    return (
        <div className="bg-slate-800 text-white p-8 rounded-xl shadow-2xl max-w-4xl mx-auto font-sans">
            <div className="flex justify-between items-start border-b border-slate-700 pb-4 mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold">Auditeur Stratégique IA</h2>
                    <p className="text-slate-400 flex items-center"><FiGitBranch className="mr-2 text-red-500"/> Branche: {branchName}</p>
                </div>
                <button onClick={handleRunAudit} disabled={isLoading} 
                    className="flex items-center bg-transparent border border-red-500 text-red-400 font-bold py-2 px-4 rounded-lg hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
                    {isLoading ? <><FiLoader className="animate-spin mr-2"/> Analyse en cours...</> : <><FiCpu className="mr-2"/> Lancer l'Audit</>}
                </button>
            </div>

            {/* Le reste du composant reste identique pour l'instant... */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-300 mb-2">Consommation API de la session</h3>
                <div className="w-full bg-slate-700 rounded-full h-4">
                    <div className="bg-green-500 h-4 rounded-full" style={{ width: `${costPercentage}%` }}></div>
                </div>
                <p className="text-right text-sm text-slate-400 mt-1">${dailyCost.toFixed(4)} / ${dailyBudget} (par jour)</p>
            </div>

            {auditResult ? (
                 <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-200 mb-3 flex items-center"><FiZap className="mr-2 text-yellow-400"/> Synthèse Exécutive</h3>
                        <p className="bg-slate-900/50 p-4 rounded-lg text-slate-300 italic">{auditResult.executiveSummary}</p>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-200 mb-3 flex items-center"><FiTrendingUp className="mr-2 text-yellow-400"/> Recommandations Stratégiques</h3>
                        <div className="space-y-3">
                            {auditResult.strategicRecommendations.map((rec, i) => (
                                <div key={i} className="p-4 border-l-4 border-red-500 bg-slate-700/50 rounded-r-lg">
                                    <p className="font-semibold text-white">{rec.recommendation}</p>
                                    <p className="text-sm text-slate-400 mt-1">{rec.justification}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <FiCpu size={40} className="mx-auto mb-4"/>
                    <p>L'audit n'a pas encore été lancé pour la branche <strong>{branchName}</strong>.</p>
                    <p>Cliquez sur "Lancer l'Audit" pour obtenir une analyse stratégique.</p>
                </div>
            )}
        </div>
    );
};

export default AiAuditor;

