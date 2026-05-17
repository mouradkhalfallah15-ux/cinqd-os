import React from 'react';

const STYLES = {
  NO_COMMITMENT: 'bg-slate-700 text-slate-300 border-slate-600',
  SILVER:        'bg-gray-700/80 text-gray-200 border-gray-500 shadow-[0_0_8px_rgba(148,163,184,0.25)]',
  GOLD:          'bg-yellow-900/60 text-yellow-300 border-yellow-600 shadow-[0_0_8px_rgba(234,179,8,0.35)]',
  TITANIUM:      'bg-cyan-900/60 text-cyan-300 border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.35)]',
};

const LABELS = {
  NO_COMMITMENT: 'No-Commitment',
  SILVER: 'Silver',
  GOLD: 'Gold',
  TITANIUM: 'Titanium',
};

const TierBadge = ({ tier = 'NO_COMMITMENT', size = 'md' }) => (
  <span className={`inline-flex items-center font-bold border rounded-full ${
    size === 'lg' ? 'text-sm px-4 py-1.5' : 'text-xs px-2.5 py-0.5'
  } ${STYLES[tier] ?? STYLES.NO_COMMITMENT}`}>
    {LABELS[tier] ?? tier}
  </span>
);

export default TierBadge;
