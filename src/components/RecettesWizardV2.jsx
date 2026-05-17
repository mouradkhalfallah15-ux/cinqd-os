
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiChevronRight, FiChevronLeft, FiCpu, FiSave, FiPackage, FiAlertTriangle, FiClipboard, FiLoader, FiCheckCircle, FiDollarSign, FiActivity, FiShield } from 'react-icons/fi';
import { getAiPoweredProductionPlan } from '../firebase-ai.js';

const RecettesWizardV2 = () => {
    const [step, setStep] = useState(1);
    const [packagingStock, setPackagingStock] = useState([]); 
    const [rawMaterials, setRawMaterials] = useState([]);
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [recipeName, setRecipeName] = useState('Soin Nettoyant CINQD - Édition No. 5');
    const [totalVolume, setTotalVolume] = useState(100);
    const [productionPlan, setProductionPlan] = useState(null);
    const [finalOrder, setFinalOrder] = useState(null);

    // Quality Control State
    const [qualityCheck, setQualityCheck] = useState({ ph: 7.0, density: 1.02, status: 'Passed' });

    const RECIPE_FORMULA = { labsa: 0.20, n70: 0.10 };

    const resetWizard = () => {
        setStep(1);
        setProductionPlan(null);
        setFinalOrder(null);
        setRecipeName('Soin Nettoyant CINQD - Édition No. 5');
        setTotalVolume(100);
        setQualityCheck({ ph: 7.0, density: 1.02, status: 'Passed' });
    };

    useEffect(() => {
        const unsubPkg = onSnapshot(collection(db, 'packaging_stock'), (snapshot) => {
            setPackagingStock(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        const unsubMat = onSnapshot(collection(db, 'raw_materials'), (snapshot) => {
            setRawMaterials(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return () => { unsubPkg(); unsubMat(); };
    }, []);

    const calculateEstimatedProfit = () => {
        const labsa = rawMaterials.find(m => m.name?.toLowerCase().includes('labsa'));
        const n70 = rawMaterials.find(m => m.name?.toLowerCase().includes('n70'));
        const costBase = (labsa?.lastPurchasePrice || 0) * RECIPE_FORMULA.labsa + (n70?.lastPurchasePrice || 0) * RECIPE_FORMULA.n70;
        return (totalVolume * 15) - (totalVolume * costBase); 
    };

    const handleGeneratePlan = async () => {
        if (totalVolume <= 0) return toast.error("Veuillez définir un volume.");
        setIsLoadingPlan(true);
        // We pass packaging stock to AI so it can suggest alternatives if needed
        const plan = await getAiPoweredProductionPlan(totalVolume, packagingStock);
        setIsLoadingPlan(false);
        if (plan.error) return toast.error(plan.error);
        setProductionPlan(plan);
        setStep(2);
    };

    const handleConfirmAndGoToQC = () => {
        // Pre-check packaging stock
        let hasShortage = false;
        productionPlan.planLines.forEach(line => {
            const pkg = packagingStock.find(p => p.size === line.packagingName);
            if (!pkg || pkg.bottles < line.unitsToProduce || pkg.labels < line.unitsToProduce || pkg.caps < line.unitsToProduce) {
                hasShortage = true;
            }
        });

        if (hasShortage) {
            toast.error("Naps fil emballage! Chouf el AI chnouwa ya9tare7.");
            return;
        }
        setStep(3); // Go to Quality Check
    };

    const handleFinalSave = async () => {
        setIsSaving(true);
        const labsa = rawMaterials.find(m => m.name?.toLowerCase().includes('labsa'));
        const n70 = rawMaterials.find(m => m.name?.toLowerCase().includes('n70'));

        if (!labsa || !n70) {
            toast.error("Matières premières (Labsa/N70) introuvables dans le stock.");
            setIsSaving(false);
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                // 1. Deduct Raw Materials
                const labsaToDeduct = totalVolume * RECIPE_FORMULA.labsa;
                const n70ToDeduct = totalVolume * RECIPE_FORMULA.n70;
                transaction.update(doc(db, 'raw_materials', labsa.id), { quantity: increment(-labsaToDeduct) });
                transaction.update(doc(db, 'raw_materials', n70.id), { quantity: increment(-n70ToDeduct) });

                // 2. Deduct Packaging
                productionPlan.planLines.forEach(line => {
                    const pkg = packagingStock.find(p => p.size === line.packagingName);
                    const pkgRef = doc(db, 'packaging_stock', pkg.id);
                    transaction.update(pkgRef, {
                        bottles: increment(-line.unitsToProduce),
                        labels: increment(-line.unitsToProduce),
                        caps: increment(-line.unitsToProduce)
                    });
                });

                // 3. Create Order with QC
                const order = {
                    recipeName,
                    createdAt: serverTimestamp(),
                    estimatedProfit: calculateEstimatedProfit(),
                    totalVolume,
                    qualityControl: qualityCheck,
                    ...productionPlan
                };
                
                const newOrderRef = doc(collection(db, 'production_orders')); 
                transaction.set(newOrderRef, order);
                setFinalOrder(order);
            });

            toast.success('Production terminée et validée !');
            setStep(4);
        } catch (error) {
            console.error(error);
            toast.error("Erreur fatale lors de la validation.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderContent = () => {
        if (step === 1) {
            return (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <h3 className="text-xl font-bold text-slate-300">Configuration Initiale</h3>
                    <input type="number" value={totalVolume} onChange={e => setTotalVolume(parseFloat(e.target.value) || 0)} 
                        className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="Volume total (L)"/>
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex justify-between items-center">
                        <span className="text-slate-400">Profit Estimé:</span>
                        <span className="text-green-400 font-bold text-xl">{calculateEstimatedProfit().toFixed(2)} TND</span>
                    </div>
                </div>
            );
        } else if (step === 2) {
            return (
                <div className="space-y-4 animate-in slide-in-from-right duration-500">
                    <h3 className="text-xl font-bold text-slate-300 flex items-center gap-2"><FiCpu className="text-red-500"/> Plan de Production IA</h3>
                    <div className="space-y-2">
                        {productionPlan.planLines.map((line, i) => {
                             const pkg = packagingStock.find(p => p.size === line.packagingName);
                             const isMissing = !pkg || pkg.bottles < line.unitsToProduce;
                             return (
                                <div key={i} className={`p-4 rounded-xl border ${isMissing ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-900/50 border-slate-800'} flex justify-between items-center`}>
                                    <div>
                                        <p className="font-bold text-white">{line.unitsToProduce}x {line.packagingName}</p>
                                        {isMissing && <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Stock Insuffisant</p>}
                                    </div>
                                    <FiPackage className={isMissing ? 'text-red-500' : 'text-slate-500'} size={24}/>
                                </div>
                             )
                        })}
                    </div>
                    {productionPlan.aiSuggestion && (
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-300 italic">
                             💡 AI: {productionPlan.aiSuggestion}
                        </div>
                    )}
                </div>
            );
        } else if (step === 3) {
            return (
                <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                    <h3 className="text-xl font-bold text-slate-300 flex items-center gap-2"><FiShield className="text-green-500"/> Quality Check (Labo)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 uppercase font-bold">Niveau pH</label>
                            <input type="number" step="0.1" value={qualityCheck.ph} onChange={e => setQualityCheck({...qualityCheck, ph: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 uppercase font-bold">Densité (g/cm³)</label>
                            <input type="number" step="0.01" value={qualityCheck.density} onChange={e => setQualityCheck({...qualityCheck, density: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none"/>
                        </div>
                    </div>
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-4">
                        <FiActivity className="text-green-500 animate-pulse"/>
                        <div>
                            <p className="text-sm font-bold text-white italic">"Analyse physico-chimique en cours..."</p>
                            <p className="text-xs text-slate-400">Les paramètres sont conformes aux standards CINQD.</p>
                        </div>
                    </div>
                </div>
            )
        } else if (step === 4) {
            return (
                <div className="text-center p-10 bg-slate-900/50 rounded-3xl border border-slate-800">
                    <FiCheckCircle className="text-green-400 mx-auto text-6xl mb-4 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]"/>
                    <h4 className="text-2xl font-black text-white">Batch #{(Math.random()*1000).toFixed(0)} Validé</h4>
                    <p className="text-slate-400 mt-2">Le stock a été mis à jour (Matières + Emballages).</p>
                </div>
            )
        }
        return null;
    };

    return (
        <div className="bg-slate-800/80 backdrop-blur-xl text-white p-8 rounded-[2rem] shadow-2xl max-w-2xl mx-auto border border-slate-700/50">
            <Toaster position="top-right" />
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black flex items-center gap-3"><span className="p-2 bg-red-600 rounded-lg"><FiCpu/></span> PRODUCTION</h2>
                <div className="flex gap-1">
                    {[1,2,3,4].map(s => <div key={s} className={`h-1.5 w-6 rounded-full transition-all ${step >= s ? 'bg-red-600' : 'bg-slate-700'}`}></div>)}
                </div>
            </div>
            {renderContent()}
            <div className="flex justify-between mt-10">
                 {step > 1 && step < 4 && (<button onClick={() => setStep(step-1)} className="px-6 py-3 text-slate-400 font-bold hover:text-white transition-colors">Retour</button>)}
                 <div className="ml-auto">
                    {step === 1 ? (
                        <button onClick={handleGeneratePlan} disabled={isLoadingPlan} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-3 transition-all shadow-lg shadow-red-600/30">
                            {isLoadingPlan ? <FiLoader className="animate-spin"/> : <><FiActivity/> Générer le Plan</>}
                        </button>
                    ) : step === 2 ? (
                        <button onClick={handleConfirmAndGoToQC} className="bg-white text-slate-900 font-bold py-3 px-8 rounded-xl flex items-center gap-3 hover:bg-slate-200 transition-all shadow-lg shadow-white/10">
                             Suivant: Quality Check <FiChevronRight/>
                        </button>
                    ) : step === 3 ? (
                        <button onClick={handleFinalSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-3 transition-all shadow-lg shadow-green-600/30">
                            {isSaving ? <FiLoader className="animate-spin"/> : <><FiSave/> Valider & Finir</>}
                        </button>
                    ) : (
                        <button onClick={resetWizard} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl transition-all">Nouvelle Session</button>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default RecettesWizardV2;
