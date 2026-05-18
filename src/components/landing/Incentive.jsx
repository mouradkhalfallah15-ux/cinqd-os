import React from 'react';

const ITEMS = [
  '🚚 توصيل مجاني لجميع الولايات',
  '💳 دفع عند الاستلام',
  '✅ منتج أصلي 100%',
  '🔬 تركيبة صناعية احترافية',
  '⚡ تسليم خلال 48 ساعة',
  '↩️ إرجاع مجاني خلال 7 أيام',
];

export default function Incentive() {
  const repeated = [...ITEMS, ...ITEMS, ...ITEMS];
  return (
    <div className="bg-orange-500 text-white py-3 overflow-hidden">
      <div className="flex gap-0 animate-marquee whitespace-nowrap">
        {repeated.map((item, i) => (
          <span key={i} className="text-sm font-black mx-8 shrink-0">{item}</span>
        ))}
      </div>
    </div>
  );
}
