// ─────────────────────────────────────────────────────────────────
// Fallback budget: how much the paid reserve may cost per day
// ─────────────────────────────────────────────────────────────────
// generate-diploma tries the active provider first and, when it fails, falls
// back to the other providers that have a key. With a private model as the
// active provider that fallback is the only thing that costs money, and it
// has no ceiling: an outage at home moves every visitor onto a paid API.
//
// app_settings.fallback_policy = { dailyBudgetUsd } caps it:
//   null / not saved → no cap (the behaviour before this setting existed)
//   0                → best effort: never fall back, show "busy" instead
//   N                → fall back until the day's estimated fallback cost
//                      reaches N USD (UTC day)
// The active provider itself is never capped — it is the one you chose — and
// neither are custom providers in the chain, which are priced as free.
// Shared by generate-diploma (enforces it), ops-mcp and the admin UI.

import { CATALOGUE, estimateCost } from './pricing.ts';

export const FALLBACK_POLICY_KEY = 'fallback_policy';
export const MAX_FALLBACK_BUDGET_USD = 1000;

export function isValidFallbackBudget(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= MAX_FALLBACK_BUDGET_USD;
}

/** The daily cap in USD, or null for "no cap". Malformed values mean no cap, as before this setting. */
export function parseFallbackBudget(raw: unknown): number | null {
  const v = (raw as { dailyBudgetUsd?: unknown } | null | undefined)?.dailyBudgetUsd;
  return isValidFallbackBudget(v) ? Math.round(v * 100) / 100 : null;
}

/** Start of the current UTC day, as an ISO string — the budget resets at UTC midnight. */
export function startOfUtcDay(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

// A built-in provider's model missing from the price table is costed at the
// highest rate in the table rather than at zero, so an unlisted model can
// never slip past the cap for free.
const BUILT_IN = new Set(Object.keys(CATALOGUE));
const ALL_MODELS = Object.values(CATALOGUE).flat();
const MAX_IN = Math.max(...ALL_MODELS.map((m) => m.inputPer1M));
const MAX_OUT = Math.max(...ALL_MODELS.map((m) => m.outputPer1M));

/** Built-in providers bill per token; custom providers (your own gateway) are treated as free. */
export function isPaidProvider(provider: string): boolean {
  return BUILT_IN.has(provider);
}

export interface UsageRow {
  provider: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
}

/**
 * Estimated USD spent by these generation_usage rows. Custom providers (a
 * private gateway such as GarageAI) have no price in the table and count as
 * free; built-in providers are priced, conservatively when the model is unknown.
 */
export function estimatedSpendUsd(rows: UsageRow[]): number {
  let total = 0;
  for (const r of rows) {
    const input = r.input_tokens ?? 0;
    const output = r.output_tokens ?? 0;
    const priced = estimateCost(r.provider, r.model, input, output);
    if (priced !== null) total += priced;
    else if (BUILT_IN.has(r.provider)) total += (input / 1_000_000) * MAX_IN + (output / 1_000_000) * MAX_OUT;
  }
  return total;
}
