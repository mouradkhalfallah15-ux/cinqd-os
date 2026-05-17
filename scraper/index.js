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

import { TARGETS, SCHEDULE_INTERVAL_MS } from './targets.js';
import { scrapeTarget } from './engine.js';
import { forwardToN8N } from './pipeline.js';

let cycleCount = 0;

async function runCycle() {
  cycleCount++;
  console.log(`\n[scraper] ── Cycle #${cycleCount} started at ${new Date().toISOString()}`);

  const summary = [];

  for (const target of TARGETS) {
    console.log(`[scraper] → ${target.name}`);
    try {
      const payload = await scrapeTarget(target);
      if (!payload) {
        summary.push({ id: target.id, status: 'blocked_robots', count: 0 });
        continue;
      }

      const fwdResult = await forwardToN8N(payload);
      const totalFwd  = Array.isArray(fwdResult)
        ? fwdResult.filter(r => r.ok).reduce((s, r) => s + r.batch, 0)
        : 0;

      summary.push({ id: target.id, status: 'ok', scraped: payload.count, forwarded: totalFwd });
      console.log(`[scraper]   ✓ ${payload.count} records scraped, ${totalFwd} forwarded to n8n`);
    } catch (err) {
      summary.push({ id: target.id, status: 'error', error: err.message });
      console.error(`[scraper]   ✗ ${target.id}: ${err.message}`);
    }
  }

  console.log(`[scraper] ── Cycle #${cycleCount} complete`);
  console.table(summary);
  return summary;
}

// ── Start ─────────────────────────────────────────────────────────────────────
console.log(`[scraper] CINQD Scraper Engine starting`);
console.log(`[scraper] ${TARGETS.length} targets | cycle interval: ${SCHEDULE_INTERVAL_MS / 60000}min`);

runCycle(); // immediate first run

setInterval(runCycle, SCHEDULE_INTERVAL_MS);
