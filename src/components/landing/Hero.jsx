import React from 'react';

export default function Hero() {
  return (
    <div className="bg-white">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold">Cinqd</div>
        <div className="bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-1 rounded-full">
          Direct from Factory
        </div>
      </header>
      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-4">Your favorite products, delivered faster.</h1>
        <p className="text-xl text-gray-600 mb-8">The best quality at the best price. Direct from factory.</p>
        <div className="flex justify-center">
            <div className="w-full max-w-lg h-96 bg-gray-200 rounded-lg">
                {/* Product space */}
            </div>
        </div>
        <button
          className="bg-blue-600 text-white font-bold py-4 px-8 rounded-lg mt-8 text-xl animate-pulse"
          onClick={() => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' })}
        >
          COMMANDER MAINTENANT
        </button>
      </main>
    </div>
  );
}
