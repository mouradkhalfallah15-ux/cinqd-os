import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { isAllowed } from './robots.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Browser singleton with crash recovery ────────────────────────────────────
let _browser = null;

async function getBrowser() {
  if (_browser?.isConnected()) return _browser;
  _browser = null; // discard stale handle
  _browser = await chromium.launch({
    headless:  true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--disable-extensions',
      '--mute-audio',
    ],
  });
  _browser.on('disconnected', () => { _browser = null; });
  return _browser;
}

export async function closeBrowser() {
  if (_browser) { try { await _browser.close(); } catch {} _browser = null; }
}

// ── Single keyword scrape via Playwright ─────────────────────────────────────
async function scrapeKeyword(source, keyword, config) {
  // simple keyword strips special chars for sites that can't handle them (e.g. Tayara Next.js)
  const simpleKw = keyword.replace(/[%+&]/g, ' ').trim();
  const url = source.base_url
    .replace('{keyword}',        encodeURIComponent(keyword))
    .replace('{keyword_simple}', encodeURIComponent(simpleKw));
  const sels = source.selectors ?? {};

  const allowed = await isAllowed(url);
  if (!allowed) return [];

  await sleep(source.delay_ms ?? 4000);

  const browser = await getBrowser();
  const ctx     = await browser.newContext({
    userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale:     'fr-TN',
    viewport:   { width: 1280, height: 800 },
    extraHTTPHeaders: { 'Accept-Language': 'fr-TN,fr;q=0.9,en;q=0.8' },
  });

  const page = await ctx.newPage();

  // Suppress page console noise
  page.on('console', () => {});
  page.on('pageerror', () => {});

  // Block media + analytics to speed up loading
  await page.route('**/*.{png,jpg,jpeg,gif,webp,mp4,woff,woff2,svg,ico}', r => r.abort());
  await page.route('**/{gtm,gtag,analytics,hotjar,pixel,fbevents}*', r => r.abort());

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000); // let JS render

    const html    = await page.content();
    const $       = cheerio.load(html);
    const records = [];
    const max     = source.max_results_per_keyword ?? 20;

    $(sels.items || 'article').each((_, el) => {
      if (records.length >= max) return false;
      const item = { keyword, sourceUrl: url };
      for (const [key, sel] of Object.entries(sels)) {
        if (key === 'items') continue;
        const node = $(el).find(sel).first();
        item[key] = key === 'link'
          ? (node.attr('href') || '').trim()
          : node.text().replace(/\s+/g, ' ').trim();
      }
      if (item.title || item.name) records.push(item);
    });

    return records;
  } catch (err) {
    console.error(`[playwright] ${source.id} / "${keyword}": ${err.message}`);
    return [];
  } finally {
    await ctx.close();
  }
}

// ── RSS fetch (no browser needed) ────────────────────────────────────────────
async function scrapeRssKeyword(source, keyword) {
  const simpleKw = keyword.replace(/[%+&]/g, ' ').trim();
  const url = source.base_url
    .replace('{keyword}',        encodeURIComponent(keyword))
    .replace('{keyword_simple}', encodeURIComponent(simpleKw));
  try {
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'CINQDBot/1.0 (+https://mkd-distrib.com)' },
      signal:  AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml  = await res.text();
    const $    = cheerio.load(xml, { xmlMode: true });
    const items = [];
    const max   = source.max_results_per_keyword ?? 10;
    $('item').each((_, el) => {
      if (items.length >= max) return false;
      items.push({
        keyword,
        title:   $('title', el).text().trim(),
        link:    $('link', el).text().trim(),
        summary: $('description', el).text().replace(/<[^>]+>/g, '').trim().slice(0, 280),
        pubDate: $('pubDate', el).text().trim(),
      });
    });
    return items;
  } catch {
    return [];
  }
}

// ── Main: scrape one source across all keywords ───────────────────────────────
export async function scrapeSourceAllKeywords(source, keywords) {
  const allRecords = [];

  for (const keyword of keywords) {
    console.log(`[playwright] ${source.id} ← "${keyword}"`);
    const records = source.type === 'rss'
      ? await scrapeRssKeyword(source, keyword)
      : await scrapeKeyword(source, keyword, source);

    allRecords.push(...records);

    // inter-keyword polite delay
    if (keywords.indexOf(keyword) < keywords.length - 1) {
      await sleep(source.delay_ms ?? 4000);
    }
  }

  return {
    sourceId:   source.id,
    sourceName: source.name,
    category:   source.category,
    scrapedAt:  new Date().toISOString(),
    count:      allRecords.length,
    records:    allRecords,
  };
}
