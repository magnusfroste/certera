import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

/** The renderer caps portrait diplomas at 620px and landscape ones at 800px. */
export const isPortraitDiploma = (css: string) => /\.diploma-container\s*\{[^}]*max-width:\s*620px/i.test(css || '');

export const pdfBox = (css: string) => (isPortraitDiploma(css) ? { width: 600, height: 800 } : { width: 800, height: 600 });

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
  const safeCss = (input.css || '').replace(/<\/style/gi, '<\\/style');
  const signed = Boolean(input.diplomaId && input.verificationUrl);
  const qr = signed
    ? renderToStaticMarkup(createElement(QRCodeSVG, {
        value: input.verificationUrl!, size: 60, level: 'M', includeMargin: true, bgColor: '#ffffff', fgColor: '#000000',
      }))
    : '';
  // Labels are drawn as SVG: html2canvas places SVG text exactly, while its
  // own text layout drifts for fonts it cannot measure.
  const idWidth = Math.ceil((input.diplomaId ?? '').length * 4.3) + 10;
  const proof = signed ? `
<div style="position:absolute;top:12px;right:12px;width:150px;height:24px;z-index:1000;line-height:0;"><svg xmlns="http://www.w3.org/2000/svg" width="150" height="24"><rect width="150" height="24" rx="12" fill="#2563eb"/><text x="75" y="16" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="600" fill="#ffffff">Verified by certera.ink</text></svg></div>
<div style="position:absolute;bottom:6px;left:12px;z-index:1000;line-height:0;">
  <div style="display:block;width:74px;background:#fff;padding:5px;border-radius:6px;border:2px solid #e5e7eb;margin-bottom:3px;"><div style="width:60px;height:60px;">${qr}</div></div>
  <svg xmlns="http://www.w3.org/2000/svg" width="${idWidth}" height="13"><rect x="0.5" y="0.5" width="${idWidth - 1}" height="12" rx="3" fill="#ffffff" stroke="#d1d5db"/><text x="5" y="9.5" font-family="'Courier New',Courier,monospace" font-size="7" fill="#444444">${escapeHtml(input.diplomaId!)}</text></svg>
</div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${safeCss}
html, body { margin: 0; padding: 0; background: #fff; }
* { box-sizing: border-box !important; }
#pdf-page { width: ${width}px; height: ${height}px; padding: 20px; background: #fff; position: relative; overflow: hidden; }
#pdf-page > .pdf-diploma, #pdf-page .diploma-container { width: 100% !important; height: 100% !important; position: relative !important; overflow: hidden !important; }
#pdf-page .diploma-container * { max-width: 95% !important; }
</style>
</head>
<body>
<div id="pdf-page"><div class="pdf-diploma">${input.html}</div>${proof}</div>
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
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;border:0;opacity:0;pointer-events:none;`;
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
    const scale = 2.5;
    const target = doc.createElement('canvas');
    target.width = Math.floor(width * scale);
    target.height = Math.floor(height * scale);
    const canvas = await html2canvas(page, {
      canvas: target, width, height, scale, useCORS: true, backgroundColor: '#ffffff', logging: false,
    });

    const pdf = new jsPDF(height > width ? 'portrait' : 'landscape', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = height / width;
    let w = pageW;
    let h = pageW * ratio;
    if (h > pageH) { h = pageH; w = pageH / ratio; }
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, 'FAST');
    pdf.save(pdfFileName(input.diplomaId));
  } finally {
    frame.remove();
  }
}
