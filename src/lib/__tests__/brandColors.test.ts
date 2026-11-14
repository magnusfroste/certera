import { describe, expect, it } from 'vitest';
import { extractBrandFromHtml, pickBrandColors } from '../../../supabase/functions/_shared/brandColors';
import { renderDSL, type DiplomaDSL } from '../../../supabase/functions/_shared/diplomaRenderer';

// A school site's colours sit in a <style> block as CSS variables and rules,
// with an SVG crest drawn in the same colours (the certera.ink demo school).
const SCHOOL = `<!doctype html><html><head><title>Kestrel Bay Academy — Coastal Science</title>
<meta property="og:site_name" content="Kestrel Bay Academy">
<style>
  h1, h2 { font-family: 'Fraunces', Georgia, serif; color: #0F3D3E; }
  body { font-family: 'Work Sans', system-ui, sans-serif; }
  :root { --primary: #0F3D3E; --accent: #E3A23B; --sea: #7FB8B0; --paper: #F7F1E5; --ink: #1B2626; }
  .btn { background: #E3A23B; color: #0F3D3E; } .card { border-top: 6px solid #E3A23B; }
  footer { background: #0F3D3E; color: #7FB8B0; } .muted { color: #6b7b7a; }
</style></head><body><p>Learn by the sea &#8212; since 1962.</p>
<svg><circle fill="#0F3D3E"/><circle stroke="#E3A23B"/></svg></body></html>`;

const COOL_BACKGROUND = '#edf1f6';

describe('reading a website', () => {
  it('ranks colours by how often the page uses them', () => {
    const { colors } = extractBrandFromHtml(SCHOOL, 'https://example.org/');
    expect(colors.slice(0, 2).sort()).toEqual(['#0F3D3E', '#E3A23B']);
  });

  it('does not take an HTML entity for a colour', () => {
    const { colors } = extractBrandFromHtml(SCHOOL, 'https://example.org/');
    expect(colors).not.toContain('#882211');
    expect(colors.every((c) => /^#[0-9A-F]{6}$/.test(c))).toBe(true);
  });

  it('keeps the name and the fonts', () => {
    const brand = extractBrandFromHtml(SCHOOL, 'https://example.org/');
    expect(brand.brandName).toBe('Kestrel Bay Academy');
    expect(brand.fonts).toEqual(['Fraunces', 'Work Sans']);
  });
});

describe('picking the brand colours', () => {
  it("takes the school's deep teal for text and its amber for ornaments", () => {
    const { colors } = extractBrandFromHtml(SCHOOL, 'https://example.org/');
    expect(pickBrandColors(colors, COOL_BACKGROUND)).toEqual({ primaryColor: '#0F3D3E', accentColor: '#E3A23B' });
  });

  it('prefers a coloured primary to a near-black ink', () => {
    expect(pickBrandColors(['#1B2626', '#0F3D3E'], COOL_BACKGROUND).primaryColor).toBe('#0F3D3E');
  });

  it('never picks white, greys or a colour unreadable as text', () => {
    const picked = pickBrandColors(['#FFFFFF', '#F7F1E5', '#777777', '#E3A23B'], COOL_BACKGROUND);
    expect(picked.primaryColor).toBeUndefined();
    expect(picked.accentColor).toBe('#E3A23B');
  });

  it('picks nothing from a page without colours', () => {
    expect(pickBrandColors([], COOL_BACKGROUND)).toEqual({});
  });

  it('does not pick an accent of the same hue as the primary when another is there', () => {
    const picked = pickBrandColors(['#0F3D3E', '#1D6A68', '#E3A23B'], COOL_BACKGROUND);
    expect(picked.accentColor).toBe('#E3A23B');
  });
});

describe('a diploma in brand colours', () => {
  it('draws the institution and the seal in them', () => {
    const { css } = renderDSL({
      palette: 'coastal-fresh',
      typography: { pair: 'serif-classic' },
      layout: { orientation: 'landscape', padding: 'normal', composition: 'classic-stack' },
      header: { style: 'serif-centered', institutionName: 'Kestrel Bay Academy' },
      border: { style: 'classical' },
      body: { title: 'Graduation 2026', recipientName: 'Maya Chen', description: 'Steady wings, open water.' },
      seal: { style: 'compass', position: 'bottom-right', text: 'KESTREL' },
      signature: { style: 'formal', name: 'Dr. Mira Holm' },
      brand: { primaryColor: '#0F3D3E', accentColor: '#E3A23B' },
    } as DiplomaDSL);
    expect(css).toContain('.diploma-header .institution{color:#0F3D3E}');
    expect(css).toMatch(/\.diploma-seal\{[^}]*border:2px solid #E3A23B/);
  });
});
