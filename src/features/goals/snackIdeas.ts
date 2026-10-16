/** Placeholder snack ideas for the under-goal nudge. Calories are rough, per typical portion. */
export type SnackIdea = { name: string; approxCalories: number };

export const SNACK_IDEAS: readonly SnackIdea[] = [
  { name: 'Apple with 1 tbsp peanut butter', approxCalories: 190 },
  { name: 'Greek yogurt with berries', approxCalories: 150 },
  { name: 'Handful of almonds (about 1 oz)', approxCalories: 165 },
  { name: 'Cheese stick and whole-grain crackers', approxCalories: 200 },
  { name: 'Hummus with carrots and cucumber', approxCalories: 150 },
  { name: 'Banana', approxCalories: 105 },
  { name: 'Hard-boiled egg and toast', approxCalories: 150 },
  { name: 'Trail mix (about ¼ cup)', approxCalories: 175 },
];
