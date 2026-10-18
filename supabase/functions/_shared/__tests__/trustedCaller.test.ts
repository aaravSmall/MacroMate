import { isTrustedCaller, safeEqual } from '../auth';

const req = (headers: Record<string, string>) =>
  new Request('https://x.test/functions/v1/sync-dining', { method: 'POST', headers });
const opts = { serviceKeys: ['sb_secret_abc123', 'legacy.jwt.key'], cronSecret: 'cron-secret-xyz' };

describe('isTrustedCaller', () => {
  it('accepts the cron secret or a service key (apikey or bearer)', () => {
    expect(isTrustedCaller(req({ 'x-cron-secret': 'cron-secret-xyz' }), opts)).toBe(true);
    expect(isTrustedCaller(req({ apikey: 'sb_secret_abc123' }), opts)).toBe(true);
    expect(isTrustedCaller(req({ Authorization: 'Bearer legacy.jwt.key' }), opts)).toBe(true);
  });

  it('rejects users, publishable keys, wrong secrets, and nothing', () => {
    expect(isTrustedCaller(req({}), opts)).toBe(false);
    expect(isTrustedCaller(req({ 'x-cron-secret': 'cron-secret-xy' }), opts)).toBe(false);
    expect(isTrustedCaller(req({ apikey: 'sb_publishable_123' }), opts)).toBe(false);
    expect(isTrustedCaller(req({ Authorization: 'Bearer user.session.jwt' }), opts)).toBe(false);
    expect(
      isTrustedCaller(req({ 'x-cron-secret': 'anything' }), { ...opts, cronSecret: null }),
    ).toBe(false);
    expect(isTrustedCaller(req({ apikey: '' }), { serviceKeys: [''], cronSecret: null })).toBe(
      false,
    );
  });

  it('compares in constant time', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
