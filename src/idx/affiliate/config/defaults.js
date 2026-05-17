// Tier defaults — live overrides stored in Firestore at idx_config/affiliate_tiers
export const DEFAULT_TIERS = {
  NO_COMMITMENT: {
    key: 'NO_COMMITMENT',
    label: 'No-Commitment',
    color: 'slate',
    cashbackPct: 0,
    commissionPct: 5,
    referralPct: 10,
    sponsoringFeePct: 0,
    penaltyPerFailedOrder: 0,
    minMonthlyOrders: 0,
  },
  SILVER: {
    key: 'SILVER',
    label: 'Silver',
    color: 'gray',
    cashbackPct: 10,
    commissionPct: 5,
    referralPct: 10,
    sponsoringFeePct: 10,
    penaltyPerFailedOrder: 20,
    minMonthlyOrders: 5,
  },
  GOLD: {
    key: 'GOLD',
    label: 'Gold',
    color: 'yellow',
    cashbackPct: 15,
    commissionPct: 10,
    referralPct: 10,
    sponsoringFeePct: 10,
    penaltyPerFailedOrder: 30,
    minMonthlyOrders: 15,
  },
  TITANIUM: {
    key: 'TITANIUM',
    label: 'Titanium',
    color: 'cyan',
    cashbackPct: 20,
    commissionPct: 15,
    referralPct: 10,
    sponsoringFeePct: 10,
    penaltyPerFailedOrder: 50,
    minMonthlyOrders: 30,
  },
};

export const TIER_KEYS = ['NO_COMMITMENT', 'SILVER', 'GOLD', 'TITANIUM'];
export const CHURN_INACTIVE_MONTHS = 2;
export const POINT_TO_TND_RATE = 0.1;  // 1 point = 0.1 TND
export const REFERRAL_PCT = 10;
export const SPONSORING_FEE_PCT = 10;
