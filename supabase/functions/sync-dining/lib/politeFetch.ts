/**
 * Polite HTTP for third-party APIs: one request at a time, a pause between requests, a
 * descriptive User-Agent, and retries with exponential backoff on 429/5xx/network errors.
 * Pure apart from the injected fetch and sleep, so it's unit-tested.
 */

export type PoliteFetchOptions = {
  userAgent: string;
  /** Pause between requests, ms. */
  delayMs?: number;
  /** Retries after the first attempt. */
  retries?: number;
  /** First backoff, ms; doubles each retry. */
  backoffMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

export function createPoliteFetcher(options: PoliteFetchOptions) {
  const {
    userAgent,
    delayMs = 300,
    retries = 3,
    backoffMs = 1000,
    fetchImpl = fetch,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  } = options;
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequestAt = 0;
  let requests = 0;

  async function attempt(url: string): Promise<unknown> {
    for (let i = 0; ; i++) {
      const wait = lastRequestAt + delayMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();
      requests += 1;
      let status = 0;
      try {
        const response = await fetchImpl(url, {
          headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        });
        status = response.status;
        if (response.ok) return await response.json();
        if (status === 404) throw new HttpError(404, url);
        if (status !== 429 && status < 500) throw new HttpError(status, url);
      } catch (error) {
        if (error instanceof HttpError && error.status !== 429 && error.status < 500) throw error;
        if (i >= retries) throw error;
        await sleep(backoffMs * 2 ** i);
        continue;
      }
      if (i >= retries) throw new HttpError(status, url);
      await sleep(backoffMs * 2 ** i);
    }
  }

  return {
    /** GET JSON; requests run strictly one after another. */
    getJson(url: string): Promise<unknown> {
      const run = queue.then(() => attempt(url));
      queue = run.catch(() => undefined);
      return run;
    },
    get requestCount() {
      return requests;
    },
  };
}
