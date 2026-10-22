// Diploma DSL → HTML/CSS Renderer
// Converts a DiplomaDSL object into final HTML and CSS strings

import type { DiplomaDSL } from './types';
import { backgroundSamples, ensureTextContrast } from '../../supabase/functions/_shared/diplomaContrast';
import {
  backgroundStyles,
  borderStyles,
  headerStyles,
  sealStyles,
  signatureStyles,
  paddingValues,
} from './blocks';

// ── Color helpers ──

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  // Relative luminance (sRGB)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5;
}

function deriveTextPalette(primaryColor: string) {
  const light = isLightColor(primaryColor);
  return {
    body:      light ? '#ddd' : '#333',
    secondary: light ? '#ccc' : '#555',
    tertiary:  light ? '#aaa' : '#666',
    muted:     light ? '#999' : '#888',
    faint:     light ? '#888' : '#aaa',
  };
}

export function renderDiplomaDSL(dsl: DiplomaDSL): { html: string; css: string } {
  const primaryColor = dsl.brand?.primaryColor || '#1a365d';
  const accentColor = dsl.brand?.accentColor || '#c6a961';
  const padding = paddingValues[dsl.layout.padding] || '40px';
  const txt = deriveTextPalette(primaryColor);

  // ── Collect CSS ──
  const cssParts: string[] = [];

  // Background
  const bgCss = backgroundStyles[dsl.background.style] || backgroundStyles['clean-white'];
  const samples = backgroundSamples(bgCss);
  const readablePrimary = ensureTextContrast(primaryColor, samples);
  for (const key of Object.keys(txt) as (keyof typeof txt)[]) {
    txt[key] = ensureTextContrast(txt[key], samples);
  }
  cssParts.push(`
    .diploma-container {
      max-width: 800px;
      width: 100%;
      margin: 0 auto;
      padding: ${padding};
      box-sizing: border-box;
      overflow: hidden;
      font-family: 'Georgia', 'Times New Roman', serif;
      color: ${txt.body};
      ${bgCss}
    }
  `);

  // Border — allow decorations to extend, container clips the outer edge
  const borderFn = borderStyles[dsl.border.style] || borderStyles['classical'];
  cssParts.push(borderFn(dsl.border.color || primaryColor));
  cssParts.push(`
    .diploma-border {
      overflow: visible;
      position: relative;
    }
  `);

  // Header
  const headerFn = headerStyles[dsl.header.style] || headerStyles['serif-centered'];
  cssParts.push(headerFn(primaryColor));

  // Body
  cssParts.push(`
    .diploma-body {
      text-align: center;
      margin: 1.2em 0;
    }
    .diploma-body .diploma-title {
      font-family: 'Georgia', serif;
      font-size: 32px;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 0.8em;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .diploma-body .diploma-pretext {
      font-size: 14px;
      color: ${txt.tertiary};
      margin-bottom: 0.5em;
      font-style: italic;
    }
    .diploma-body .diploma-recipient {
      font-family: 'Dancing Script', cursive;
      font-size: 36px;
      color: ${primaryColor};
      margin: 0.3em 0;
      border-bottom: 2px solid ${accentColor}40;
      display: inline-block;
      padding: 0 20px 4px;
    }
    .diploma-body .diploma-description {
      font-size: 15px;
      color: ${txt.secondary};
      max-width: 600px;
      margin: 1em auto;
      line-height: 1.6;
    }
    .diploma-body .diploma-course {
      font-size: 18px;
      font-weight: bold;
      color: ${primaryColor};
      margin: 0.5em 0;
    }
    .diploma-body .diploma-date {
      font-size: 13px;
      color: ${txt.muted};
      margin-top: 1em;
    }
    .diploma-body .diploma-fields {
      margin-top: 1em;
      font-size: 13px;
      color: ${txt.tertiary};
    }
    .diploma-body .diploma-fields .field-label {
      font-weight: bold;
      color: ${txt.secondary};
    }
  `);

  // Seal
  let sealHtml = '';
  if (dsl.seal && dsl.seal.style !== 'none') {
    const sealFn = sealStyles[dsl.seal.style] || sealStyles['classical-round'];
    const seal = sealFn(accentColor, dsl.seal.text);
    cssParts.push(seal.css);
    sealHtml = seal.html;

    const posMap: Record<string, string> = {
      'bottom-right': 'justify-content: flex-end;',
      'bottom-left': 'justify-content: flex-start;',
      'bottom-center': 'justify-content: center;',
      'top-right': 'justify-content: flex-end;',
    };
    cssParts.push(`
      .diploma-seal-wrapper {
        display: flex;
        ${posMap[dsl.seal.position] || 'justify-content: flex-end;'}
        margin-top: 1em;
      }
    `);
  }

  // Signature
  const sigFn = signatureStyles[dsl.signature.style] || signatureStyles['handwriting'];
  const sig = sigFn(dsl.signature.name, dsl.signature.title, primaryColor);
  cssParts.push(sig.css);

  // Footer
  cssParts.push(`
    .diploma-footer {
      text-align: center;
      margin-top: 1.5em;
      font-size: 10px;
      color: ${txt.faint};
    }
    .diploma-footer a {
      color: ${txt.faint};
      text-decoration: none;
    }
    .diploma-bottom-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 1.5em;
    }
    .diploma-bottom-row.no-seal {
      justify-content: center;
    }
  `);

  // Custom CSS
  // Styling cannot replace the curated background or bypass foreground AA.
  if (dsl.customCss) cssParts.push(dsl.customCss.replace(/(?:^|[;{])\s*(?:color|background(?:-color)?|opacity)\s*:[^;}]+/gi, match => match.startsWith('{') ? '{' : ';'));
  cssParts.push(`.diploma-container .diploma-body .diploma-title,.diploma-container .diploma-body .diploma-recipient,.diploma-container .diploma-body .diploma-course{color:${readablePrimary} !important}.diploma-container .diploma-body,.diploma-container .diploma-body *{opacity:1 !important;background:transparent !important;text-shadow:none !important}`);

  // Google Fonts import
  cssParts.unshift(`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');`);

  // ── Build HTML ──
  const htmlParts: string[] = [];

  htmlParts.push(`<div class="diploma-container">`);
  htmlParts.push(`<div class="diploma-border">`);

  // Header
  htmlParts.push(`<div class="diploma-header">`);
  htmlParts.push(`<div class="institution">${dsl.header.institutionName}</div>`);
  if (dsl.header.subtitle) htmlParts.push(`<div class="subtitle">${dsl.header.subtitle}</div>`);
  htmlParts.push(`</div>`);

  // Body
  htmlParts.push(`<div class="diploma-body">`);
  htmlParts.push(`<div class="diploma-title">${dsl.body.title}</div>`);
  if (dsl.body.preText) htmlParts.push(`<div class="diploma-pretext">${dsl.body.preText}</div>`);
  htmlParts.push(`<div class="diploma-recipient">${dsl.body.recipientName}</div>`);
  htmlParts.push(`<div class="diploma-description">${dsl.body.description}</div>`);
  if (dsl.body.courseOrProgram) htmlParts.push(`<div class="diploma-course">${dsl.body.courseOrProgram}</div>`);
  if (dsl.body.additionalFields?.length) {
    htmlParts.push(`<div class="diploma-fields">`);
    for (const f of dsl.body.additionalFields) {
      htmlParts.push(`<div><span class="field-label">${f.label}:</span> ${f.value}</div>`);
    }
    htmlParts.push(`</div>`);
  }
  if (dsl.body.date) htmlParts.push(`<div class="diploma-date">${dsl.body.date}</div>`);
  htmlParts.push(`</div>`);

  // Bottom row: signature + seal
  const hasSeal = sealHtml && dsl.seal?.style !== 'none';
  htmlParts.push(`<div class="diploma-bottom-row${hasSeal ? '' : ' no-seal'}">`);
  htmlParts.push(sig.html);
  if (hasSeal) {
    htmlParts.push(`<div class="diploma-seal-wrapper">${sealHtml}</div>`);
  }
  htmlParts.push(`</div>`);

  // Footer
  if (dsl.footer) {
    htmlParts.push(`<div class="diploma-footer">`);
    if (dsl.footer.additionalText) htmlParts.push(`<div>${dsl.footer.additionalText}</div>`);
    if (dsl.footer.verificationUrl) htmlParts.push(`<div><a href="${dsl.footer.verificationUrl}">Verify: ${dsl.footer.diplomaId || ''}</a></div>`);
    htmlParts.push(`</div>`);
  }

  htmlParts.push(`</div>`); // border
  htmlParts.push(`</div>`); // container

  return {
    html: htmlParts.join('\n'),
    css: cssParts.join('\n'),
  };
}
