import { describe, expect, it } from 'vitest';
import { renderDSL, BG_STYLES, PALETTES } from '../../../supabase/functions/_shared/diplomaRenderer';
import type { DiplomaDSL } from '../../../supabase/functions/_shared/diplomaRenderer';

const dsl = (palette: string, decorations: string[]): DiplomaDSL => ({
  palette,
  typography: { pair: 'serif-classic' },
  layout: { orientation: 'landscape', padding: 'normal', composition: 'classic-stack' },
  decorations,
  header: { style: 'serif-centered', institutionName: 'Royal Institute' },
  border: { style: 'classical' },
  body: { title: 'Certificate of Completion', recipientName: 'Ada Lovelace', description: 'For completing a course.' },
  seal: { style: 'classical-round', position: 'bottom-right' },
  signature: { style: 'formal', name: 'Dean' },
}) as DiplomaDSL;

// Pattern decorations once set background-image on the diploma container. That
// rule has the same specificity as the palette background and comes later, so
// it replaced it — and almost every background is a gradient. On a dark
// palette the light text the contrast check chose for the dark background was
// left on a white page: 1.2:1, unreadable. They must draw on their own layer.
describe('pattern decorations keep the palette background', () => {
  const patterns = [['subtle-grid'], ['guilloche-pattern'], ['subtle-grid', 'guilloche-pattern']];

  it.each(patterns)('%s never sets a background on the container itself', (...decorations) => {
    const { css } = renderDSL(dsl('midnight-gold', decorations));
    expect(css).not.toMatch(/\.deco-(grid|guilloche)\s*\{[^}]*background/);
    expect(css).toMatch(/\.deco-(grid|guilloche)::after\{[^}]*z-index:-1[^}]*background-image:/);
  });

  it('draws both patterns on one layer when both are chosen', () => {
    const { css } = renderDSL(dsl('ivory-navy', ['subtle-grid', 'guilloche-pattern']));
    const layer = css.match(/\.deco-grid::after,\.deco-guilloche::after\{([^}]*)\}/)?.[1] ?? '';
    expect(layer.match(/gradient\(/g)).toHaveLength(4);
  });

  it('leaves the palette background on the container', () => {
    const { css, html } = renderDSL(dsl('midnight-gold', ['subtle-grid']));
    const bg = BG_STYLES[PALETTES['midnight-gold'].bg];
    expect(css).toContain(bg);
    expect(html).toContain('deco-grid');
  });
});

// The ribbon and the corner-accent brackets both drew on the container's
// ::before. Together, the ribbon took the bracket's top-left position and its
// text 'EST.' (no year) sat over the first letter of the school's name:
// "KESTREL BAY ACADEMY" read "ESTREL BAY ACADEMY" on every diploma.
describe('ribbon banner and corner accent', () => {
  const corner = (decorations: string[]) => ({
    ...dsl('ivory-navy', decorations),
    layout: { orientation: 'landscape', padding: 'normal', composition: 'corner-accent' },
  }) as DiplomaDSL;

  it('draws neither on the container pseudo-elements', () => {
    const { css } = renderDSL(corner(['ribbon-banner']));
    expect(css).not.toMatch(/\.(comp-corner|deco-ribbon)::(before|after)/);
  });

  it('gives the ribbon and both brackets elements of their own', () => {
    const { html } = renderDSL(corner(['ribbon-banner']));
    expect(html).toContain('class="ribbon-band"');
    expect(html).toContain('class="corner-mark tl"');
    expect(html).toContain('class="corner-mark br"');
  });

  it('puts no text in the ribbon', () => {
    const { css, html } = renderDSL(corner(['ribbon-banner']));
    expect(css).not.toContain("'EST.'");
    expect(html).toMatch(/<div class="ribbon-band" aria-hidden="true"><\/div>/);
  });

  it('keeps the border the container\'s first child, so the A4 sheet still lays it out', () => {
    const { html } = renderDSL(corner(['ribbon-banner']));
    expect(html).toMatch(/^<div class="diploma-container[^"]*"><div class="diploma-border">/);
  });

  it('adds no ornaments to a design that asked for none', () => {
    const { html } = renderDSL(dsl('ivory-navy', []));
    expect(html).not.toMatch(/ribbon-band|corner-mark/);
  });
});
