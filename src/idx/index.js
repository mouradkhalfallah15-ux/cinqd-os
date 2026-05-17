// ─── CINQD IDX Root Gateway ───────────────────────────────────────────────────
// Central import point for all idx modules.
// All dashboard-level components are wrapped with withAuth() here so that
// the authentication gate is enforced at the gateway — not scattered across
// individual component files.

import { withAuth } from './auth/withAuth.jsx';

// ── Raw dashboard components ──────────────────────────────────────────────────
import AffiliateDashboardBase    from './affiliate/components/AffiliateDashboard.jsx';
import FranchiseHubBase          from './franchise/components/FranchiseHub.jsx';
import B2BPortalBase             from './b2b/components/B2BPortal.jsx';
import AffiliateAdminConfigBase  from './admin/components/AffiliateAdminConfig.jsx';

// ── Auth-protected gateway exports (dashboards) ───────────────────────────────
export const AffiliateDashboard   = withAuth(AffiliateDashboardBase);
export const FranchiseHub         = withAuth(FranchiseHubBase);
export const B2BPortal            = withAuth(B2BPortalBase);
export const AffiliateAdminConfig = withAuth(AffiliateAdminConfigBase);

// ── Shared UI components (no auth required) ───────────────────────────────────
export { default as TierBadge      } from './affiliate/components/TierBadge.jsx';
export { default as WalletPanel    } from './affiliate/components/WalletPanel.jsx';
export { default as StockManager   } from './affiliate/components/StockManager.jsx';
export { default as CustomerList   } from './affiliate/components/CustomerList.jsx';
export { default as OrderOutbound  } from './affiliate/components/OrderOutbound.jsx';
export { default as OrderInbound   } from './affiliate/components/OrderInbound.jsx';
export { default as ReferralPanel  } from './affiliate/components/ReferralPanel.jsx';
export { default as PenaltyLog     } from './affiliate/components/PenaltyLog.jsx';
export { default as PointsTracker  } from './affiliate/components/PointsTracker.jsx';
export { default as AffiliateChat  } from './affiliate/components/AffiliateChat.jsx';
export { default as POSProfile          } from './franchise/components/POSProfile.jsx';
export { default as MicroFactoryProfile } from './franchise/components/MicroFactoryProfile.jsx';
export { default as ContractManager     } from './b2b/components/ContractManager.jsx';
export { default as EnterpriseTerms     } from './b2b/components/EnterpriseTerms.jsx';

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useAffiliate } from './affiliate/hooks/useAffiliate.js';
export { useWallet    } from './affiliate/hooks/useWallet.js';
export { useOrders    } from './affiliate/hooks/useOrders.js';

// ── Config constants ──────────────────────────────────────────────────────────
export {
  DEFAULT_TIERS,
  TIER_KEYS,
  CHURN_INACTIVE_MONTHS,
  POINT_TO_TND_RATE,
  REFERRAL_PCT,
  SPONSORING_FEE_PCT,
} from './affiliate/config/defaults.js';
