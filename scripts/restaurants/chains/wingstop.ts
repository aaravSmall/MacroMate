import type { ChainConfig } from '../lib/normalize';

const WING_MULTIPLES = [
  { label: '6 pc', multiplier: 6 },
  { label: '8 pc', multiplier: 8 },
  { label: '10 pc', multiplier: 10 },
  { label: '15 pc', multiplier: 15 },
];

/** Wingstop's nutrition guide lists every flavor per piece, for classic and boneless wings. */
export const wingstop: ChainConfig = {
  id: 'wingstop',
  name: 'Wingstop',
  source: {
    url: 'https://s3.amazonaws.com/wingstop.com/assets/static/WSR18-0009-Corporate-NutritionalGuide-JumboWings-HR_OFFICAL.pdf',
    note: 'Official guide on Wingstop’s asset host, linked from wingstop.com. The file name suggests 2018 (WSR18); check wingstop.com/nutrition for a newer guide before uploading.',
  },
  sections: [
    { match: /classic/i, noun: 'Classic Wings', each: 'wing', multiples: WING_MULTIPLES },
    { match: /boneless/i, noun: 'Boneless Wings', each: 'wing', multiples: WING_MULTIPLES },
    { match: /tenders/i, noun: 'Tender', each: 'tender' },
    { match: /sandwich/i, noun: 'Chicken Sandwich', each: 'sandwich' },
  ],
};
