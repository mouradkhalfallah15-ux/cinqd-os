// Central webhook registry for the CINQD automation network
const BASE_APP = 'https://app.mkd-distrib.com';
const BASE_N8N = 'https://n8n.mkd-distrib.com';

export const WEBHOOKS = {
  telegram: {
    webhook:      `${BASE_APP}/tg/webhook`,
    factoryAlert: `${BASE_APP}/tg/factory-alert`,
    health:       `${BASE_APP}/tg/health`,
  },
  n8n: {
    base:         BASE_N8N,
    aiExecutive:  import.meta.env.PUBLIC_N8N_AI_WEBHOOK || '',
    // Register custom n8n flows at: https://n8n.mkd-distrib.com/workflow
  },
  internal: {
    orderApi:     `${BASE_APP}/api/order`,
  },
};

export const DOMAINS = {
  landing: 'https://mkd-distrib.com',
  app:     BASE_APP,
  erp:     'https://erp.mkd-distrib.com',
  n8n:     BASE_N8N,
};
