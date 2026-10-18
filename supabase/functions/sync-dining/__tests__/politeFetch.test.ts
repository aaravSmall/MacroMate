import { createPoliteFetcher, HttpError } from '../lib/politeFetch.ts';

function response(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createPoliteFetcher', () => {
  it('sends a User-Agent, runs requests one at a time, and waits between them', async () => {
    const order: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      order.push(String(url));
      expect((init?.headers as Record<string, string>)['User-Agent']).toBe('TestBot/1');
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return response(200, { url: String(url) });
    }) as unknown as typeof fetch;
    const sleeps: number[] = [];
    const http = createPoliteFetcher({
      userAgent: 'TestBot/1',
      delayMs: 50,
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    const results = await Promise.all(['a', 'b', 'c'].map((u) => http.getJson(u)));
    expect(results).toEqual([{ url: 'a' }, { url: 'b' }, { url: 'c' }]);
    expect(order).toEqual(['a', 'b', 'c']);
    expect(maxInFlight).toBe(1);
    expect(sleeps.length).toBeGreaterThanOrEqual(2); // paused before the 2nd and 3rd request
  });

  it('retries 429/5xx with exponential backoff', async () => {
    const statuses = [503, 429, 200];
    const fetchImpl = jest.fn(async () =>
      response(statuses.shift() ?? 200, { ok: true }),
    ) as unknown as typeof fetch;
    const sleeps: number[] = [];
    const http = createPoliteFetcher({
      userAgent: 'x',
      delayMs: 0,
      backoffMs: 100,
      fetchImpl,
      sleep: async (ms) => void sleeps.push(ms),
    });
    await expect(http.getJson('u')).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleeps.filter((ms) => ms >= 100)).toEqual([100, 200]);
  });

  it('gives up after the retries and does not retry 404', async () => {
    const failing = jest.fn(async () => response(500)) as unknown as typeof fetch;
    const http = createPoliteFetcher({
      userAgent: 'x',
      delayMs: 0,
      retries: 2,
      backoffMs: 1,
      fetchImpl: failing,
      sleep: async () => undefined,
    });
    await expect(http.getJson('u')).rejects.toBeInstanceOf(HttpError);
    expect(failing).toHaveBeenCalledTimes(3);

    const missing = jest.fn(async () => response(404)) as unknown as typeof fetch;
    const http404 = createPoliteFetcher({
      userAgent: 'x',
      delayMs: 0,
      fetchImpl: missing,
      sleep: async () => undefined,
    });
    await expect(http404.getJson('u')).rejects.toMatchObject({ status: 404 });
    expect(missing).toHaveBeenCalledTimes(1);
  });
});
