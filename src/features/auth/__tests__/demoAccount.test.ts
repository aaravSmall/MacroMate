import { DEMO_EMAIL, resolveLoginEmail } from '@/features/auth/demoAccount';

describe('resolveLoginEmail', () => {
  it('maps the demo username to the demo email', () => {
    expect(resolveLoginEmail('demo')).toBe(DEMO_EMAIL);
    expect(resolveLoginEmail('  Demo ')).toBe(DEMO_EMAIL);
  });

  it('passes other input through trimmed', () => {
    expect(resolveLoginEmail(' me@example.com ')).toBe('me@example.com');
    expect(resolveLoginEmail('demo2')).toBe('demo2');
  });
});
