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
