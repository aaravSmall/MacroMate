import { HELP_RESOURCES } from '@/constants/helpResources';

describe('HELP_RESOURCES', () => {
  it('includes the required resources', () => {
    expect(HELP_RESOURCES.map((r) => r.id)).toEqual([
      '988-lifeline',
      'alliance-eating-disorders',
      'crisis-text-line',
      'your-doctor',
    ]);
  });

  it('uses https links', () => {
    for (const resource of HELP_RESOURCES) {
      if (resource.url) expect(resource.url).toMatch(/^https:\/\//);
    }
  });
});
