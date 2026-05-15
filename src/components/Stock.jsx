
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';

const Stock = () => {
    const [materialName, setMaterialName] = useState('');
    const [unit, setUnit] = useState('Kg');
    const [currentQuantity, setCurrentQuantity] = useState('');
    const [materials, setMaterials] = useState([]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'raw_materials'), (snapshot) => {
            const materialsData = [];
            snapshot.forEach((doc) => {
                materialsData.push({ ...doc.data(), id: doc.id });
            });
            setMaterials(materialsData);
        });

        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!materialName || !unit || !currentQuantity) return;

        try {
            await addDoc(collection(db, 'raw_materials'), {
                materialName,
                unit,
                currentQuantity: Number(currentQuantity),
            });
            setMaterialName('');
            setUnit('Kg');
            setCurrentQuantity('');
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    };

    return (
        <div className="bg-slate-900 text-white p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-red-500">Manage Stock</h2>
            
            <div className="bg-slate-800 p-6 rounded-lg mb-8">
                <h3 className="text-xl font-semibold mb-4">Add New Raw Material</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="materialName" className="block text-sm font-medium text-slate-400">Material Name</label>
                        <input
                            type="text"
                            id="materialName"
                            value={materialName}
                            onChange={(e) => setMaterialName(e.target.value)}
                            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="unit" className="block text-sm font-medium text-slate-400">Unit</label>
                        <select
                            id="unit"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm text-white"
                        >
                            <option>Kg</option>
                            <option>L</option>
                            <option>Unit</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="currentQuantity" className="block text-sm font-medium text-slate-400">Current Quantity</label>
                        <input
                            type="number"
                            id="currentQuantity"
                            value={currentQuantity}
                            onChange={(e) => setCurrentQuantity(e.target.value)}
                            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors duration-300"
                    >
                        Add Material
                    </button>
                </form>
            </div>

            <div>
                <h3 className="text-xl font-semibold mb-4">Current Stock</h3>
                <div className="overflow-x-auto bg-slate-800 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Material Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Unit</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Current Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700">
                            {materials.map((material) => (
                                <tr key={material.id} className="hover:bg-slate-700">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{material.materialName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{material.unit}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{material.currentQuantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Stock;
