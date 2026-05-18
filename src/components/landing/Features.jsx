import React from 'react';

const FEATURES = [
  {
    icon: '🧪',
    ar: 'تركيبة صناعية متطورة',
    fr: 'Formule industrielle avancée',
    desc: 'مصنوع من مواد خام مختارة بعناية — فعّال على الشحوم والبكتيريا والأوساخ الصعبة',
  },
  {
    icon: '🏨',
    ar: 'مستوى الفنادق والمستشفيات',
    fr: 'Qualité hôtels & hôpitaux',
    desc: 'تستخدمه كبرى الفنادق والعيادات والمصانع في الجزائر — نتائج مضمونة من الاستخدام الأول',
  },
  {
    icon: '💧',
    ar: 'تركيز عالٍ — يدوم أطول',
    fr: 'Haute concentration',
    desc: 'زجاجة واحدة تعادل 3 منتجات عادية — اقتصادي وفعّال في نفس الوقت',
  },
  {
    icon: '🌿',
    ar: 'آمن على الأسطح والأيدي',
    fr: 'Sûr pour toutes surfaces',
    desc: 'مناسب للرخام والزجاج والأرضيات والمطابخ — بدون تآكل أو أثر كيميائي',
  },
  {
    icon: '🇩🇿',
    ar: 'صُنع في الجزائر',
    fr: 'Fabriqué en Algérie',
    desc: 'منتج جزائري 100٪ — ندعم الصناعة المحلية ونضمن الجودة في كل مرحلة',
  },
  {
    icon: '📦',
    ar: 'تغليف محكم للتوصيل',
    fr: 'Emballage sécurisé',
    desc: 'تغليف خاص يضمن وصول المنتج سليماً إلى باب منزلك أينما كنت في الجزائر',
  },
];

export default function Features() {
  return (
    <div className="bg-white py-20">
      <div className="container mx-auto px-6">

        <div className="text-center mb-14" dir="rtl">
          <h2 className="text-4xl font-black text-gray-900 mb-3">لماذا CINQD؟</h2>
          <p className="text-gray-500 text-lg">Pourquoi choisir CINQD ?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.ar} className="bg-[#fafafa] border border-gray-100 rounded-2xl p-6 hover:border-orange-200 hover:shadow-md transition-all" dir="rtl">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-black text-gray-900 mb-1">{f.ar}</h3>
              <p className="text-xs text-orange-500 font-bold mb-3 tracking-wide">{f.fr}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
