import { describe, expect, it } from 'vitest';
import {
  estimatedSpendUsd,
  isPaidProvider,
  isValidFallbackBudget,
  parseFallbackBudget,
  startOfUtcDay,
} from '../../../supabase/functions/_shared/fallbackBudget';

describe('parseFallbackBudget', () => {
  it('means no cap when nothing is saved or the value is malformed', () => {
    expect(parseFallbackBudget(null)).toBeNull();
    expect(parseFallbackBudget(undefined)).toBeNull();
    expect(parseFallbackBudget({})).toBeNull();
    expect(parseFallbackBudget({ dailyBudgetUsd: null })).toBeNull();
    expect(parseFallbackBudget({ dailyBudgetUsd: '5' })).toBeNull();
    expect(parseFallbackBudget({ dailyBudgetUsd: -1 })).toBeNull();
    expect(parseFallbackBudget({ dailyBudgetUsd: Number.NaN })).toBeNull();
    expect(parseFallbackBudget({ dailyBudgetUsd: 100000 })).toBeNull();
  });

  it('keeps 0 as best effort and rounds to cents', () => {
    expect(parseFallbackBudget({ dailyBudgetUsd: 0 })).toBe(0);
    expect(parseFallbackBudget({ dailyBudgetUsd: 2.345 })).toBe(2.35);
  });

  it('validates the admin input range', () => {
    expect(isValidFallbackBudget(0)).toBe(true);
    expect(isValidFallbackBudget(1000)).toBe(true);
    expect(isValidFallbackBudget(1000.01)).toBe(false);
    expect(isValidFallbackBudget(Infinity)).toBe(false);
  });
});

describe('startOfUtcDay', () => {
  it('resets at UTC midnight', () => {
    expect(startOfUtcDay(new Date('2026-11-08T23:59:59+05:00'))).toBe('2026-11-08T00:00:00.000Z');
    expect(startOfUtcDay(new Date('2026-11-08T00:00:00Z'))).toBe('2026-11-08T00:00:00.000Z');
  });
});

describe('estimatedSpendUsd', () => {
  it('prices built-in providers from the table', () => {
    // gpt-4o-mini: $0.15 in / $0.60 out per 1M
    const spend = estimatedSpendUsd([
      { provider: 'openai', model: 'gpt-4o-mini', input_tokens: 1_000_000, output_tokens: 1_000_000 },
    ]);
    expect(spend).toBeCloseTo(0.75, 6);
  });

  it('counts custom providers (own gateway) as free', () => {
    expect(isPaidProvider('garageai')).toBe(false);
    expect(
      estimatedSpendUsd([{ provider: 'garageai', model: 'garageai/auto', input_tokens: 5_000_000, output_tokens: 5_000_000 }]),
    ).toBe(0);
  });

  it('costs an unlisted model of a paid provider at the highest rate, never at zero', () => {
    expect(isPaidProvider('openrouter')).toBe(true);
    const unknown = estimatedSpendUsd([
      { provider: 'openrouter', model: 'someone/new-model', input_tokens: 1_000_000, output_tokens: 1_000_000 },
    ]);
    const priciest = estimatedSpendUsd([
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514', input_tokens: 1_000_000, output_tokens: 1_000_000 },
    ]);
    expect(unknown).toBeGreaterThanOrEqual(priciest);
  });

  it('treats missing token counts as zero', () => {
    expect(estimatedSpendUsd([{ provider: 'openai', model: 'gpt-4o', input_tokens: null, output_tokens: null }])).toBe(0);
  });
});
