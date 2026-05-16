import React from 'react';

export default function Pricing() {
  return (
    <div className="bg-white py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">Choose Your Pack</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border border-gray-200 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">1 Item</h3>
            <p className="text-4xl font-bold mb-4">$19.99</p>
            <button className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg">
              Select
            </button>
          </div>
          <div className="border-4 border-blue-600 rounded-lg p-8 text-center relative">
            <div className="absolute top-0 -mt-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
              Best Seller
            </div>
            <h3 className="text-2xl font-bold mb-4">2 Items</h3>
            <p className="text-4xl font-bold mb-4">$34.99</p>
            <button className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg">
              Select
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">3 Items</h3>
            <p className="text-4xl font-bold mb-4">$49.99</p>
            <button className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg">
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
