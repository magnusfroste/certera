import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { fitsSheet, formatFromCss, sheetCss, SHEET_RATIO, SHEET_WIDTH } from '@/lib/diplomaFormat';

/** The PDF page in CSS pixels: an A4 sheet as wide as the diploma's format. */
export const pdfBox = (css: string) => {
  const format = formatFromCss(css);
  return { width: SHEET_WIDTH[format], height: Math.round(SHEET_WIDTH[format] * SHEET_RATIO[format]) };
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const pdfFileName = (diplomaId?: string) =>
  diplomaId && /^[A-Za-z0-9_-]{1,64}$/.test(diplomaId) ? `certificate-${diplomaId}.pdf` : 'diploma.pdf';

/**
 * The page that gets captured into the PDF. A signed diploma carries its
 * verification QR code and id, so a printed copy can be checked against the
 * signed original; an unsigned one carries neither.
 */
export function buildPdfDocument(input: { html: string; css: string; diplomaId?: string; verificationUrl?: string }): string {
  const { width, height } = pdfBox(input.css);
  const onSheet = fitsSheet(input.html);
  const safeCss = (input.css || '').replace(/<\/style/gi, '<\\/style');
  const signed = Boolean(input.diplomaId && input.verificationUrl);
  const qr = signed
    ? renderToStaticMarkup(createElement(QRCodeSVG, {
        value: input.verificationUrl!, size: 60, level: 'M', includeMargin: true, bgColor: '#ffffff', fgColor: '#000000',
      }))
    : '';
  // The proof sits in its own strip under the diploma so it never covers the
  // design. Labels are SVG: html2canvas places SVG text exactly, while its own
  // text layout drifts for fonts it cannot measure.
  const host = (input.verificationUrl ?? '').replace(/^https?:\/\/(www\.)?/, '');
  const proof = signed ? `
<div style="display:flex;align-items:center;gap:10px;height:68px;padding:0 4px;line-height:0;">
  <div style="width:60px;height:60px;flex:none;">${qr}</div>
  <svg xmlns="http://www.w3.org/2000/svg" width="460" height="34" style="flex:none;"><text x="0" y="13" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="600" fill="#111827">Scan to verify this certificate</text><text x="0" y="28" font-family="'Courier New',Courier,monospace" font-size="9" fill="#4b5563">${escapeHtml(host)}</text></svg>
  <div style="flex:1 1 auto;"></div>
  <svg xmlns="http://www.w3.org/2000/svg" width="150" height="24" style="flex:none;"><rect width="150" height="24" rx="12" fill="#2563eb"/><text x="75" y="16" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="600" fill="#ffffff">Verified by certera.ink</text></svg>
</div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${safeCss}
html, body { margin: 0; padding: 0; background: #fff; }
* { box-sizing: border-box !important; }
#pdf-page { width: ${width}px; min-height: ${height}px; padding: ${signed ? '12px 12px 0' : '0'}; background: #fff; position: relative; overflow: hidden; }
${onSheet ? sheetCss(formatFromCss(input.css)) : `#pdf-page { width: max-content; min-width: ${width}px; padding: 20px 20px ${signed ? '0' : '20px'}; } #pdf-page .diploma-container { width: 100% !important; }`}
</style>
</head>
<body>
<div id="pdf-page"><div class="${onSheet ? 'a4-sheet' : 'pdf-diploma'}">${input.html}</div>${proof}</div>
</body>
</html>`;
}

const waitForLoad = (frame: HTMLIFrameElement) =>
  new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, 8000);
    frame.addEventListener('load', () => { window.clearTimeout(timer); resolve(); }, { once: true });
  });

/**
 * Renders the diploma to an A4 PDF and saves it.
 *
 * Stored diploma HTML is attacker-controllable, so it is laid out in an iframe
 * sandboxed without `allow-scripts`: nothing in it can run, but this page can
 * still read the result to capture it.
 */
export async function downloadDiplomaPdf(input: { html: string; css: string; diplomaId?: string; verificationUrl?: string }): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const { width, height } = pdfBox(input.css);

  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${width * 2}px;height:${height}px;border:0;opacity:0;pointer-events:none;`;
  const loaded = waitForLoad(frame);
  frame.srcdoc = buildPdfDocument(input);
  document.body.appendChild(frame);

  try {
    await loaded;
    const doc = frame.contentDocument;
    const page = doc?.getElementById('pdf-page');
    if (!doc || !page) throw new Error('The diploma could not be laid out for the PDF.');
    // Web fonts start loading only once the text is laid out, so lay it out
    // first; otherwise the capture falls back to a system font.
    page.getBoundingClientRect();
    await new Promise((r) => window.setTimeout(r, 60));
    await Promise.race([doc.fonts?.ready, new Promise((r) => window.setTimeout(r, 5000))]);

    // Canvas text is drawn with the fonts of the document that owns the
    // canvas, so the canvas must come from the frame that loaded them.
    // A diploma with more text than an A4 page holds is captured whole and scaled to fit.
    const pageBox = page.getBoundingClientRect();
    const captureHeight = Math.max(height, Math.ceil(pageBox.height));
    // A free-form design wider than the page is captured whole as well.
    const captureWidth = Math.max(width, Math.ceil(pageBox.width));
    const scale = 2.5;
    const target = doc.createElement('canvas');
    target.width = Math.floor(captureWidth * scale);
    target.height = Math.floor(captureHeight * scale);
    const canvas = await html2canvas(page, {
      canvas: target, width: captureWidth, height: captureHeight, scale, useCORS: true, backgroundColor: '#ffffff', logging: false,
    });

    const pdf = new jsPDF(height > width ? 'portrait' : 'landscape', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = captureHeight / captureWidth;
    let w = pageW;
    let h = pageW * ratio;
    if (h > pageH) { h = pageH; w = pageH / ratio; }
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, 'FAST');
    pdf.save(pdfFileName(input.diplomaId));
  } finally {
    frame.remove();
  }
}
