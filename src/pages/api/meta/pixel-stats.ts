import type { APIRoute } from 'astro';

const PIXEL_ID    = process.env.META_PIXEL_ID;
const META_TOKEN  = process.env.META_PIXEL_ACCESS_TOKEN;
const GRAPH_BASE  = 'https://graph.facebook.com/v19.0';

export const GET: APIRoute = async () => {
  if (!PIXEL_ID || !META_TOKEN) {
    return json({ error: 'Meta credentials not configured.' }, 500);
  }

  const now      = Math.floor(Date.now() / 1000);
  const dayStart = now - 86400;

  try {
    const [eventsRes, pixelRes] = await Promise.all([
      fetch(
        `${GRAPH_BASE}/${PIXEL_ID}/events` +
        `?fields=event_name,event_time,match_keys,data_processing_options` +
        `&since=${dayStart}&until=${now}` +
        `&limit=50` +
        `&access_token=${META_TOKEN}`
      ),
      fetch(
        `${GRAPH_BASE}/${PIXEL_ID}` +
        `?fields=name,last_fired_time,is_unavailable,owner_business,creation_time` +
        `&access_token=${META_TOKEN}`
      ),
    ]);

    const eventsData = await eventsRes.json();
    const pixelData  = await pixelRes.json();

    // Count events by name
    const events: Record<string, number> = {};
    const recent: Array<{ name: string; time: number }> = [];

    if (Array.isArray(eventsData.data)) {
      for (const ev of eventsData.data) {
        events[ev.event_name] = (events[ev.event_name] || 0) + 1;
        recent.push({ name: ev.event_name, time: ev.event_time });
      }
    }

    recent.sort((a, b) => b.time - a.time);

    return json({
      pixel: {
        id:           PIXEL_ID,
        name:         pixelData.name        ?? 'CINQD Pixel',
        lastFired:    pixelData.last_fired_time ?? null,
        unavailable:  pixelData.is_unavailable  ?? false,
      },
      summary: {
        totalEvents:   Object.values(events).reduce((s, n) => s + n, 0),
        eventBreakdown: events,
      },
      recent: recent.slice(0, 10),
    });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
};

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
