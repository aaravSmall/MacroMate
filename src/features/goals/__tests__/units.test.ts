import { ageFromBirthDate, cmToIn, inToCm, kgToLb, lbToKg } from '@/features/goals';

describe('unit conversions', () => {
  it('round-trips weight and height', () => {
    expect(kgToLb(lbToKg(154))).toBeCloseTo(154, 10);
    expect(cmToIn(inToCm(65))).toBeCloseTo(65, 10);
    expect(lbToKg(1)).toBeCloseTo(0.45359237, 10);
    expect(inToCm(1)).toBe(2.54);
  });
});

describe('ageFromBirthDate', () => {
  const today = new Date(2026, 9, 16); // Oct 16, 2026

  it('counts whole years', () => {
    expect(ageFromBirthDate('1996-01-01', today)).toBe(30);
  });

  it('handles the birthday itself and the day before', () => {
    expect(ageFromBirthDate('1996-10-16', today)).toBe(30);
    expect(ageFromBirthDate('1996-10-17', today)).toBe(29);
  });

  it('rejects malformed dates', () => {
    expect(() => ageFromBirthDate('nope', today)).toThrow();
  });
});
