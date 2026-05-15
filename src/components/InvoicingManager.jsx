
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, runTransaction, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiFileText, FiTruck, FiShoppingCart, FiPlus, FiPrinter, FiCheckCircle, FiPackage, FiUser, FiNavigation } from 'react-icons/fi';

const InvoicingManager = () => {
    const [tab, setTab] = useState('Sales'); // Sales or Purchases
    const [docType, setDocType] = useState('Devis'); // Devis, BL, Facture...
    const [items, setItems] = useState([{ name: '', quantity: 1, price: 0 }]);
    const [clientData, setClientData] = useState({ name: '', type: 'B2B', address: '' });
    const [deliveryData, setDeliveryData] = useState({ type: 'Direct', carrier: '', driver: '', vehicle: '' });
    const [stock, setStock] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'raw_materials'), (snapshot) => {
            setStock(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const addItem = () => setItems([...items, { name: '', quantity: 1, price: 0 }]);
    
    const calculateTotal = () => items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    const handleCreateDocument = async () => {
        if (!clientData.name) return toast.error("أدخل اسم العميل / المورد");
        
        try {
            await runTransaction(db, async (transaction) => {
                // 1. Create Document Record
                const docRef = collection(db, 'documents');
                const newDocRef = doc(docRef);
                const document = {
                    tab,
                    docType,
                    client: clientData,
                    delivery: deliveryData,
                    items,
                    total: calculateTotal(),
                    createdAt: serverTimestamp(),
                    status: 'confirmed'
                };
                transaction.set(newDocRef, document);

                // 2. Stock Logic (Auto-Sync)
                if (tab === 'Purchases' && (docType === 'Bon d\'achat' || docType === 'Livraison')) {
                    // Generate Bon d'entrée & Increase Stock
                    items.forEach(item => {
                        const stockItem = stock.find(s => s.name === item.name);
                        if (stockItem) {
                            transaction.update(doc(db, 'raw_materials', stockItem.id), {
                                quantity: stockItem.quantity + parseFloat(item.quantity)
                            });
                        }
                    });
                    toast.success("تم توليد Bon d'entrée وزيادة الستوك");
                }

                if (tab === 'Sales' && docType === 'Bon de livraison') {
                    // Generate Bon de sortie & Decrease Stock
                    items.forEach(item => {
                        const stockItem = stock.find(s => s.name === item.name);
                        if (stockItem) {
                            transaction.update(doc(db, 'raw_materials', stockItem.id), {
                                quantity: stockItem.quantity - parseFloat(item.quantity)
                            });
                        }
                    });
                    toast.success("تم توليد Bon de sortie ونقص الستوك آلياً");
                }
            });
            toast.success(`${docType} تم الحفظ بنجاح`);
        } catch (error) {
            console.error(error);
            toast.error("خطأ في معالجة الوثيقة");
        }
    };

    const handlePrint = () => {
        window.print();
        toast.success("جاري تحضير النسخة للطباعة...");
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl">
            <Toaster position="top-right" />
            
            {/* Header / Tabs */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    <button onClick={() => {setTab('Sales'); setDocType('Devis');}} className={`px-8 py-3 rounded-xl font-bold transition-all ${tab === 'Sales' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Sales (المبيعات)</button>
                    <button onClick={() => {setTab('Purchases'); setDocType('Bon de commande');}} className={`px-8 py-3 rounded-xl font-bold transition-all ${tab === 'Purchases' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Purchases (الشراءات)</button>
                </div>
                <button onClick={handlePrint} className="p-4 bg-slate-800 rounded-2xl text-white hover:bg-slate-700 transition-all border border-slate-700">
                    <FiPrinter size={20}/>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Document Selector & Client Info */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 block">Document Type</label>
                        <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-white outline-none">
                            {tab === 'Sales' ? (
                                <>
                                    <option>Devis</option>
                                    <option>Bon de commande client</option>
                                    <option>Bon de livraison</option>
                                    <option>Facture client</option>
                                    <option>Avoir</option>
                                </>
                            ) : (
                                <>
                                    <option>Demande d'achat</option>
                                    <option>Bon de commande</option>
                                    <option>Bon d'achat / Livraison</option>
                                    <option>Facture d'achat</option>
                                    <option>Avoir fournisseur</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 space-y-4">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Client / Supplier Info</label>
                        <input type="text" placeholder="Nom complet" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-blue-500"/>
                        <input type="text" placeholder="Adresse" value={clientData.address} onChange={e => setClientData({...clientData, address: e.target.value})} className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-white outline-none"/>
                    </div>

                    {docType === 'Bon de livraison' && (
                        <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-3xl space-y-4">
                            <h4 className="text-xs font-black text-blue-500 flex items-center gap-2 uppercase"><FiTruck/> Bon de Sortie Details</h4>
                            <select value={deliveryData.type} onChange={e => setDeliveryData({...deliveryData, type: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none">
                                <option value="Direct">Direct / B2B (شاحنة الشركة)</option>
                                <option value="E-commerce">E-commerce (شركة توصيل)</option>
                            </select>
                            <input type="text" placeholder={deliveryData.type === 'E-commerce' ? "Société de livraison" : "Chauffeur"} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none"/>
                            <input type="text" placeholder="Matricule Véhicule" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none"/>
                        </div>
                    )}
                </div>

                {/* Items Table */}
                <div className="lg:col-span-8">
                    <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-900/50">
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500">Article</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500">Quantité</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500">Prix Unit.</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-900/50">
                                        <td className="p-2">
                                            <select value={item.name} onChange={e => {
                                                const newItems = [...items];
                                                newItems[index].name = e.target.value;
                                                setItems(newItems);
                                            }} className="w-full bg-transparent p-2 text-sm outline-none">
                                                <option value="">Sélectionner</option>
                                                {stock.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <input type="number" value={item.quantity} onChange={e => {
                                                const newItems = [...items];
                                                newItems[index].quantity = e.target.value;
                                                setItems(newItems);
                                            }} className="w-20 bg-slate-900 border border-slate-800 p-2 rounded-lg text-sm text-center outline-none"/>
                                        </td>
                                        <td className="p-2">
                                            <input type="number" value={item.price} onChange={e => {
                                                const newItems = [...items];
                                                newItems[index].price = e.target.value;
                                                setItems(newItems);
                                            }} className="w-24 bg-slate-900 border border-slate-800 p-2 rounded-lg text-sm text-center outline-none text-green-400 font-bold"/>
                                        </td>
                                        <td className="p-4 text-right font-bold text-white">{(item.quantity * item.price).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={addItem} className="w-full p-4 text-slate-500 hover:text-white flex items-center justify-center gap-2 transition-all border-t border-slate-800">
                            <FiPlus/> Ajouter un article
                        </button>
                    </div>

                    <div className="mt-8 flex justify-between items-end">
                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                             <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Total Document</p>
                             <p className="text-4xl font-black text-white">{calculateTotal().toFixed(3)} <span className="text-sm text-slate-400">TND</span></p>
                        </div>
                        <button onClick={handleCreateDocument} className="px-12 py-5 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-green-600/20">
                            <FiCheckCircle size={24}/> {docType === 'Bon de livraison' ? 'Valider & Bon de Sortie' : 'Valider Document'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Print Section (Hidden on UI, shown on print) */}
            <div className="hidden print:block fixed inset-0 bg-white text-black p-10 z-[1000]">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-4xl font-black mb-2">CINQD INDUSTRIAL</h1>
                        <p className="text-sm">Matricule Fiscal: 000000/A/M/000</p>
                        <p className="text-sm">Adresse: Route de Tunis, Tunis</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold uppercase">{docType}</h2>
                        <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="mb-10 p-4 border border-black rounded-lg">
                    <p className="font-bold">Client / Destinataire: {clientData.name}</p>
                    <p>Adresse: {clientData.address}</p>
                    {docType === 'Bon de livraison' && <p className="mt-2 font-bold uppercase">Mode: {deliveryData.type}</p>}
                </div>
                <table className="w-full border-collapse border border-black mb-10">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-2">Article</th>
                            <th className="border border-black p-2">Quantité</th>
                            <th className="border border-black p-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => (
                            <tr key={i}>
                                <td className="border border-black p-2">{item.name}</td>
                                <td className="border border-black p-2 text-center">{item.quantity}</td>
                                <td className="border border-black p-2 text-right">{(item.quantity * item.price).toFixed(3)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="text-right text-2xl font-black">
                    TOTAL: {calculateTotal().toFixed(3)} TND
                </div>
                <div className="mt-20 flex justify-around text-center italic text-sm">
                    <div>Signature & Cachet<br/>CINQD</div>
                    <div>Accusé de réception<br/>Client</div>
                </div>
            </div>
        </div>
    );
};

export default InvoicingManager;
