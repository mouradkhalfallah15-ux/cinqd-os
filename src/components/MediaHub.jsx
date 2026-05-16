import React from 'react';
import DocumentModel from './DocumentModel';
import MediaAssets from './MediaAssets';
import { Building2, LayoutDashboard, Settings } from 'lucide-react';

const MediaHub = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Media Hub Header */}
      <div className="p-8 border-b border-slate-800/60 bg-gradient-to-r from-blue-900/20 via-transparent to-amber-900/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">مدينة الإنتاج الإعلامي</h2>
              <p className="text-slate-400 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Media Hub Central & Intelligent Document Model
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard المدير العام
            </button>
            <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Left Side: Document Model */}
        <div className="space-y-8">
          <section className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-500/30 rounded-full"></div>
            <DocumentModel />
          </section>
        </div>

        {/* Right Side: Media Assets */}
        <div className="space-y-8">
          <section className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-amber-500/30 rounded-full"></div>
            <MediaAssets />
          </section>
        </div>
      </div>

      {/* Footer Integration Info */}
      <div className="px-8 py-4 bg-slate-900/80 border-t border-slate-800 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          B2B/B2C Portals Sync: Active
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          RH Gateways: Updated (Tunisian Labor Law 2024)
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          Gemini 1.5 Pro Analysis: Continuous
        </div>
      </div>
    </div>
  );
};

export default MediaHub;
