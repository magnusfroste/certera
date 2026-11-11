import { describe, expect, it } from 'vitest';
import { cssWithFormat, fitsSheet, formatFromCss, requestedFormat, sheetCss } from '@/lib/diplomaFormat';

const landscape = ".diploma-container{max-width:800px;width:100%;margin:0 auto}\n.diploma-body .diploma-description{max-width:600px}";
const portrait = '.diploma-container{max-width:620px;width:100%}';

describe('diploma format', () => {
  it('reads the format from the rendered CSS', () => {
    expect(formatFromCss(landscape)).toBe('landscape');
    expect(formatFromCss(portrait)).toBe('portrait');
    expect(formatFromCss('')).toBe('landscape');
    expect(formatFromCss(null)).toBe('landscape');
  });

  it('switches a design between formats without touching other widths', () => {
    const turned = cssWithFormat(landscape, 'portrait');
    expect(formatFromCss(turned)).toBe('portrait');
    expect(turned).toContain('.diploma-description{max-width:600px}');
    expect(cssWithFormat(turned, 'landscape')).toBe(landscape);
    expect(cssWithFormat('h1{color:red}', 'portrait')).toBe('h1{color:red}');
  });

  it("understands a format asked for in the person's own words", () => {
    expect(requestedFormat('Make it portrait please')).toBe('portrait');
    expect(requestedFormat('gör diplomet stående')).toBe('portrait');
    expect(requestedFormat('Jag vill ha det liggande')).toBe('landscape');
    expect(requestedFormat('switch to LANDSCAPE')).toBe('landscape');
    expect(requestedFormat('Create a diploma for our leadership programme in portrait format with a navy palette and gold seal')).toBe('portrait');
    expect(requestedFormat('change the orientation to landscape')).toBe('landscape');
    expect(requestedFormat('A certificate for a portrait photography course')).toBeNull();
    expect(requestedFormat('Diploma for the landscape architecture programme at Nordlys, elegant and classic with a seal')).toBeNull();
    expect(requestedFormat('portrait or landscape, you choose')).toBeNull();
    expect(requestedFormat('make the title bigger')).toBeNull();
    expect(requestedFormat(undefined)).toBeNull();
  });

  it('gives the sheet the proportions of an A4 page', () => {
    expect(sheetCss('landscape')).toContain('max-width:800px');
    expect(sheetCss('landscape')).toContain('padding-bottom:70.707%');
    expect(sheetCss('portrait')).toContain('max-width:620px');
    expect(sheetCss('portrait')).toContain('padding-bottom:141.429%');
  });

  it('only lays renderer output on a sheet', () => {
    expect(fitsSheet('<div class="diploma-container comp-banner"><div class="diploma-border"></div></div>')).toBe(true);
    expect(fitsSheet('<div class="diploma-container">x</div>')).toBe(true);
    expect(fitsSheet('<html><body><h1>Old free-form diploma</h1></body></html>')).toBe(false);
    expect(fitsSheet('')).toBe(false);
  });
});
