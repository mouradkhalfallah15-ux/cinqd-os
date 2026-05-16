import React from 'react';
import { Video, Image, MessageSquare } from 'lucide-react';

const MediaAssets = () => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-4">مستودع الوسائط</h3>
      <div className="space-y-4">
        {/* Videos */}
        <div className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-lg">
          <Video className="w-6 h-6 text-red-400 mt-1" />
          <div>
            <h4 className="font-semibold text-slate-200">الفيديوهات</h4>
            <p className="text-sm text-slate-400">
              تنظيم الفيديوهات الخام والممنتجة.
            </p>
          </div>
        </div>

        {/* Affiches */}
        <div className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-lg">
          <Image className="w-6 h-6 text-purple-400 mt-1" />
          <div>
            <h4 className="font-semibold text-slate-200">الأفيشات</h4>
            <p className="text-sm text-slate-400">
              تخزين التصاميم الجرافيكية والهوية البصرية.
            </p>
          </div>
        </div>

        {/* Feedbacks */}
        <div className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-lg">
          <MessageSquare className="w-6 h-6 text-yellow-400 mt-1" />
          <div>
            <h4 className="font-semibold text-slate-200">التغذية الراجعة</h4>
            <p className="text-sm text-slate-400">
              أتمتة جمع لقطات الشاشة والشهادات من وسائل التواصل.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaAssets;
