import type { Food } from '@/types/domain';

export type DiningLocation = {
  id: string;
  provider: string;
  name: string;
  category: string | null;
};

export type DiningStation = { name: string; foods: Food[] };
export type DiningMeal = { name: string; stations: DiningStation[] };
