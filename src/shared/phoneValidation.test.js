import { isValidPhone } from './phoneValidation';

describe('isValidPhone', () => {
  it('accepts a Nigerian local number (defaults to NG)', () => {
    expect(isValidPhone('08012345678')).toBe(true);
  });

  it('accepts a Nigerian number in +234 international format', () => {
    expect(isValidPhone('+2348012345678')).toBe(true);
  });

  it('accepts a valid number for another country when the country code is given', () => {
    expect(isValidPhone('+14155552671')).toBe(true); // US
  });

  it('rejects an obviously malformed number', () => {
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('not a phone number')).toBe(false);
  });

  it('rejects empty/missing input', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone(undefined)).toBe(false);
    expect(isValidPhone(null)).toBe(false);
  });
});
