/**
 * Demo-mode transport (APOLLO_DEMO=1, dev builds only). It stands in for
 * net.fetch so weather and news fill in with made-up data and nothing leaves
 * the computer. The real parsing and rendering code still runs on these
 * responses. Any other URL answers 503, which the callers already handle.
 */
export function createDemoFetch(now: () => Date = () => new Date()): typeof fetch {
  return async (input) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname === 'api.open-meteo.com') return json(forecast(now()));
    if (url.hostname === 'geocoding-api.open-meteo.com') {
      return json({ results: [{ name: 'San Francisco', admin1: 'California', latitude: 37.77, longitude: -122.42 }] });
    }
    const feed = FEEDS[url.hostname];
    if (feed) return new Response(rss(feed.title, feed.items, now()), { status: 200, headers: { 'content-type': 'application/rss+xml' } });
    return new Response('demo mode: no network', { status: 503 });
  };
}

const json = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

function forecast(now: Date): unknown {
  const days = Array.from({ length: 5 }, (_, i) => new Date(now.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  return {
    current: { temperature_2m: 61, apparent_temperature: 59, weather_code: 2, wind_speed_10m: 9, precipitation_probability: 10 },
    daily: {
      time: days,
      temperature_2m_max: [63, 65, 60, 58, 62],
      temperature_2m_min: [51, 52, 49, 47, 50],
      weather_code: [2, 1, 61, 3, 0],
      precipitation_probability_max: [10, 5, 60, 30, 0],
    },
  };
}

interface DemoItem { title: string; snippet: string }
const FEEDS: Record<string, { title: string; items: DemoItem[] }> = {
  'feeds.apnews.com': {
    title: 'Demo Wire',
    items: [
      { title: 'City council approves new bike lanes downtown', snippet: 'The plan adds eleven miles of protected lanes over two years.' },
      { title: 'Regional rail service to add weekend trains', snippet: 'Riders can expect trains every thirty minutes starting in spring.' },
    ],
  },
  'feeds.bbci.co.uk': {
    title: 'Demo World',
    items: [
      { title: 'Scientists map a deep-sea ridge in record detail', snippet: 'A month-long survey produced the first full picture of the ridge.' },
      { title: 'Harvest festival draws record crowds', snippet: 'Organisers say attendance doubled compared with last year.' },
    ],
  },
  'www.theverge.com': {
    title: 'Demo Tech',
    items: [
      { title: 'A small team ships an open-source note-taking app', snippet: 'The app keeps everything on the device and syncs nothing.' },
      { title: 'New laptop chips promise a full day of battery', snippet: 'Early reviews point to longer battery life at the same speed.' },
    ],
  },
  'hnrss.org': {
    title: 'Demo Hacker Feed',
    items: [
      { title: 'Show: a desktop assistant that runs offline', snippet: 'Local-first design, SQLite storage, no account needed.' },
      { title: 'Why small tools tend to outlive big platforms', snippet: 'An essay on maintenance, scope and boring technology.' },
    ],
  },
};

function rss(title: string, items: DemoItem[], now: Date): string {
  const body = items
    .map((it, i) => {
      const when = new Date(now.getTime() - (i + 1) * 3_600_000).toUTCString();
      const slug = it.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      return `<item><title>${esc(it.title)}</title><link>https://demo.invalid/${slug}</link><description>${esc(it.snippet)}</description><pubDate>${when}</pubDate></item>`;
    })
    .join('');
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>${esc(title)}</title>${body}</channel></rss>`;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
