import { describe, expect, it } from 'vitest';
import {
  normaliseBaseUrl,
  parseCustomProviders,
  secretNameFor,
  validateCustomProvider,
} from '../../../supabase/functions/_shared/customProviders';

const valid = { id: 'garageai', label: 'GarageAI', baseUrl: 'https://api.garageai.eu/v1', models: ['garageai/auto'] };

describe('custom provider secret names', () => {
  // The prefix is the security boundary: whoever edits the provider list picks
  // the URL a key is sent to, so a custom provider must never be able to name
  // the secret of a built-in one.
  it('derives a prefixed secret name from the id', () => {
    expect(secretNameFor('garageai')).toBe('LLM_GARAGEAI_API_KEY');
  });

  it.each(['openrouter', 'anthropic', 'openai', 'gemini', 'firecrawl', 'hedera', 'supabase', 'OPENROUTER'])(
    'refuses the reserved id %s',
    (id) => {
      expect(validateCustomProvider({ ...valid, id }).provider).toBeNull();
    },
  );

  it('drops a stored entry that tries to take a built-in id', () => {
    const parsed = parseCustomProviders([
      valid,
      { id: 'openrouter', baseUrl: 'https://evil.example/v1', models: ['x'] },
    ]);
    expect(parsed.map((p) => p.id)).toEqual(['garageai']);
  });
});

describe('custom provider base URLs', () => {
  it('keeps a public https base and trims a pasted endpoint', () => {
    expect(normaliseBaseUrl('https://api.garageai.eu/v1/')).toBe('https://api.garageai.eu/v1');
    expect(normaliseBaseUrl('https://api.garageai.eu/v1/chat/completions')).toBe('https://api.garageai.eu/v1');
  });

  it.each([
    'http://api.garageai.eu/v1',
    'https://user:pw@api.example.com/v1',
    'https://127.0.0.1/v1',
    'https://[::1]/v1',
    'https://localhost/v1',
    'https://gpu.local/v1',
    'https://intranet/v1',
    'https://api.example.com/v1?key=1',
  ])('refuses %s', (url) => {
    expect(normaliseBaseUrl(url)).toBeNull();
  });
});

describe('stored provider list', () => {
  it('never throws on malformed settings', () => {
    expect(parseCustomProviders(null)).toEqual([]);
    expect(parseCustomProviders({ not: 'a list' })).toEqual([]);
    expect(parseCustomProviders(['junk', 42, null])).toEqual([]);
  });

  it('keeps the first of duplicate ids and de-duplicates models', () => {
    const parsed = parseCustomProviders([
      { ...valid, models: ['garageai/auto', ' garageai/auto ', 'mine/dgx-city/xiaomi/mimo-v2.6-flash'] },
      { ...valid, baseUrl: 'https://other.example/v1' },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].baseUrl).toBe('https://api.garageai.eu/v1');
    expect(parsed[0].models).toEqual(['garageai/auto', 'mine/dgx-city/xiaomi/mimo-v2.6-flash']);
  });
});
