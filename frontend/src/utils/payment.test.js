import { isValidCardNumber, isValidCardholderName } from './payment';

describe('payment utils', () => {
  test('accepts common test card numbers', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true);
    expect(isValidCardNumber('5555 5555 5555 4444')).toBe(true);
    expect(isValidCardNumber('3782 822463 10005')).toBe(true);
    expect(isValidCardNumber('4111 1111 1111 1111')).toBe(true);
    expect(isValidCardNumber('4242 4242 4242 4243')).toBe(true);
  });

  test('rejects invalid card numbers', () => {
    expect(isValidCardNumber('')).toBe(false);
    expect(isValidCardNumber('1111 1111 1111 1111')).toBe(false);
    expect(isValidCardNumber('0000 0000 0000 0000')).toBe(false);
    expect(isValidCardNumber('1234 5678 9012 3456')).toBe(false);
    expect(isValidCardNumber('9876 5432 1098 7654')).toBe(false);
    expect(isValidCardNumber('4242 4242 4242')).toBe(false);
  });

  test('accepts common cardholder names with accents and punctuation', () => {
    expect(isValidCardholderName('Elodie Martin')).toBe(true);
    expect(isValidCardholderName('Jean-Pierre Dupont')).toBe(true);
    expect(isValidCardholderName("Meryem O'Connor")).toBe(true);
    expect(isValidCardholderName('A. Rahmani')).toBe(true);
  });

  test('rejects clearly invalid cardholder names', () => {
    expect(isValidCardholderName('')).toBe(false);
    expect(isValidCardholderName('AB')).toBe(false);
    expect(isValidCardholderName('Client 123')).toBe(false);
  });
});
