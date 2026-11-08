import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GUEST_DAILY_LIMIT,
  MAX_GUEST_DAILY_LIMIT,
  isValidGuestDailyLimit,
  parseGuestDailyLimit,
} from '../../../supabase/functions/_shared/guestAccess';

describe('guest daily limit setting', () => {
  it('defaults to what visitors experienced before it was a setting', () => {
    expect(DEFAULT_GUEST_DAILY_LIMIT).toBe(3);
    expect(parseGuestDailyLimit(null)).toBe(3);
    expect(parseGuestDailyLimit(undefined)).toBe(3);
  });

  it('uses a saved value, including 0 (account required)', () => {
    expect(parseGuestDailyLimit({ dailyLimit: 25 })).toBe(25);
    expect(parseGuestDailyLimit({ dailyLimit: 0 })).toBe(0);
    expect(parseGuestDailyLimit({ dailyLimit: MAX_GUEST_DAILY_LIMIT })).toBe(MAX_GUEST_DAILY_LIMIT);
  });

  // A broken setting must never open the generator to unlimited anonymous use,
  // so anything malformed falls back to the default, not to "no limit".
  it.each([
    [{ dailyLimit: -1 }],
    [{ dailyLimit: 2.5 }],
    [{ dailyLimit: MAX_GUEST_DAILY_LIMIT + 1 }],
    [{ dailyLimit: '25' }],
    [{ dailyLimit: Infinity }],
    [{ dailyLimit: NaN }],
    [{}],
    ['25'],
    [[]],
  ])('falls back to the default for %j', (raw) => {
    expect(parseGuestDailyLimit(raw)).toBe(DEFAULT_GUEST_DAILY_LIMIT);
  });

  it('validates input the same way the admin form does', () => {
    expect(isValidGuestDailyLimit(0)).toBe(true);
    expect(isValidGuestDailyLimit(10)).toBe(true);
    expect(isValidGuestDailyLimit(-1)).toBe(false);
    expect(isValidGuestDailyLimit(1.5)).toBe(false);
    expect(isValidGuestDailyLimit(MAX_GUEST_DAILY_LIMIT + 1)).toBe(false);
  });
});
