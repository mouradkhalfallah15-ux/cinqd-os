// Lightweight robots.txt checker — respects crawl rules before fetching
const cache = new Map(); // origin → {rules, ts}
const TTL = 60 * 60 * 1000; // 1h cache

function parseRobots(text, ua = '*') {
  const disallow = [];
  let active = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (/^User-agent:\s*\*/i.test(line) || new RegExp(`^User-agent:\\s*${ua}`, 'i').test(line)) {
      active = true;
    } else if (/^User-agent:/i.test(line)) {
      active = false;
    } else if (active && /^Disallow:/i.test(line)) {
      const path = line.replace(/^Disallow:\s*/i, '').trim();
      if (path) disallow.push(path);
    }
  }
  return disallow;
}

export async function isAllowed(url) {
  try {
    const u = new URL(url);
    const origin = u.origin;
    const now = Date.now();
    let entry = cache.get(origin);
    if (!entry || now - entry.ts > TTL) {
      const res = await fetch(`${origin}/robots.txt`, {
        headers: { 'User-Agent': 'CINQDBot/1.0 (+https://mkd-distrib.com)' },
        signal: AbortSignal.timeout(5000),
      });
      const text = res.ok ? await res.text() : '';
      entry = { rules: parseRobots(text), ts: now };
      cache.set(origin, entry);
    }
    const path = u.pathname + u.search;
    return !entry.rules.some(r => r !== '/' && path.startsWith(r));
  } catch {
    return true; // allow on network error
  }
}
