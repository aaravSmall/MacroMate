export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const inToCm = (inches: number) => inches * CM_PER_IN;
export const cmToIn = (cm: number) => cm / CM_PER_IN;

export type WeeklyRate = { amount: number; unit: 'lb' | 'kg' };

export function weeklyRateInLb(rate: WeeklyRate): number {
  return rate.unit === 'lb' ? rate.amount : kgToLb(rate.amount);
}

export function weeklyRateInKg(rate: WeeklyRate): number {
  return rate.unit === 'kg' ? rate.amount : lbToKg(rate.amount);
}

/** Whole years between a `YYYY-MM-DD` birth date and `today`. */
export function ageFromBirthDate(birthDate: string, today: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid birth date "${birthDate}".`);
  let age = today.getFullYear() - y;
  const hadBirthday =
    today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}
