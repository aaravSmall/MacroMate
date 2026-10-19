import { isLocalUrl } from '@/lib/env';

describe('isLocalUrl', () => {
  it('flags local and LAN addresses a release build must not use', () => {
    for (const url of [
      'http://127.0.0.1:54321',
      'http://localhost:54321',
      'http://192.168.1.20:54321',
      'http://10.0.2.2:54321',
      'http://172.20.0.5:54321',
    ]) {
      expect(isLocalUrl(url)).toBe(true);
    }
  });

  it('allows hosted Supabase URLs', () => {
    expect(isLocalUrl('https://abcdefghijklmnopqrst.supabase.co')).toBe(false);
    expect(isLocalUrl('https://172.example.com')).toBe(false);
  });
});
