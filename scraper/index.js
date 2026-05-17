import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Load .env
try {
  const p = fileURLToPath(new URL('../.env', import.meta.url));
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

import { scrapeSourceAllKeywords, closeBrowser } from './playwright-engine.js';
import { forwardToN8N }                           from './pipeline.js';
import { runMetaAdsSpy }                          from './meta-ads-spy.js';

// Load config from repo
const configPath = fileURLToPath(new URL('../src/config/scraper_targets.json', import.meta.url));
const CONFIG     = JSON.parse(readFileSync(configPath, 'utf8'));

const KEYWORDS        = CONFIG.keywords;
const SOURCES         = CONFIG.sources;
const INTERVAL        = (CONFIG.schedule_interval_minutes ?? 60) * 60 * 1000;
const META_INTERVAL   = (CONFIG.meta_ads_interval_minutes  ?? 30) * 60 * 1000;

const N8N_ENDPOINT    = CONFIG.pipeline.n8n_endpoint;

let cycleCount    = 0;
let metaCycleCount = 0;

// ── Web scraper cycle (Playwright + RSS) ──────────────────────────────────────
async function runScraperCycle() {
  cycleCount++;
  console.log(`\n[scraper] ══ Cycle #${cycleCount} | ${new Date().toISOString()} ══`);

  const summary = [];

  for (const source of SOURCES) {
    console.log(`\n[scraper] ▶ ${source.name}`);
    try {
      const payload   = await scrapeSourceAllKeywords(source, KEYWORDS);
      const fwdResult = await forwardToN8N(payload);
      const forwarded = Array.isArray(fwdResult)
        ? fwdResult.filter(r => r.ok).reduce((s, r) => s + r.batch, 0)
        : 0;
      const n8nOk = Array.isArray(fwdResult) && fwdResult.some(r => r.ok);
      summary.push({ source: source.id, status: 'ok', scraped: payload.count, forwarded, n8n: n8nOk ? '✓' : '✗' });
      console.log(`[scraper]   ✓ ${payload.count} records → n8n: ${n8nOk ? 'ok' : 'not yet live'}`);
    } catch (err) {
      summary.push({ source: source.id, status: 'error', error: err.message });
      console.error(`[scraper]   ✗ ${source.id}: ${err.message}`);
    }
  }

  await closeBrowser();
  console.log(`\n[scraper] ══ Cycle #${cycleCount} complete ══`);
  console.table(summary);
}

// ── Meta Ads Library spy cycle ────────────────────────────────────────────────
async function runMetaCycle() {
  metaCycleCount++;
  const ts = new Date().toISOString();
  console.log(`\n[meta-spy] ══ Meta Cycle #${metaCycleCount} | ${ts} ══`);

  const metaToken   = process.env.META_ADS_ACCESS_TOKEN;
  const tgToken     = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat      = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const threshold   = Number(process.env.META_ADS_SCALING_THRESHOLD_DAYS) || 7;

  if (!metaToken) {
    console.warn('[meta-spy] META_ADS_ACCESS_TOKEN not set — skipping. Get token at developers.facebook.com → Graph API Explorer');
    return;
  }

  try {
    const result = await runMetaAdsSpy({
      keywords:      CONFIG.meta_ads_keywords,
      accessToken:   metaToken,
      thresholdDays: threshold,
      n8nEndpoint:   N8N_ENDPOINT,
      tgToken,
      tgChatId:      tgChat,
    });

    console.log(`[meta-spy] ✓ ${result.totalAds} ads | ${result.scalingAds} scaling | ${result.newScaling} new alerts | n8n: ${result.n8nStatus}`);
  } catch (err) {
    console.error(`[meta-spy] ✗ ${err.message}`);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', async () => { await closeBrowser(); process.exit(0); });
process.on('SIGINT',  async () => { await closeBrowser(); process.exit(0); });

// ── Start ─────────────────────────────────────────────────────────────────────
console.log(`[scraper] CINQD Intelligence Engine — v${CONFIG.version}`);
console.log(`[scraper] Web cycle: ${CONFIG.schedule_interval_minutes}min | Meta Ads cycle: ${CONFIG.meta_ads_interval_minutes ?? 30}min`);
console.log(`[scraper] Keywords: ${KEYWORDS.join(' | ')}`);
console.log(`[scraper] Meta keywords: ${(CONFIG.meta_ads_keywords ?? []).join(' | ')}`);

// Stagger: run scraper immediately, Meta Ads after 30s (avoids cold-start collision)
runScraperCycle();
setTimeout(() => {
  runMetaCycle();
  setInterval(runMetaCycle, META_INTERVAL);
}, 30_000);

setInterval(runScraperCycle, INTERVAL);
