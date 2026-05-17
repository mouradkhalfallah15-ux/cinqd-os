// Affiliate module gateway — import everything from here
export { default as AffiliateDashboard } from './components/AffiliateDashboard.jsx';
export { default as TierBadge          } from './components/TierBadge.jsx';
export { default as WalletPanel        } from './components/WalletPanel.jsx';
export { default as StockManager       } from './components/StockManager.jsx';
export { default as CustomerList       } from './components/CustomerList.jsx';
export { default as OrderOutbound      } from './components/OrderOutbound.jsx';
export { default as OrderInbound       } from './components/OrderInbound.jsx';
export { default as ReferralPanel      } from './components/ReferralPanel.jsx';
export { default as PenaltyLog         } from './components/PenaltyLog.jsx';
export { default as PointsTracker      } from './components/PointsTracker.jsx';
export { default as AffiliateChat      } from './components/AffiliateChat.jsx';

export { useAffiliate } from './hooks/useAffiliate.js';
export { useWallet    } from './hooks/useWallet.js';
export { useOrders    } from './hooks/useOrders.js';

export {
  DEFAULT_TIERS,
  TIER_KEYS,
  CHURN_INACTIVE_MONTHS,
  POINT_TO_TND_RATE,
  REFERRAL_PCT,
  SPONSORING_FEE_PCT,
} from './config/defaults.js';
