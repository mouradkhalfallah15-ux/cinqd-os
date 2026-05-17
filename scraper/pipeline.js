// Forwards scraped payloads to n8n → Gemini classification → Firebase archive
const N8N_ENDPOINT = 'https://n8n.mkd-distrib.com/webhook/cinqd-ai-gate';
const BATCH_SIZE   = 50; // max records per POST to avoid oversized payloads

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function forwardToN8N(payload) {
  if (!payload?.records?.length) return { skipped: true };

  const batches  = chunk(payload.records, BATCH_SIZE);
  const results  = [];

  for (const batch of batches) {
    const body = {
      source:    payload.sourceId,
      category:  payload.category,
      scrapedAt: payload.scrapedAt,
      count:     batch.length,
      records:   batch,
      meta: {
        origin: payload.url,
        name:   payload.sourceName,
      },
    };

    try {
      const res = await fetch(N8N_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(30000),
      });
      results.push({ ok: res.ok, status: res.status, batch: batch.length });
    } catch (err) {
      results.push({ ok: false, error: err.message, batch: batch.length });
    }
  }

  return results;
}
