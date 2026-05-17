/**
 * CINQD Meta Ads Library Spy Engine
 * Uses the official Meta Ads Library API (graph.facebook.com/ads_archive)
 * — 100% public API, no authentication bypass, data is intentionally public
 * Docs: https://developers.facebook.com/docs/marketing-api/reference/ads_archive
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath }                            from 'url';

const API_VER  = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VER}/ads_archive`;

const SEEN_FILE = fileURLToPath(new URL('./.meta-ads-seen.json', import.meta.url));

// ── Persist seen ad IDs across restarts ──────────────────────────────────────
function loadSeen() {
  try { return new Set(JSON.parse(readFileSync(SEEN_FILE, 'utf8'))); } catch { return new Set(); }
}
function saveSeen(set) {
  try { writeFileSync(SEEN_FILE, JSON.stringify([...set].slice(-5000))); } catch {} // keep last 5k
}

// ── Telegram notification ─────────────────────────────────────────────────────
async function tgNotify(token, chatId, text) {
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── Scaling ad detection ──────────────────────────────────────────────────────
function isScaling(ad, thresholdDays = 7) {
  if (!ad.ad_delivery_start_time) return false;
  const start   = new Date(ad.ad_delivery_start_time);
  const ageDays = (Date.now() - start.getTime()) / 86_400_000;
  return ageDays >= thresholdDays;
}

function formatScalingAlert(ad) {
  const start    = ad.ad_delivery_start_time ? new Date(ad.ad_delivery_start_time) : null;
  const ageDays  = start ? Math.floor((Date.now() - start.getTime()) / 86_400_000) : '?';
  const spend    = ad.spend ? `${ad.spend.lower_bound}–${ad.spend.upper_bound} ${ad.currency ?? ''}` : 'N/A';
  const impr     = ad.impressions ? `${ad.impressions.lower_bound}–${ad.impressions.upper_bound}` : 'N/A';
  const bodyText = (ad.ad_creative_bodies ?? [])[0]?.slice(0, 200) || '—';
  const link     = ad.ad_snapshot_url || '';
  const platform = (ad.publisher_platforms ?? []).join(', ') || 'FB/IG';

  return (
    `🚨 *Scaling Ad Détecté — CINQD Spy Engine*\n` +
    `\n*Page:* ${ad.page_name ?? '?'} (ID: ${ad.page_id ?? '?'})` +
    `\n*Durée:* ${ageDays} jours actif` +
    `\n*Plateformes:* ${platform}` +
    `\n*Impressions:* ${impr}` +
    `\n*Dépense estimée:* ${spend}` +
    `\n*Texte:* _${bodyText.replace(/[_*`[\]()~>#+=|{}.!-]/g, '\\$&')}_` +
    (link ? `\n*Créatif:* [Voir l'annonce](${link})` : '')
  );
}

// ── API fetch (handles pagination) ───────────────────────────────────────────
async function fetchAdsPage(params) {
  const url = new URL(BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchAllAds(keyword, accessToken, thresholdDays, maxPages = 3) {
  const fields = [
    'id',
    'page_id',
    'page_name',
    'ad_creative_bodies',
    'ad_creative_link_captions',
    'ad_creative_link_descriptions',
    'ad_creative_link_titles',
    'ad_delivery_start_time',
    'ad_delivery_stop_time',
    'ad_snapshot_url',
    'bylines',
    'currency',
    'demographic_distribution',
    'estimated_audience_size',
    'impressions',
    'languages',
    'publisher_platforms',
    'spend',
    'target_locations',
    'target_ages',
    'target_gender',
  ].join(',');

  const params = {
    search_terms:         keyword,
    ad_reached_countries: '["TN"]',
    ad_active_status:     'ACTIVE',
    fields,
    limit:                50,
    access_token:         accessToken,
  };

  const allAds = [];
  let page = 0;
  let nextCursor = null;

  do {
    const payload = nextCursor
      ? await fetchAdsPage({ ...params, after: nextCursor })
      : await fetchAdsPage(params);

    allAds.push(...(payload.data ?? []));
    nextCursor = payload.paging?.cursors?.after ?? null;
    page++;

    if (nextCursor && page < maxPages) await new Promise(r => setTimeout(r, 1000));
  } while (nextCursor && page < maxPages);

  return allAds;
}

// ── Main spy function ─────────────────────────────────────────────────────────
export async function runMetaAdsSpy({
  keywords,
  accessToken,
  thresholdDays = 7,
  n8nEndpoint,
  tgToken,
  tgChatId,
}) {
  if (!accessToken) throw new Error('META_ADS_ACCESS_TOKEN not set — get one at developers.facebook.com');

  const seen        = loadSeen();
  const allResults  = [];
  const newScaling  = [];
  let   totalFetched = 0;

  for (const keyword of keywords) {
    console.log(`[meta-spy] searching: "${keyword}" | Tunisia | ACTIVE`);
    try {
      const ads = await fetchAllAds(keyword, accessToken, thresholdDays);
      totalFetched += ads.length;

      for (const ad of ads) {
        const scaling = isScaling(ad, thresholdDays);

        const record = {
          id:         ad.id,
          keyword,
          page_id:    ad.page_id,
          page_name:  ad.page_name,
          platforms:  ad.publisher_platforms ?? [],
          languages:  ad.languages ?? [],
          start_date: ad.ad_delivery_start_time,
          age_days:   ad.ad_delivery_start_time
            ? Math.floor((Date.now() - new Date(ad.ad_delivery_start_time).getTime()) / 86_400_000)
            : null,
          scaling,
          spend:      ad.spend      ?? null,
          impressions:ad.impressions ?? null,
          estimated_audience: ad.estimated_audience_size ?? null,
          creative: {
            body:        (ad.ad_creative_bodies            ?? [])[0] ?? null,
            title:       (ad.ad_creative_link_titles       ?? [])[0] ?? null,
            description: (ad.ad_creative_link_descriptions ?? [])[0] ?? null,
            caption:     (ad.ad_creative_link_captions     ?? [])[0] ?? null,
            snapshot_url: ad.ad_snapshot_url ?? null,
          },
          targeting: {
            locations: ad.target_locations ?? [],
            ages:      ad.target_ages      ?? [],
            gender:    ad.target_gender    ?? null,
            demographics: ad.demographic_distribution ?? [],
          },
          bylines:    ad.bylines ?? [],
        };

        allResults.push(record);

        // New scaling ad — notify
        if (scaling && !seen.has(ad.id)) {
          newScaling.push(record);
          seen.add(ad.id);
          if (tgToken && tgChatId) {
            await tgNotify(tgToken, tgChatId, formatScalingAlert(ad));
          }
        } else {
          seen.add(ad.id);
        }
      }

      await new Promise(r => setTimeout(r, 1500)); // rate-limit between keywords
    } catch (err) {
      console.error(`[meta-spy] keyword "${keyword}": ${err.message}`);
    }
  }

  saveSeen(seen);

  // ── Forward to n8n ──────────────────────────────────────────────────────────
  let n8nStatus = 'skipped';
  if (n8nEndpoint && allResults.length) {
    try {
      const res = await fetch(n8nEndpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source:      'meta_ads_library',
          scrapedAt:   new Date().toISOString(),
          country:     'TN',
          totalAds:    allResults.length,
          scalingAds:  allResults.filter(r => r.scaling).length,
          newScaling:  newScaling.length,
          records:     allResults,
        }),
        signal: AbortSignal.timeout(30000),
      });
      n8nStatus = res.ok ? 'ok' : `HTTP ${res.status}`;
    } catch (err) {
      n8nStatus = err.message;
    }
  }

  return {
    keywords:    keywords.length,
    totalFetched,
    totalAds:    allResults.length,
    scalingAds:  allResults.filter(r => r.scaling).length,
    newScaling:  newScaling.length,
    n8nStatus,
  };
}
