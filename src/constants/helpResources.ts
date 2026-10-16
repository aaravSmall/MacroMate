/**
 * Help & resources shown on Account → Help and linked from every CareNotice.
 * TODO(release): verify every phone number, text code, and link before release, and re-check
 * them periodically. Services change numbers and hours.
 */

export type HelpResource = {
  id: string;
  name: string;
  description: string;
  /** Number to call, if any. */
  phone: string | null;
  /** Number to text, and the suggested message, if any. */
  text: { number: string; body: string } | null;
  url: string | null;
};

export const HELP_RESOURCES: readonly HelpResource[] = [
  {
    id: '988-lifeline',
    name: '988 Suicide & Crisis Lifeline',
    description:
      'Free, confidential support 24/7 for anyone in emotional distress or crisis. Call or text 988 (US).',
    phone: '988',
    text: { number: '988', body: '' },
    url: 'https://988lifeline.org',
  },
  {
    id: 'alliance-eating-disorders',
    name: 'National Alliance for Eating Disorders',
    description:
      'A helpline staffed by licensed therapists who can talk through concerns about eating, food, or body image and help you find care.',
    phone: '1-866-662-1235',
    text: null,
    url: 'https://www.allianceforeatingdisorders.com',
  },
  {
    id: 'crisis-text-line',
    name: 'Crisis Text Line',
    description: 'Text HOME to 741741 to reach a trained crisis counselor, 24/7 (US).',
    phone: null,
    text: { number: '741741', body: 'HOME' },
    url: 'https://www.crisistextline.org',
  },
  {
    id: 'your-doctor',
    name: 'Talk to your doctor',
    description:
      'Your doctor or a registered dietitian can help you choose a safe goal and pace, especially if you have a health condition, are pregnant, or are changing weight quickly.',
    phone: null,
    text: null,
    url: null,
  },
];
