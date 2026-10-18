/**
 * Visual portion references for estimating amounts without a scale. They're rough guides, not
 * measurements: hands and plates vary.
 *
 * Sources:
 * - NIH NHLBI, "Serving Size Card" (We Can! program): 3 oz meat ≈ a deck of cards; 1½ oz cheese ≈
 *   3 dice (so 1 oz ≈ 2 dice); 1 cup ≈ a baseball; ½ cup ≈ half a baseball; 2 tbsp ≈ a ping-pong ball.
 *   https://www.nhlbi.nih.gov/health/educational/wecan/downloads/servingcard7.pdf
 * - Academy of Nutrition and Dietetics, "Serving Sizes vs. Portions" (eatright.org): palm ≈ 3–4 oz
 *   meat; fist ≈ 1 cup; whole thumb ≈ 1 tbsp; thumb tip ≈ 1 tsp; cupped hand ≈ 1–2 oz nuts.
 * - USDA MyPlate (myplate.gov): plate model using a ~9–10 inch plate; a quarter of the plate holds
 *   about 1 cup of grains or protein foods, half the plate about 2 cups of vegetables.
 */
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type PortionGuide = {
  id: string;
  /** What it looks like. */
  label: string;
  /** The amount it stands for, shown next to the label. */
  amountText: string;
  icon: IconName;
  measure: { kind: 'weight'; grams: number } | { kind: 'volume'; ml: number };
  group: 'weight' | 'volume' | 'plate';
};

const OZ = 28.35;
const CUP = 240;
const TBSP = 15;
const TSP = 5;

export const PORTION_GUIDES: readonly PortionGuide[] = [
  // Weight
  {
    id: 'deck-of-cards',
    label: 'Deck of cards',
    amountText: '≈ 3 oz meat or fish',
    icon: 'albums-outline',
    measure: { kind: 'weight', grams: 3 * OZ },
    group: 'weight',
  },
  {
    id: 'palm',
    label: 'Your palm (no fingers)',
    amountText: '≈ 3–4 oz meat or fish',
    icon: 'hand-left-outline',
    measure: { kind: 'weight', grams: 3.5 * OZ },
    group: 'weight',
  },
  {
    id: 'two-dice',
    label: 'Two dice',
    amountText: '≈ 1 oz cheese',
    icon: 'dice-outline',
    measure: { kind: 'weight', grams: 1 * OZ },
    group: 'weight',
  },
  {
    id: 'cupped-hand',
    label: 'A small cupped handful',
    amountText: '≈ 1 oz nuts',
    icon: 'hand-right-outline',
    measure: { kind: 'weight', grams: 1 * OZ },
    group: 'weight',
  },
  // Volume
  {
    id: 'fist',
    label: 'Your fist or a baseball',
    amountText: '≈ 1 cup',
    icon: 'baseball-outline',
    measure: { kind: 'volume', ml: CUP },
    group: 'volume',
  },
  {
    id: 'half-baseball',
    label: 'Half a baseball (or a tennis ball)',
    amountText: '≈ ½ cup',
    icon: 'tennisball-outline',
    measure: { kind: 'volume', ml: CUP / 2 },
    group: 'volume',
  },
  {
    id: 'ping-pong',
    label: 'A ping-pong ball',
    amountText: '≈ 2 tbsp',
    icon: 'ellipse-outline',
    measure: { kind: 'volume', ml: 2 * TBSP },
    group: 'volume',
  },
  {
    id: 'thumb',
    label: 'Your whole thumb',
    amountText: '≈ 1 tbsp',
    icon: 'thumbs-up-outline',
    measure: { kind: 'volume', ml: TBSP },
    group: 'volume',
  },
  {
    id: 'thumb-tip',
    label: 'Your thumb tip',
    amountText: '≈ 1 tsp',
    icon: 'finger-print-outline',
    measure: { kind: 'volume', ml: TSP },
    group: 'volume',
  },
  // Plate (standard 10-inch dinner plate)
  {
    id: 'quarter-plate',
    label: '¼ of a 10-inch plate',
    amountText: '≈ 1 cup',
    icon: 'pie-chart-outline',
    measure: { kind: 'volume', ml: CUP },
    group: 'plate',
  },
  {
    id: 'half-plate',
    label: '½ of a 10-inch plate',
    amountText: '≈ 2 cups',
    icon: 'contrast-outline',
    measure: { kind: 'volume', ml: 2 * CUP },
    group: 'plate',
  },
  {
    id: 'full-plate',
    label: 'A full 10-inch plate',
    amountText: '≈ 4 cups',
    icon: 'ellipse',
    measure: { kind: 'volume', ml: 4 * CUP },
    group: 'plate',
  },
];

export const PORTION_GROUP_TITLES: Record<PortionGuide['group'], string> = {
  weight: 'By weight',
  volume: 'By volume',
  plate: 'Plate guide',
};
