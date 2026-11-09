// ─────────────────────────────────────────────────────────────────
// Model price table — USD per 1M tokens, a planning estimate
// ─────────────────────────────────────────────────────────────────
// Shared by ops-mcp (cost reporting, the provider catalogue) and
// generate-diploma (enforcing the daily budget for paid fallback). Providers
// change their prices, so every figure derived from this is labelled an
// estimate wherever it surfaces; it is not a billing source.

export interface ModelInfo { id: string; label: string; inputPer1M: number; outputPer1M: number }

export const CATALOGUE: Record<string, ModelInfo[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', inputPer1M: 3, outputPer1M: 15 },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', inputPer1M: 1, outputPer1M: 5 },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o', inputPer1M: 2.5, outputPer1M: 10 },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', inputPer1M: 0.15, outputPer1M: 0.6 },
  ],
  gemini: [
    { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash', inputPer1M: 0.3, outputPer1M: 2.5 },
  ],
  openrouter: [
    { id: 'openai/gpt-4o', label: 'GPT-4o (via OpenRouter)', inputPer1M: 2.5, outputPer1M: 10 },
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (via OpenRouter)', inputPer1M: 0.15, outputPer1M: 0.6 },
    { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (via OpenRouter)', inputPer1M: 3, outputPer1M: 15 },
  ],
};

export const PROVIDERS = Object.keys(CATALOGUE);

export function priceFor(provider: string, model: string): ModelInfo | undefined {
  return CATALOGUE[provider]?.find((m) => m.id === model);
}

/** Estimated USD for a token count, or null when the model isn't priced here. */
export function estimateCost(provider: string, model: string, input: number, output: number): number | null {
  const p = priceFor(provider, model);
  if (!p) return null;
  return (input / 1_000_000) * p.inputPer1M + (output / 1_000_000) * p.outputPer1M;
}
