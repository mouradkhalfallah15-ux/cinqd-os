
import React from 'react';
import { Book, Gavel, FileText } from 'lucide-react';

const DocumentModel = () => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 relative backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-4">موديل الوثائق الذكي</h3>
      <div className="space-y-4">
        {/* Commerce Laws */}
        <div className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-lg">
          <Book className="w-6 h-6 text-blue-400 mt-1" />
          <div>
            <h4 className="font-semibold text-slate-200">قوانين التجارة</h4>
            <p className="text-sm text-slate-400">
              آخر نسخ مجلة التجارة التونسية والقوانين المنظمة للبيع عن بعد.
            </p>
          </div>
        </div>

        {/* Labor Laws */}
        <div className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-lg">
          <Gavel className="w-6 h-6 text-amber-400 mt-1" />
          <div>
            <h4 className="font-semibold text-slate-200">قوانين الشغل</h4>
            <p className="text-sm text-slate-400">
              مجلة الشغل التونسية لضمان حقوق العمال والشركة.
            </p>
          </div>
        </div>

        {/* Conventions */}
        <div className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-lg">
          <FileText className="w-6 h-6 text-green-400 mt-1" />
          <div>
            <h4 className="font-semibold text-slate-200">الاتفاقيات والعهود</h4>
            <p className="text-sm text-slate-400">
              نظام لاستخراج وتوليد نماذج العقود والعهود القانونية.
            </p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 text-xs text-slate-500">
        <p>Gemini 1.5 Pro: Auto-updated</p>
      </div>
    </div>
  );
};

export default DocumentModel;
