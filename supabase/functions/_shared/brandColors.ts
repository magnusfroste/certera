// Picks a brand's own primary and accent colour from the colours found on its
// website, so a diploma made "from your website" is drawn in the school's real
// colours rather than only the nearest curated palette. Pure: shared by the
// edge function and the client tests.
import { contrastRatio } from './diplomaContrast.ts';

export interface BrandColors { primaryColor?: string; accentColor?: string }

// Text and borders in the primary colour must be readable on the background
// (AA for normal text); the accent only decorates, and below this the
// generate-diploma function drops it anyway.
const PRIMARY_MIN_CONTRAST = 4.5;
const ACCENT_MIN_CONTRAST = 1.6;
// An accent too close in hue to the primary reads as the same colour.
const MIN_HUE_DISTANCE = 30;

const normalize = (value: string): string | null => {
  const m = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return '#' + h.toUpperCase();
};

function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

/**
 * The primary is the most saturated colour that is readable on the
 * background (a deep teal beats a near-black ink); the accent is the most
 * saturated of the rest that is visible on it and not the primary's hue.
 * Greys and near-whites are never picked. Either may be absent.
 */
export function pickBrandColors(found: string[], background: string): BrandColors {
  const colors = [...new Set(found.map(normalize).filter((c): c is string => !!c))]
    .map((hex) => ({ hex, ...hsl(hex), contrast: contrastRatio(hex, background) }))
    .filter((c) => c.s >= 0.12 && c.l <= 0.92);
  const bySaturation = (a: { s: number }, b: { s: number }) => b.s - a.s;
  const primary = colors.filter((c) => c.contrast >= PRIMARY_MIN_CONTRAST).sort(bySaturation)[0];
  const rest = colors.filter((c) => c.hex !== primary?.hex && c.contrast >= ACCENT_MIN_CONTRAST);
  const accent = rest
    .filter((c) => !primary || hueDistance(c.h, primary.h) >= MIN_HUE_DISTANCE)
    .sort(bySaturation)[0] ?? rest.sort(bySaturation)[0];
  return {
    ...(primary ? { primaryColor: primary.hex } : {}),
    ...(accent ? { accentColor: accent.hex } : {}),
  };
}

export interface BrandData { brandName: string; colors: string[]; fonts: string[] }

