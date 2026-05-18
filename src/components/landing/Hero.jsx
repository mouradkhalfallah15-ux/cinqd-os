import React from 'react';

export default function Hero() {
  const scroll = () => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="bg-[#fafafa]">
      {/* Nav */}
      <header className="container mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-gray-900">CINQD</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">Premium</span>
        </div>
        <button onClick={scroll}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-black px-5 py-2.5 rounded-xl transition-colors">
          اطلب الآن
        </button>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-6 pt-10 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Copy — RTL */}
          <div className="text-right order-2 md:order-1" dir="rtl">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block"></span>
              التوصيل متوفر في جميع ولايات الجزائر
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight mb-4">
              نظافة استثنائية<br />
              <span className="text-orange-500">بمكونات احترافية</span>
            </h1>

            <p className="text-lg text-gray-500 mb-3 font-medium">
              منتجات التنظيف الصناعي CINQD — تركيبة متطورة للمنازل والفنادق والمحلات
            </p>
            <p className="text-sm text-gray-400 mb-8">
              Multi-Usage Premium Clean · Marble Care Line · Glass & Surface
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button onClick={scroll}
                className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black py-4 px-8 rounded-2xl text-lg transition-all shadow-lg shadow-orange-200">
                🛒 اطلب الآن — الدفع عند الاستلام
              </button>
              <button onClick={scroll}
                className="border-2 border-gray-200 hover:border-orange-300 text-gray-700 font-bold py-4 px-6 rounded-2xl text-base transition-colors">
                اختر حجمك ↓
              </button>
            </div>

            <div className="flex gap-6 mt-8 justify-end text-right">
              {[['🚚','توصيل مجاني','لجميع الولايات'],['💳','دفع عند الاستلام','بدون دفع مسبق'],['↩️','إرجاع مجاني','خلال 7 أيام']].map(([icon,t,s])=>(
                <div key={t} className="text-center">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-xs font-black text-gray-800">{t}</div>
                  <div className="text-[10px] text-gray-400">{s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Product visual */}
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative">
              <div className="w-72 h-72 md:w-96 md:h-96 bg-gradient-to-br from-orange-100 to-orange-50 rounded-3xl flex items-center justify-center shadow-xl shadow-orange-100">
                <div className="text-center">
                  <div className="text-8xl mb-4">🧴</div>
                  <div className="font-black text-gray-800 text-lg">CINQD</div>
                  <div className="text-orange-500 font-bold text-sm">Multi-Usage Premium</div>
                </div>
              </div>
              {/* Badges */}
              <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-md">
                🔥 الأكثر مبيعاً
              </div>
              <div className="absolute -bottom-3 -left-3 bg-white border-2 border-orange-200 text-orange-600 text-xs font-black px-3 py-1.5 rounded-full shadow-md">
                ✅ جودة مضمونة
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
