import { describe, expect, it } from 'vitest';
import { buildPdfDocument, pdfBox, pdfFileName } from '@/lib/diplomaPdf';

const html = '<div class="diploma-container"><h1>Elin Andersson</h1></div>';
const landscape = '.diploma-container { max-width: 800px; }';
const portrait = '.diploma-container { max-width: 620px; }';

describe('diploma PDF', () => {
  it('sizes the page from the orientation in the stored CSS', () => {
    expect(pdfBox(landscape)).toEqual({ width: 800, height: 600 });
    expect(pdfBox(portrait)).toEqual({ width: 600, height: 800 });
  });

  it('prints the verification QR code and the id on a signed diploma', () => {
    const doc = buildPdfDocument({ html, css: landscape, diplomaId: 'DIP_abc_123', verificationUrl: 'https://www.certera.ink/verify/DIP_abc_123' });
    expect(doc).toContain('<svg');
    expect(doc).toContain('DIP_abc_123');
    expect(doc).toContain('Verified by certera.ink');
    expect(doc).toContain('Elin Andersson');
  });

  it('claims nothing on an unsigned diploma', () => {
    const doc = buildPdfDocument({ html, css: landscape });
    expect(doc).not.toContain('<svg');
    expect(doc).not.toContain('Verified by certera.ink');
  });

  it('keeps stored CSS from closing the style element', () => {
    const doc = buildPdfDocument({ html, css: 'a{}</style><script>alert(1)</script>' });
    expect(doc).not.toContain('</style><script>alert(1)');
  });

  it('names the file after the diploma id only when the id is plain', () => {
    expect(pdfFileName('DIP_abc_123')).toBe('certificate-DIP_abc_123.pdf');
    expect(pdfFileName('../x')).toBe('diploma.pdf');
    expect(pdfFileName()).toBe('diploma.pdf');
  });
});
