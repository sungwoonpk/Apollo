import { describe, expect, it } from 'vitest';
import { createDemoFetch } from './demoFetch';

const f = createDemoFetch(() => new Date('2026-11-08T12:00:00Z'));

describe('demo transport', () => {
  it('serves a five day forecast', async () => {
    const res = await f('https://api.open-meteo.com/v1/forecast?latitude=1&longitude=2');
    const body = (await res.json()) as { daily: { time: string[] } };
    expect(body.daily.time).toHaveLength(5);
    expect(body.daily.time[0]).toBe('2026-11-08');
  });

  it('serves feeds that name their items', async () => {
    const xml = await (await f('https://hnrss.org/frontpage')).text();
    expect(xml).toContain('<item>');
    expect(xml).toContain('demo.invalid');
  });

  it('refuses everything else', async () => {
    expect((await f('https://example.com/')).status).toBe(503);
  });
});
