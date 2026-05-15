
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiPackage, FiLayers, FiAlertTriangle, FiPlus, FiSearch, FiClock } from 'react-icons/fi';

const StockManagement = () => {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [materialName, setMaterialName] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('Raw Material');
  const [lastPurchasePrice, setLastPurchasePrice] = useState('');
  const [minThreshold, setMinThreshold] = useState('');
  const [composition, setComposition] = useState(''); // Simple text area for now
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch materials from Firestore
  useEffect(() => {
    // Ensure you have a 'raw_materials' collection in your Firestore
    const unsubscribe = onSnapshot(collection(db, 'raw_materials'), (snapshot) => {
      const newMaterials = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      setMaterials(newMaterials);
      setFilteredMaterials(newMaterials);
    }, (error) => {
      console.error("Error fetching materials:", error);
      toast.error("Could not connect to the database.");
    });

    return () => unsubscribe();
  }, []);

  // Filter materials based on search term
  useEffect(() => {
    const filtered = materials.filter(material =>
      (material.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (material.id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    setFilteredMaterials(filtered);
  }, [searchTerm, materials]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!materialName || !quantity || !lastPurchasePrice || !minThreshold) {
        toast.error('Please fill all required fields!');
        return;
    }

    let newMaterial = {
      name: materialName,
      unit,
      quantity: Number(quantity),
      category,
      lastPurchasePrice: Number(lastPurchasePrice),
      minThreshold: Number(minThreshold),
      createdAt: serverTimestamp(),
    };

    if (category === 'Intermediate Patch') {
      newMaterial.composition = composition;
    }

    try {
        await addDoc(collection(db, 'raw_materials'), newMaterial);
        toast.success('Item added successfully!');
        // Reset form
        setMaterialName('');
        setUnit('Kg');
        setQuantity('');
        setCategory('Raw Material');
        setLastPurchasePrice('');
        setMinThreshold('');
        setComposition('');
    } catch (error) {
        toast.error('Failed to add item.');
        console.error("Error adding document: ", error);
    }
  };

  const fetchStockValue = (material) => {
      if(material && typeof material.quantity === 'number' && typeof material.lastPurchasePrice === 'number') {
          return (material.quantity * material.lastPurchasePrice).toFixed(2);
      }
      return '0.00';
  }

  const fetchPatchHistory = (patch) => {
      // In a real app, this would fetch from a history sub-collection or trigger a modal.
      const historyMessage = patch.createdAt?.toDate().toLocaleString() || 'No history available';
      toast(`Manufacturing History for ${patch.name}:
- Manufactured on: ${historyMessage}`, { icon: <FiClock/> });
  }

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans">
      <Toaster position="top-right" toastOptions={{
          style: {
            background: '#334155',
            color: '#fff',
          },
        }} />
      <main className="container mx-auto px-4 py-12">
        <header className="flex items-center mb-12">
          <a href="/industrial" className="text-red-500 hover:text-red-400 transition-colors duration-300 mr-4">&lt; Back to Dashboard</a>
          <h1 className="text-4xl font-extrabold">Stock <span className="text-red-500">Management</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-slate-800 rounded-xl shadow-lg p-8 h-fit">
            <h2 className="text-2xl font-bold text-slate-200 mb-6 flex items-center"><FiPlus className="mr-2"/>Add New Item</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option>Raw Material</option>
                  <option>Intermediate Patch</option>
                </select>
              </div>
              <div>
                <label htmlFor="materialName" className="block text-sm font-medium text-slate-400 mb-2">Name</label>
                <input type="text" id="materialName" value={materialName} onChange={(e) => setMaterialName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-slate-400 mb-2">Quantity</label>
                  <input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-slate-400 mb-2">Unit</label>
                  <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option>Kg</option>
                    <option>L</option>
                    <option>Unit</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="lastPurchasePrice" className="block text-sm font-medium text-slate-400 mb-2">Last Price ($)</label>
                    <input type="number" step="0.01" id="lastPurchasePrice" value={lastPurchasePrice} onChange={(e) => setLastPurchasePrice(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                 </div>
                 <div>
                    <label htmlFor="minThreshold" className="block text-sm font-medium text-slate-400 mb-2">Min. Threshold</label>
                    <input type="number" id="minThreshold" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                 </div>
              </div>
              {category === 'Intermediate Patch' && (
                <div>
                  <label htmlFor="composition" className="block text-sm font-medium text-slate-400 mb-2">Composition</label>
                  <textarea id="composition" value={composition} onChange={(e) => setComposition(e.target.value)} placeholder="e.g., Material A: 2kg, Material B: 1L" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500" rows="3"></textarea>
                </div>
              )}
              <button type="submit" className="w-full bg-red-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-600 transition-colors duration-300 flex items-center justify-center mt-6">
                <FiPlus className="mr-2"/> Add Item to Inventory
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-lg p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-200 flex items-center"><FiPackage className="mr-3"/>Current Inventory</h2>
                <div className="relative w-full sm:w-auto">
                    <input type="text" placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-700">
                    <tr>
                        <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-sm tracking-wider">Item</th>
                        <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-sm tracking-wider">Qty / Unit</th>
                        <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-sm tracking-wider">Stock Value</th>
                        <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-sm tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((material) => {
                    const isLowStock = material.quantity < material.minThreshold;
                    return (
                      <tr key={material.id} className={`border-b border-slate-800 ${isLowStock ? 'bg-red-900/20' : ''} hover:bg-slate-700/50 transition-colors duration-200`}>
                        <td className="py-4 px-4 text-white">
                            <div className="flex items-center">
                                {material.category === 'Raw Material' ? <FiPackage size={20} className="mr-4 text-red-500"/> : <FiLayers size={20} className="mr-4 text-blue-500"/>}
                                <div>
                                    <p className="font-bold">{material.name}</p>
                                    <p className="text-xs text-slate-400">ID: {material.id}</p>
                                </div>
                            </div>
                        </td>
                        <td className={`py-4 px-4 font-mono ${isLowStock ? 'text-red-400' : 'text-white'}`}>
                            <div className="flex items-center">
                                {isLowStock && <FiAlertTriangle title="Low Stock" className="mr-2"/>}
                                <span>{material.quantity} {material.unit}</span>
                            </div>
                        </td>
                        <td className="py-4 px-4 text-white font-mono">${fetchStockValue(material)}</td>
                        <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                                {material.category === 'Intermediate Patch' && 
                                    <button onClick={() => fetchPatchHistory(material)} className="text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-700 transition-colors duration-200" title="View History">
                                        <FiClock />
                                    </button>
                                }
                                {isLowStock && 
                                    <button className="bg-yellow-500 text-slate-900 font-bold text-xs py-1 px-3 rounded-full hover:bg-yellow-400 transition-colors duration-200">
                                        Quick Restock
                                    </button>
                                }
                            </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StockManagement;
