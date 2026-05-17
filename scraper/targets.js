// ── Scraper Target Registry ───────────────────────────────────────────────────
// Each target defines a public data source to monitor.
// type: 'html' | 'rss' | 'json'
// delayMs: polite crawl delay between requests

export const TARGETS = [
  // ── Cleaning product pricing (Tunisian market) ────────────────────────────
  {
    id:       'jumia-tn-cleaning',
    name:     'Jumia TN — Produits Nettoyage',
    url:      'https://www.jumia.com.tn/produits-nettoyage/',
    type:     'html',
    delayMs:  4000,
    category: 'pricing',
    selectors: {
      items:  'article.prd',
      name:   '.name',
      price:  '.prc',
      rating: '.stars._s',
      link:   'a.core',
    },
  },
  {
    id:       'mytek-cleaning',
    name:     'MyTek TN — Produits Entretien',
    url:      'https://www.mytek.tn/entretien-et-menage.html',
    type:     'html',
    delayMs:  5000,
    category: 'pricing',
    selectors: {
      items:  '.product-item',
      name:   '.product-name a',
      price:  '.price',
      link:   '.product-name a',
    },
  },

  // ── Industry news (RSS) ───────────────────────────────────────────────────
  {
    id:       'rss-cleaning-news-fr',
    name:     'RSS — Actualités Chimie & Nettoyage',
    url:      'https://news.google.com/rss/search?q=produits+nettoyage+industrie+tunisie&hl=fr&gl=TN&ceid=TN:fr',
    type:     'rss',
    delayMs:  2000,
    category: 'news',
  },
  {
    id:       'rss-b2b-supply',
    name:     'RSS — B2B Chimie Détergents',
    url:      'https://news.google.com/rss/search?q=detergent+manufacturer+B2B+africa&hl=en&gl=US&ceid=US:en',
    type:     'rss',
    delayMs:  2000,
    category: 'news',
  },

  // ── Public tender / procurement ───────────────────────────────────────────
  {
    id:       'tuneps-tenders',
    name:     'TUNEPS — Appels d\'offres publics',
    url:      'https://www.tuneps.tn/app/appel-offres/liste-appels-offres-publics',
    type:     'html',
    delayMs:  6000,
    category: 'tender',
    selectors: {
      items: 'tr.odd, tr.even',
      name:  'td:nth-child(2)',
      date:  'td:nth-child(3)',
      org:   'td:nth-child(1)',
      link:  'a',
    },
  },

  // ── Public company info (Registre du Commerce export pages) ──────────────
  {
    id:       'kompass-tn-cleaning',
    name:     'Kompass — Entreprises Nettoyage TN',
    url:      'https://tn.kompass.com/a/produits-de-nettoyage/06020/',
    type:     'html',
    delayMs:  5000,
    category: 'b2b_directory',
    selectors: {
      items: '.companyCard',
      name:  '.companyCard__name',
      city:  '.companyCard__location',
      desc:  '.companyCard__activity',
      link:  'a.companyCard__link',
    },
  },
];

export const SCHEDULE_INTERVAL_MS = 30 * 60 * 1000; // 30 min between full cycles
