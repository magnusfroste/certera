// ─────────────────────────────────────────────────────────────────
// Guest access: how many diplomas a visitor may generate without an account
// ─────────────────────────────────────────────────────────────────
// One value, set in /admin and stored in app_settings.guest_access, read by
// the generate-diploma edge function (which enforces it per IP per day), the
// app (which shows the count and stops the button) and ops-mcp (which reports
// guests at the cap). It used to be three hardcoded numbers that disagreed —
// 3 in the app, 10 on the server, 3 in ops-mcp — so the server's own limit was
// never what a visitor experienced. Shared by both sides so they cannot drift.

export const GUEST_ACCESS_KEY = 'guest_access';

/** What visitors experienced before this became a setting; used until one is saved. */
export const DEFAULT_GUEST_DAILY_LIMIT = 3;

/** Upper bound for the setting — a typo should not hand out unlimited generations. */
export const MAX_GUEST_DAILY_LIMIT = 1000;

export interface GuestAccessSettings {
  /** Generations per visitor per 24 h without an account. 0 = an account is required. */
  dailyLimit: number;
}

/** True when the value is a usable limit (a whole number from 0 to the maximum). */
export function isValidGuestDailyLimit(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_GUEST_DAILY_LIMIT;
}

/**
 * Read the stored setting. Anything missing or malformed falls back to the
 * default rather than to "no limit": a broken setting must never open the
 * generator to unlimited anonymous use.
 */
export function parseGuestDailyLimit(raw: unknown): number {
  const limit = (raw as Partial<GuestAccessSettings> | null | undefined)?.dailyLimit;
  return isValidGuestDailyLimit(limit) ? limit : DEFAULT_GUEST_DAILY_LIMIT;
}