// Extract brand colors/fonts/name from raw HTML (+ optional pre-parsed metadata)
export const extractBrandFromHtml = (
  html: string,
  url: string,
  meta?: { title?: string; siteName?: string },
): BrandData => {
  // A brand's colours are the ones the page uses most, not the first ones in
  // it. Not "&#8212;" (an entity) and not a 4- or 5-digit run.
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/(?<![&\w])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F\w])/g)) {
    const hex = '#' + (m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]).toUpperCase();
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
  const fonts = new Set<string>();
  for (const m of html.matchAll(/font-family\s*:\s*([^;]+)/gi)) {
    const f = m[1].replace(/['"]/g, '').split(',')[0].trim();
    if (f && f !== 'inherit') fonts.add(f);
  }
  const title = meta?.title || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
  const siteName = meta?.siteName || html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"/i)?.[1] || '';
  return {
    brandName: siteName || title.split(/[-|–—]/)[0].trim() || new URL(url).hostname.replace('www.', ''),
    colors: colors.slice(0, 8),
    fonts: [...fonts].slice(0, 3),
  };
};

// Bot walls answer a scrape with a page of their own: its colours and name are
// not the site's.
const WALL_TITLE = /just a moment|attention required|access denied|verify you are human|captcha/i;

/**
 * Of two reads of the same website (Firecrawl and a direct fetch), the one that
 * found the site's colours. A read that came back from a bot wall, or with no
 * colours, loses to one with colours; with colours in both, the one with more
 * wins (Firecrawl first on a tie: it renders the page's scripts).
 */
export function chooseScrape(firecrawl: BrandData | null, direct: BrandData | null): BrandData | null {
  const usable = (d: BrandData | null) => (d && !WALL_TITLE.test(d.brandName) ? d : null);
  const a = usable(firecrawl), b = usable(direct);
  if (!a || !b) return a ?? b;
  const best = b.colors.length > a.colors.length ? b : a;
  return { ...best, brandName: a.brandName || b.brandName, fonts: best.fonts.length ? best.fonts : (a.fonts.length ? a.fonts : b.fonts) };
}

// Colours people name in words, as a designer would draw them on a diploma.
const NAMED: Record<string, string> = {
  navy: '#1F2A5A', blue: '#1D4ED8', cobalt: '#1F4AA8', sapphire: '#1F3F8F', indigo: '#3B2F8F', slate: '#3E4C5E',
  teal: '#0F5E5E', turquoise: '#1A8F8A', petrol: '#155060',
  green: '#1F6B3A', forest: '#1E4D2B', emerald: '#0F7A4F', olive: '#5B6B2A', sage: '#6F8F72', pine: '#1D4A3A',
  red: '#B42318', crimson: '#A0172F', scarlet: '#C8102E', burgundy: '#6D1A36', maroon: '#6B1F2A', wine: '#6E1F35', cherry: '#9E1B32',
  purple: '#5B2A86', violet: '#6D3FB5', plum: '#6A2C5B', lavender: '#8E7BC0', aubergine: '#4A2040',
  pink: '#C8467A', rose: '#C2416B', coral: '#E0664F', salmon: '#E07A62',
  orange: '#D9661F', terracotta: '#B5532F', rust: '#A7461F', amber: '#D9962B', gold: '#C9A13B', golden: '#C9A13B',
  yellow: '#E0B21F', mustard: '#C9A227', ochre: '#C08A2B', bronze: '#A8702E', copper: '#B5652B', brass: '#B5953A',
  brown: '#6B4423', chocolate: '#5A3420', tan: '#B08B5B', caramel: '#B5793A',
};
const NAMED_RE = new RegExp(`(?:\\b(deep|dark|light|pale|soft|bright|rich)\\s+(?:\\w+\\s+){0,2}?)?\\b(${Object.keys(NAMED).join('|')})\\b`, 'gi');

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (hex: string, toward: number, share: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return toHex(r + (toward - r) * share, g + (toward - g) * share, b + (toward - b) * share);
};
// Darker steps until the colour reads on the background at the given contrast.
const readable = (hex: string, background: string, min: number) => {
  let c = hex;
  for (let i = 0; i < 8 && contrastRatio(c, background) < min; i++) c = mix(c, 0, 0.18);
  return contrastRatio(c, background) >= min ? c : null;
};

/**
 * The colours a request names, in its own words ("deep sea teal and warm
 * amber", "#0F3D3E") as a brand for the diploma: the first colour that reads
 * as text becomes the primary, the next named colour the accent. Greys, black
 * and white name no brand colour.
 */
export function brandFromWords(text: string, background: string): BrandColors {
  const found: string[] = [];
  for (const m of text.matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const hex = normalize(m[0]);
    if (hex) found.push(hex);
  }
  for (const m of text.matchAll(NAMED_RE)) {
    // "signed by Amber Lee", "Mary Rose": a capitalised colour next to a
    // capitalised word is a person's name.
    const word = m[2];
    const at = (m.index ?? 0) + m[0].length - word.length;
    const before = text.slice(0, at).match(/([A-Za-z]+)\W*$/)?.[1] ?? '';
    const after = text.slice(at + word.length).match(/^\W*([A-Za-z]+)/)?.[1] ?? '';
    const cap = (w: string) => /^[A-Z][a-z]/.test(w);
    if (cap(word) && ((cap(after)) || (cap(before) && !/[.!?:]\s*$/.test(text.slice(0, at))))) continue;
    let hex = NAMED[word.toLowerCase()];
    const mod = m[1]?.toLowerCase();
    if (mod === 'deep' || mod === 'dark' || mod === 'rich') hex = mix(hex, 0, 0.3);
    else if (mod === 'light' || mod === 'pale' || mod === 'soft') hex = mix(hex, 255, 0.3);
    found.push(hex);
  }
  const colours = [...new Set(found)].filter((c) => { const { s, l } = hsl(c); return s >= 0.12 && l <= 0.92 && l >= 0.06; });
  if (colours.length === 0) return {};
  // The darkest colour carries the text; the first other colour decorates.
  const byDark = [...colours].sort((a, b) => hsl(a).l - hsl(b).l);
  const primary = colours.length > 1 || hsl(colours[0]).l < 0.45 ? readable(byDark[0], background, PRIMARY_MIN_CONTRAST) : null;
  const accentHex = colours.find((c) => c !== byDark[0] || !primary);
  const accent = accentHex ? readable(accentHex, background, ACCENT_MIN_CONTRAST) : null;
  return {
    ...(primary ? { primaryColor: primary } : {}),
    ...(accent && accent !== primary ? { accentColor: accent } : {}),
  };
}

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
const validBrand = (b: BrandColors | undefined): BrandColors =>
  Object.fromEntries(Object.entries(b ?? {}).filter(([k, v]) => (k === 'primaryColor' || k === 'accentColor') && isHex(v)));

/**
 * The brand colours of a diploma after a change in words. Colours the request
 * names win (models ignore "teal and amber" and keep the palette); else the
 * model's own brand; else the diploma keeps the colours it had,
 * from its website or an earlier request, which a model dropped on unrelated
 * edits ("sign it by the principal" lost the school's teal).
 */
export function brandAfterEdit(opts: {
  modelBrand?: BrandColors; previousBrand?: BrandColors; request: string; background: string;
}): BrandColors {
  const model = validBrand(opts.modelBrand);
  const named = brandFromWords(opts.request, opts.background);
  const previous = validBrand(opts.previousBrand);
  const namesColours = Object.keys(named).length > 0;
  // Named colours beat the model's hex: models keep the palette's or invent one.
  if (namesColours) return { ...model, ...named };
  return { ...previous, ...model };
}
