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
import { forwardToN8N } from './pipeline.js';

// Load config from repo
const configPath = fileURLToPath(new URL('../src/config/scraper_targets.json', import.meta.url));
const CONFIG     = JSON.parse(readFileSync(configPath, 'utf8'));

const KEYWORDS   = CONFIG.keywords;
const SOURCES    = CONFIG.sources;
const INTERVAL   = (CONFIG.schedule_interval_minutes ?? 60) * 60 * 1000;

let cycleCount = 0;

async function runCycle() {
  cycleCount++;
  const ts = new Date().toISOString();
  console.log(`\n[scraper] ══ Cycle #${cycleCount} | ${ts} ══`);
  console.log(`[scraper] ${SOURCES.length} sources × ${KEYWORDS.length} keywords`);

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

      summary.push({
        source:    source.id,
        status:    'ok',
        scraped:   payload.count,
        forwarded,
        n8n:       n8nOk ? '✓' : '✗',
      });
      console.log(`[scraper]   ✓ ${payload.count} records → n8n: ${n8nOk ? 'ok' : 'not yet live'}`);
    } catch (err) {
      summary.push({ source: source.id, status: 'error', error: err.message });
      console.error(`[scraper]   ✗ ${source.id}: ${err.message}`);
    }
  }

  await closeBrowser(); // release Chromium after each cycle

  console.log(`\n[scraper] ══ Cycle #${cycleCount} complete ══`);
  console.table(summary);
}

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => { await closeBrowser(); process.exit(0); });
process.on('SIGINT',  async () => { await closeBrowser(); process.exit(0); });

// ── Start ────────────────────────────────────────────────────────────────────
console.log(`[scraper] CINQD Playwright Scraper Engine — v${CONFIG.version}`);
console.log(`[scraper] Keywords: ${KEYWORDS.join(' | ')}`);
console.log(`[scraper] Interval: ${CONFIG.schedule_interval_minutes}min`);

runCycle();
setInterval(runCycle, INTERVAL);
