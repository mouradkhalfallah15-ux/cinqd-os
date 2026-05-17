import * as cheerio from 'cheerio';
import { isAllowed } from './robots.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Fetch with retry & rate-limit headers ─────────────────────────────────────
async function fetchPage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':      UA,
          'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-TN,fr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control':   'no-cache',
          'DNT':             '1',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(2000 * (i + 1)); // exponential backoff
    }
  }
}

// ── HTML scraper ──────────────────────────────────────────────────────────────
function scrapeHtml(html, selectors) {
  const $ = cheerio.load(html);
  const results = [];
  $(selectors.items).each((_, el) => {
    const item = {};
    for (const [key, sel] of Object.entries(selectors)) {
      if (key === 'items') continue;
      const node = $(el).find(sel).first();
      item[key] = key === 'link'
        ? (node.attr('href') || '').trim()
        : node.text().trim();
    }
    if (Object.values(item).some(v => v)) results.push(item);
  });
  return results;
}

// ── RSS parser ────────────────────────────────────────────────────────────────
function parseRss(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];
  $('item').each((_, el) => {
    items.push({
      title:       $('title', el).text().trim(),
      link:        $('link', el).text().trim() || $('link', el).attr('href') || '',
      description: $('description', el).text().replace(/<[^>]+>/g, '').trim().slice(0, 300),
      pubDate:     $('pubDate', el).text().trim(),
      source:      $('source', el).text().trim() || '',
    });
  });
  return items.slice(0, 20); // cap at 20 latest items
}

// ── Main scrape function ──────────────────────────────────────────────────────
export async function scrapeTarget(target) {
  const allowed = await isAllowed(target.url);
  if (!allowed) {
    console.log(`[scraper] robots.txt disallows ${target.url} — skipping`);
    return null;
  }

  await sleep(target.delayMs ?? 3000);

  const html = await fetchPage(target.url);
  let records;

  if (target.type === 'rss') {
    records = parseRss(html);
  } else {
    records = scrapeHtml(html, target.selectors ?? {});
  }

  return {
    sourceId:   target.id,
    sourceName: target.name,
    category:   target.category,
    url:        target.url,
    scrapedAt:  new Date().toISOString(),
    count:      records.length,
    records,
  };
}
