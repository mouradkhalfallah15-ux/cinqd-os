import React from 'react';

export default function Checkout() {
  return (
    <div className="bg-gray-100 py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">Checkout</h2>
        <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-8">
          <form>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Name
              </label>
              <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="name" type="text" placeholder="Your Name" />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                Phone Number
              </label>
              <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="phone" type="tel" placeholder="Your Phone Number" />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                Address
              </label>
              <textarea className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="address" placeholder="Your Address"></textarea>
            </div>
            <div className="flex items-center justify-center">
              <button className="bg-red-600 text-white font-bold py-4 px-8 rounded-lg text-xl hover:bg-red-700 focus:outline-none focus:shadow-outline" type="button">
                COMMANDER
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
