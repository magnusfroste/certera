// SINGLE SOURCE OF TRUTH for DSL → HTML/CSS rendering.
// Imported by BOTH the generate-diploma edge function (Deno) and the client
// (Vite) so a template preview, a template pick, and any later AI edit all
// render through the exact same code — no font/style shift between them.
// Pure TypeScript: no Deno or browser APIs, relative imports only.

// Escape user/model-provided strings before interpolating into diploma HTML.
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface DiplomaDSL {
  palette?: string;
  typography?: { pair?: string };
  layout?: { orientation?: string; padding?: string; composition?: string };
  decorations?: string[];
  header?: { style?: string; institutionName?: string; subtitle?: string };
  border?: { style?: string; color?: string };
  body?: {
    title?: string;
    preText?: string;
    recipientName?: string;
    description?: string;
    date?: string;
    courseOrProgram?: string;
    additionalFields?: { label?: string; value?: string }[];
  };
  seal?: { style?: string; position?: string; text?: string };
  signature?: { style?: string; name?: string; title?: string };
  footer?: { additionalText?: string; verificationUrl?: string };
  brand?: { primaryColor?: string; accentColor?: string };
  background?: { style?: string };
  customCss?: string;
}

// ─────────────────────────────────────────────────────────────────
// 1. PALETTES (curated, kontrast-garanterad)
// ─────────────────────────────────────────────────────────────────
export const PALETTES: Record<string, { bg: string; primary: string; accent: string; text: string }> = {
  'midnight-gold':       { bg: 'cosmic-dark',      primary: '#f0e6d3', accent: '#c6a961', text: 'light' },
  'royal-burgundy':      { bg: 'royal-burgundy',   primary: '#3b0d0d', accent: '#c6a961', text: 'dark'  },
  'ocean-brass':         { bg: 'ocean-deep',       primary: '#0c2340', accent: '#c9a84c', text: 'dark'  },
  'forest-cream':        { bg: 'botanical-green',  primary: '#1a3c2a', accent: '#8b7355', text: 'dark'  },
  'ivory-navy':          { bg: 'ivory',            primary: '#0f1b3d', accent: '#c9a84c', text: 'dark'  },
  'parchment-burgundy':  { bg: 'parchment',        primary: '#5b2c20', accent: '#8b6f5e', text: 'dark'  },
  'arctic-steel':        { bg: 'clean-white',      primary: '#2d3748', accent: '#3b6fa0', text: 'dark'  },
  'vintage-sepia':       { bg: 'vintage-sepia',    primary: '#2d1b00', accent: '#8b6f5e', text: 'dark'  },
  'watercolor-romance':  { bg: 'watercolor-soft',  primary: '#4a1942', accent: '#c45c7c', text: 'dark'  },
  'minimal-mono':        { bg: 'clean-white',      primary: '#0a0a0a', accent: '#525252', text: 'dark'  },
  'marble-emerald':      { bg: 'marble',           primary: '#064e3b', accent: '#c9a84c', text: 'dark'  },
  'linen-charcoal':      { bg: 'linen',            primary: '#1a1a1a', accent: '#6b3a2a', text: 'dark'  },
  'cosmic-cyan':         { bg: 'cosmic-dark',      primary: '#e0f2fe', accent: '#67e8f9', text: 'light' },
  'desert-clay':         { bg: 'gradient-warm',    primary: '#5c2018', accent: '#c17c74', text: 'dark'  },
  'coastal-fresh':       { bg: 'gradient-cool',    primary: '#0c2340', accent: '#2d8a9e', text: 'dark'  },
  'editorial-rose':      { bg: 'watercolor-soft',  primary: '#1a1a1a', accent: '#c45c7c', text: 'dark'  },
};

// ─────────────────────────────────────────────────────────────────
// 2. TYPOGRAPHY PAIRS (heading + body + script)
// ─────────────────────────────────────────────────────────────────
export const TYPOGRAPHY: Record<string, { heading: string; body: string; script: string; gfont: string }> = {
  'serif-classic': {
    heading: "'Playfair Display', Georgia, serif", body: "'Lora', Georgia, serif", script: "'Dancing Script', cursive",
    gfont: 'family=Playfair+Display:wght@700;900&family=Lora:wght@400;500&family=Dancing+Script:wght@700',
  },
  'sans-modern': {
    heading: "'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", script: "'Caveat', cursive",
    gfont: 'family=Inter:wght@300;400;700;900&family=Caveat:wght@700',
  },
  'display-editorial': {
    heading: "'Bodoni Moda', serif", body: "'Source Serif Pro', Georgia, serif", script: "'Italianno', cursive",
    gfont: 'family=Bodoni+Moda:wght@700;900&family=Source+Serif+Pro:wght@400;600&family=Italianno',
  },
  'script-romantic': {
    heading: "'Cormorant Garamond', serif", body: "'Karla', sans-serif", script: "'Great Vibes', cursive",
    gfont: 'family=Cormorant+Garamond:wght@500;700&family=Karla:wght@400;600&family=Great+Vibes',
  },
  'mono-tech': {
    heading: "'JetBrains Mono', monospace", body: "'Inter', sans-serif", script: "'Caveat', cursive",
    gfont: 'family=JetBrains+Mono:wght@600;800&family=Inter:wght@400;500&family=Caveat:wght@700',
  },
  'mixed-contrast': {
    heading: "'Archivo Black', sans-serif", body: "'Hind', sans-serif", script: "'Pacifico', cursive",
    gfont: 'family=Archivo+Black&family=Hind:wght@400;600&family=Pacifico',
  },
};

// ─────────────────────────────────────────────────────────────────
// 3. COMPOSITIONS (struktural layout)
// ─────────────────────────────────────────────────────────────────
type Composition = 'classic-stack' | 'banner-top' | 'medallion-center' | 'split-horizontal' | 'corner-accent';

function compositionCss(comp: Composition, primary: string, accent: string): string {
  switch (comp) {
    case 'banner-top':
      return `.comp-banner .diploma-header{margin:-1em -1em 1.2em -1em;padding:1.2em;background:${primary};border-radius:2px 2px 0 0}.comp-banner .diploma-header .institution,.comp-banner .diploma-header .subtitle{color:#fff !important}.comp-banner .diploma-header .subtitle{opacity:.85}`;
    case 'medallion-center':
      return `.comp-medallion .diploma-bottom-row{flex-direction:column;align-items:center;gap:1em}.comp-medallion .diploma-seal-wrapper{justify-content:center !important;order:-1;margin-top:0;margin-bottom:.5em}`;
    case 'split-horizontal':
      return `.comp-split{display:grid;grid-template-columns:1fr 2fr;gap:2em;align-items:center}.comp-split .diploma-header{text-align:left;border-right:2px solid ${accent}40;padding-right:1.5em;margin-bottom:0}.comp-split .diploma-header .institution{text-align:left}.comp-split-content{display:flex;flex-direction:column;gap:.5em}`;
    case 'corner-accent':
      // Inset from the edge so the container's overflow:hidden never clips it
      return `.comp-corner{position:relative}.comp-corner::before{content:'';position:absolute;top:14px;left:14px;width:60px;height:60px;border-top:4px solid ${accent};border-left:4px solid ${accent}}.comp-corner::after{content:'';position:absolute;bottom:14px;right:14px;width:60px;height:60px;border-bottom:4px solid ${accent};border-right:4px solid ${accent}}`;
    case 'classic-stack':
    default:
      return '';
  }
}

// ─────────────────────────────────────────────────────────────────
// 4. DECORATIONS (overlay-lager, max 2)
// ─────────────────────────────────────────────────────────────────
function decorationCss(decos: string[], primary: string, accent: string): string {
  const out: string[] = [];
  for (const d of decos.slice(0, 2)) {
    switch (d) {
      case 'corner-flourishes':
        out.push(`.deco-flourish{position:relative}.deco-flourish .diploma-border::before{content:'❦';position:absolute;top:14px;left:18px;color:${accent};opacity:.75;font-size:20px;z-index:2}.deco-flourish .diploma-border::after{content:'❦';position:absolute;bottom:14px;right:18px;color:${accent};opacity:.75;font-size:20px;transform:rotate(180deg);z-index:2}`);
        break;
      case 'watermark-monogram':
        out.push(`.deco-watermark .diploma-body{position:relative}.deco-watermark .diploma-body::before{content:'★';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:280px;color:${primary};opacity:.04;pointer-events:none;z-index:0}.deco-watermark .diploma-body>*{position:relative;z-index:1}`);
        break;
      case 'ribbon-banner':
        out.push(`.deco-ribbon{position:relative;overflow:hidden}.deco-ribbon::before{content:'EST.';position:absolute;top:18px;right:-40px;background:${accent};color:#fff;padding:4px 50px;font-size:11px;font-weight:bold;letter-spacing:3px;transform:rotate(45deg);z-index:3}`);
        break;
      case 'guilloche-pattern':
        out.push(`.deco-guilloche{background-image:repeating-radial-gradient(circle at 0 0,transparent 0,${primary}08 1px,transparent 2px,transparent 18px),repeating-radial-gradient(circle at 100% 100%,transparent 0,${accent}08 1px,transparent 2px,transparent 18px)}`);
        break;
      case 'laurel-side':
        out.push(`.deco-laurel .diploma-body{position:relative;padding:0 56px}.deco-laurel .diploma-body::before,.deco-laurel .diploma-body::after{content:'❧';position:absolute;top:50%;transform:translateY(-50%);color:${accent};font-size:32px;opacity:.3}.deco-laurel .diploma-body::before{left:8px;transform:translateY(-50%) scaleX(-1)}.deco-laurel .diploma-body::after{right:8px}`);
        break;
      case 'subtle-grid':
        out.push(`.deco-grid{background-image:linear-gradient(${primary}06 1px,transparent 1px),linear-gradient(90deg,${primary}06 1px,transparent 1px);background-size:24px 24px}`);
        break;
    }
  }
  return out.join('\n');
}

// ─────────────────────────────────────────────────────────────────
// 5. BACKGROUNDS / BORDERS / HEADERS / SEALS / SIGNATURES
// ─────────────────────────────────────────────────────────────────
export const BG_STYLES: Record<string, string> = {
  'parchment': 'background: linear-gradient(135deg, #f5f0e8 0%, #e8dcc8 50%, #f0e6d3 100%);',
  'clean-white': 'background: #ffffff;',
  'ivory': 'background: linear-gradient(180deg, #fffff8 0%, #faf6ee 100%);',
  'gradient-warm': 'background: linear-gradient(145deg, #fdf8f0 0%, #f5ebe0 40%, #faf0e4 100%);',
  'gradient-cool': 'background: linear-gradient(145deg, #f0f4f8 0%, #e2e8f0 40%, #edf2f7 100%);',
  'linen': 'background: #faf0e6; background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px);',
  'marble': 'background: linear-gradient(135deg, #f5f5f5 0%, #ececec 25%, #f8f8f8 50%, #e8e8e8 75%, #f5f5f5 100%);',
  'ocean-deep': 'background: linear-gradient(180deg, #e8f4f8 0%, #b8d8e8 30%, #a0c8d8 60%, #d4eaf0 100%);',
  'cosmic-dark': 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%);',
  'botanical-green': 'background: linear-gradient(160deg, #f0f7f0 0%, #dcedc8 30%, #e8f5e0 60%, #f5faf0 100%);',
  'vintage-sepia': 'background: linear-gradient(135deg, #f5e6d0 0%, #e8d5b5 30%, #f0dfc5 60%, #eddcc0 100%);',
  'watercolor-soft': 'background: linear-gradient(135deg, #fce4ec 0%, #e8eaf6 25%, #e0f7fa 50%, #f3e5f5 75%, #fff3e0 100%);',
  'royal-burgundy': 'background: linear-gradient(145deg, #f8e8e8 0%, #f0d0d0 30%, #e8c0c0 60%, #f5dada 100%);',
};

function getBorderCss(style: string, color: string): string {
  const styles: Record<string, string> = {
    'ornamental': `.diploma-border{border:3px solid ${color};outline:1px solid ${color};outline-offset:6px;position:relative}.diploma-border::before{content:'';position:absolute;top:8px;left:8px;right:8px;bottom:8px;border:1px solid ${color}40}`,
    'double-line': `.diploma-border{border:3px double ${color};padding:4px;outline:1px solid ${color}60;outline-offset:4px}`,
    'modern': `.diploma-border{border:2px solid ${color};border-radius:4px}`,
    'minimal': `.diploma-border{border:1px solid ${color}40}`,
    'classical': `.diploma-border{border:4px solid ${color};box-shadow:inset 0 0 0 2px white,inset 0 0 0 4px ${color}30}`,
    'art-deco': `.diploma-border{border:2px solid ${color};position:relative}.diploma-border::before,.diploma-border::after{content:'';position:absolute;width:40px;height:40px;border:2px solid ${color}}.diploma-border::before{top:8px;left:8px;border-right:none;border-bottom:none}.diploma-border::after{bottom:8px;right:8px;border-left:none;border-top:none}`,
    'wave': `.diploma-border{border:2px solid ${color};border-radius:8px;box-shadow:0 0 0 4px ${color}15,0 0 0 8px ${color}10,0 0 0 12px ${color}05}`,
    'none': '.diploma-border{}',
  };
  return styles[style] || styles['classical'];
}

function getHeaderCss(style: string, color: string, headingFont: string): string {
  const map: Record<string, string> = {
    'serif-centered':  `.diploma-header{text-align:center;margin-bottom:1.5em}.diploma-header .institution{font-family:${headingFont};font-size:28px;font-weight:bold;color:${color};letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}.diploma-header .subtitle{font-family:${headingFont};font-size:14px;color:${color}99;font-style:italic}`,
    'modern-left':     `.diploma-header{text-align:left;margin-bottom:1.5em;border-left:4px solid ${color};padding-left:16px}.diploma-header .institution{font-family:${headingFont};font-size:24px;font-weight:700;color:${color}}.diploma-header .subtitle{font-size:13px;color:#666;margin-top:2px}`,
    'elegant-script': `.diploma-header{text-align:center;margin-bottom:1.5em}.diploma-header .institution{font-family:${headingFont};font-size:36px;color:${color}}.diploma-header .subtitle{font-size:13px;color:${color}80;letter-spacing:2px;text-transform:uppercase;margin-top:4px}`,
    'bold-caps':       `.diploma-header{text-align:center;margin-bottom:1.5em}.diploma-header .institution{font-family:${headingFont};font-size:32px;font-weight:bold;color:${color};letter-spacing:6px;text-transform:uppercase}.diploma-header .subtitle{font-size:12px;color:${color}70;letter-spacing:4px;text-transform:uppercase;margin-top:6px}`,
    'minimal':         `.diploma-header{text-align:center;margin-bottom:1.5em}.diploma-header .institution{font-family:${headingFont};font-size:20px;font-weight:300;color:${color};letter-spacing:4px;text-transform:uppercase}.diploma-header .subtitle{font-size:12px;color:#999;margin-top:4px}`,
    'monumental':      `.diploma-header{text-align:center;margin-bottom:1.5em}.diploma-header .institution{font-family:${headingFont};font-size:38px;font-weight:bold;color:${color};letter-spacing:10px;text-transform:uppercase;border-bottom:3px double ${color};padding-bottom:8px;display:inline-block}.diploma-header .subtitle{font-size:13px;color:${color}80;letter-spacing:6px;text-transform:uppercase;margin-top:10px}`,
  };
  return map[style] || map['serif-centered'];
}

function getSealHtmlCss(style: string, color: string, text?: string): {html:string;css:string} {
  if (!style || style === 'none') return {html:'',css:''};
  // Seals are small — keep to a single short token so text never overflows the
  // shape or collides with the wreath flanks (e.g. "GREENERY SEAL" → "GREENERY").
  const firstWord = (text || 'VERIFIED').trim().split(/\s+/)[0].slice(0, 10);
  const t = esc(firstWord || 'VERIFIED');
  const map: Record<string, {html:string;css:string}> = {
    'classical-round': {css:`.diploma-seal{width:80px;height:80px;border:3px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}.diploma-seal::before{content:'';position:absolute;width:70px;height:70px;border:1px solid ${color}60;border-radius:50%}.diploma-seal .seal-text{font-size:9px;font-weight:bold;color:${color};letter-spacing:1px;text-transform:uppercase;max-width:60px;text-align:center;line-height:1.15;word-break:break-word}`,html:`<div class="diploma-seal"><span class="seal-text">${t}</span></div>`},
    'star': {css:`.diploma-seal{width:80px;height:80px;background:${color};clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);display:flex;align-items:center;justify-content:center;color:white;font-size:20px}`,html:`<div class="diploma-seal">★</div>`},
    'shield': {css:`.diploma-seal{width:70px;height:85px;background:${color};clip-path:polygon(0% 0%,100% 0%,100% 70%,50% 100%,0% 70%);display:flex;align-items:center;justify-content:center;padding-bottom:10px}.diploma-seal .seal-text{color:white;font-size:8px;font-weight:bold;letter-spacing:1px;text-transform:uppercase}`,html:`<div class="diploma-seal"><span class="seal-text">${t}</span></div>`},
    'ribbon': {css:`.diploma-seal{background:${color};color:white;padding:6px 24px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;position:relative}.diploma-seal::before,.diploma-seal::after{content:'';position:absolute;bottom:-8px;border:8px solid ${color};border-bottom-color:transparent}.diploma-seal::before{left:0;border-left-color:transparent}.diploma-seal::after{right:0;border-right-color:transparent}`,html:`<div class="diploma-seal">CERTIFIED</div>`},
    'modern-circle': {css:`.diploma-seal{width:60px;height:60px;border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;color:${color}}`,html:`<div class="diploma-seal">✓</div>`},
    'rosette': {css:`.diploma-seal{width:80px;height:80px;background:radial-gradient(circle,${color} 30%,transparent 31%),conic-gradient(from 0deg,${color}20,${color}60,${color}20,${color}60,${color}20,${color}60,${color}20,${color}60,${color}20,${color}60,${color}20,${color}60);border-radius:50%;display:flex;align-items:center;justify-content:center}.diploma-seal .seal-text{color:white;font-size:9px;font-weight:bold;letter-spacing:1px}`,html:`<div class="diploma-seal"><span class="seal-text">AWARD</span></div>`},
    'compass': {css:`.diploma-seal{width:80px;height:80px;border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}.diploma-seal::before{content:'';position:absolute;width:60px;height:60px;border:1px solid ${color}40;transform:rotate(45deg)}.diploma-seal .seal-text{font-size:11px;font-weight:bold;color:${color};max-width:54px;text-align:center;line-height:1.15;letter-spacing:1px;text-transform:uppercase;word-break:break-word}`,html:`<div class="diploma-seal"><span class="seal-text">${t}</span></div>`},
    'laurel-wreath': {css:`.diploma-seal{width:112px;height:88px;display:flex;align-items:center;justify-content:center;position:relative}.diploma-seal::before{content:'❧';position:absolute;left:0;top:50%;transform:translateY(-50%) scaleX(-1);color:${color};opacity:.8;font-size:26px}.diploma-seal::after{content:'❧';position:absolute;right:0;top:50%;transform:translateY(-50%);color:${color};opacity:.8;font-size:26px}.diploma-seal .seal-text{max-width:60px;text-align:center;white-space:nowrap;font-size:8px;font-weight:bold;color:${color};letter-spacing:1px;text-transform:uppercase;line-height:1.2;border-top:1px solid ${color}40;border-bottom:1px solid ${color}40;padding:3px 0}`,html:`<div class="diploma-seal"><span class="seal-text">${t}</span></div>`},
  };
  return map[style] || map['classical-round'];
}

function getSignatureHtmlCss(style: string, rawName: string, rawTitle: string | undefined, color: string, scriptFont: string, headingFont: string): {html:string;css:string} {
  const name = esc(rawName);
  const title = rawTitle ? esc(rawTitle) : undefined;
  const map: Record<string, {html:string;css:string}> = {
    'handwriting': {css:`.diploma-signature{text-align:center}.diploma-signature .sig-name{font-family:${scriptFont};font-size:28px;color:${color};border-bottom:1px solid ${color}40;padding-bottom:4px;display:inline-block}.diploma-signature .sig-title{font-size:11px;color:#888;margin-top:4px}`,html:`<div class="diploma-signature"><div class="sig-name">${name}</div>${title?`<div class="sig-title">${title}</div>`:''}</div>`},
    'formal': {css:`.diploma-signature{text-align:center}.diploma-signature .sig-line{width:200px;border-bottom:1px solid ${color};margin:0 auto 6px}.diploma-signature .sig-name{font-family:${headingFont};font-size:16px;color:${color};font-weight:bold}.diploma-signature .sig-title{font-size:11px;color:#888;margin-top:2px}`,html:`<div class="diploma-signature"><div class="sig-line"></div><div class="sig-name">${name}</div>${title?`<div class="sig-title">${title}</div>`:''}</div>`},
    'elegant': {css:`.diploma-signature{text-align:center}.diploma-signature .sig-name{font-family:${scriptFont};font-size:32px;color:${color}}.diploma-signature .sig-title{font-family:${headingFont};font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;margin-top:2px}`,html:`<div class="diploma-signature"><div class="sig-name">${name}</div>${title?`<div class="sig-title">${title}</div>`:''}</div>`},
    'stamp': {css:`.diploma-signature{text-align:center}.diploma-signature .sig-stamp{display:inline-block;border:3px solid ${color};border-radius:4px;padding:6px 18px;transform:rotate(-3deg)}.diploma-signature .sig-name{font-family:${headingFont};font-size:14px;font-weight:bold;color:${color};letter-spacing:3px;text-transform:uppercase}.diploma-signature .sig-title{font-size:10px;color:${color}80;letter-spacing:1px;text-transform:uppercase;margin-top:2px}`,html:`<div class="diploma-signature"><div class="sig-stamp"><div class="sig-name">${name}</div>${title?`<div class="sig-title">${title}</div>`:''}</div></div>`},
    'digital': {css:`.diploma-signature{text-align:center}.diploma-signature .sig-digital{display:inline-flex;align-items:center;gap:8px;background:${color}08;border:1px solid ${color}20;border-radius:6px;padding:8px 16px}.diploma-signature .sig-icon{font-size:18px;color:${color}}.diploma-signature .sig-info{text-align:left}.diploma-signature .sig-name{font-family:${headingFont};font-size:14px;font-weight:600;color:${color}}.diploma-signature .sig-title{font-size:10px;color:#888;margin-top:1px}.diploma-signature .sig-verified{font-size:9px;color:${color}90;letter-spacing:1px;text-transform:uppercase;margin-top:2px}`,html:`<div class="diploma-signature"><div class="sig-digital"><span class="sig-icon">🔏</span><div class="sig-info"><div class="sig-name">${name}</div>${title?`<div class="sig-title">${title}</div>`:''}<div class="sig-verified">Digitally signed</div></div></div></div>`},
  };
  return map[style] || map['handwriting'];
}

// ─────────────────────────────────────────────────────────────────
// 6. customCss SANITIZER (whitelist properties)
// ─────────────────────────────────────────────────────────────────
const ALLOWED_PROPS = new Set([
  'color','background','background-color','letter-spacing','font-weight','font-style',
  'font-size','text-transform','opacity','margin','margin-top','margin-bottom',
  'padding','padding-top','padding-bottom','line-height','text-align','border-color',
]);
function sanitizeCustomCss(css: string): string {
  if (!css || typeof css !== 'string' || css.length > 2000) return '';
  // Strip @import, @keyframes, url(), expression(), JS schemes
  const stripped = css.replace(/@(import|keyframes|font-face|media|supports)[^{]*\{[^}]*\}/gi,'')
                      .replace(/url\s*\([^)]*\)/gi,'')
                      .replace(/expression\s*\([^)]*\)/gi,'')
                      .replace(/javascript:/gi,'');
  // Only keep declarations whose property is whitelisted
  return stripped.replace(/([^{}]+)\{([^{}]+)\}/g, (_m, sel, body) => {
    const cleanBody = body.split(';').map((d: string) => {
      const idx = d.indexOf(':');
      if (idx < 0) return '';
      const prop = d.slice(0, idx).trim().toLowerCase().replace(/^!\s*/, '');
      return ALLOWED_PROPS.has(prop) ? d.trim() : '';
    }).filter(Boolean).join(';');
    return cleanBody ? `${sel}{${cleanBody}}` : '';
  });
}

// ─────────────────────────────────────────────────────────────────
// 7. RENDER
// ─────────────────────────────────────────────────────────────────
export function renderDSL(dsl: DiplomaDSL): {html:string;css:string} {
  // Palette resolution
  const paletteId = dsl.palette || 'ivory-navy';
  const palette = PALETTES[paletteId] || PALETTES['ivory-navy'];
  // Colors are interpolated into CSS — only accept hex values
  const safeColor = (c: unknown, fallback: string): string =>
    typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fallback;
  const pc = safeColor(dsl.brand?.primaryColor, palette.primary);
  const ac = safeColor(dsl.brand?.accentColor, palette.accent);
  const bgKey = dsl.background?.style || palette.bg;
  const bgCss = BG_STYLES[bgKey] || BG_STYLES['clean-white'];
  const isLight = palette.text === 'light';

  // Typography
  const typId = dsl.typography?.pair || 'serif-classic';
  const typ = TYPOGRAPHY[typId] || TYPOGRAPHY['serif-classic'];

  // Layout
  const PADDINGS: Record<string, string> = { compact: '24px', normal: '40px', spacious: '60px' };
  const pad = PADDINGS[dsl.layout?.padding ?? ''] || '40px';
  const composition: Composition = (dsl.layout?.composition as Composition) || 'classic-stack';
  const COMP_CLASSES: Record<string, string> = {
    'classic-stack':'',
    'banner-top':'comp-banner',
    'medallion-center':'comp-medallion',
    'split-horizontal':'comp-split',
    'corner-accent':'comp-corner',
  };
  const compClass = COMP_CLASSES[composition] || '';

  // Decorations
  const DECO_CLASSES: Record<string, string> = {
    'corner-flourishes':'deco-flourish',
    'watermark-monogram':'deco-watermark',
    'ribbon-banner':'deco-ribbon',
    'guilloche-pattern':'deco-guilloche',
    'laurel-side':'deco-laurel',
    'subtle-grid':'deco-grid',
  };
  const decos: string[] = Array.isArray(dsl.decorations) ? dsl.decorations.slice(0,2) : [];
  const decoClasses = decos.map(d => DECO_CLASSES[d]).filter(Boolean).join(' ');

  // Text colors (adaptive)
  const t = isLight
    ? { body:'#ddd', sec:'#ccc', ter:'#aaa', mut:'#999', fnt:'#888' }
    : { body:'#333', sec:'#555', ter:'#666', mut:'#888', fnt:'#aaa' };

  const cssParts = [
    `@import url('https://fonts.googleapis.com/css2?${typ.gfont}&display=swap');`,
    `.diploma-container{max-width:800px;width:100%;margin:0 auto;padding:${pad};box-sizing:border-box;overflow:hidden;font-family:${typ.body};color:${t.body};${bgCss}}`,
    getBorderCss(dsl.border?.style || 'classical', safeColor(dsl.border?.color, pc)),
    `.diploma-border{overflow:visible;position:relative}`,
    getHeaderCss(dsl.header?.style || 'serif-centered', pc, typ.heading),
    `.diploma-body{text-align:center;margin:1.2em 0}.diploma-body .diploma-title{font-family:${typ.heading};font-size:32px;font-weight:bold;color:${pc};margin-bottom:0.8em;letter-spacing:2px;text-transform:uppercase}.diploma-body .diploma-pretext{font-family:${typ.body};font-size:14px;color:${t.ter};margin-bottom:0.5em;font-style:italic}.diploma-body .diploma-recipient{font-family:${typ.script};font-size:42px;color:${pc};margin:0.3em 0;border-bottom:2px solid ${ac}40;display:inline-block;padding:0 20px 4px}.diploma-body .diploma-description{font-family:${typ.body};font-size:15px;color:${t.sec};max-width:600px;margin:1em auto;line-height:1.6}.diploma-body .diploma-course{font-family:${typ.heading};font-size:18px;font-weight:bold;color:${pc};margin:0.5em 0}.diploma-body .diploma-date{font-size:13px;color:${t.mut};margin-top:1em}.diploma-body .diploma-fields{margin-top:1em;font-size:13px;color:${t.ter}}.diploma-body .diploma-fields .field-label{font-weight:bold;color:${t.sec}}`,
    compositionCss(composition, pc, ac),
    decorationCss(decos, pc, ac),
  ];

  const seal = getSealHtmlCss(dsl.seal?.style || 'none', ac, dsl.seal?.text);
  if (seal.css) cssParts.push(seal.css);
  if (dsl.seal && dsl.seal.style !== 'none') {
    const SEAL_POSITIONS: Record<string, string> = {
      'bottom-right':'justify-content:flex-end',
      'bottom-left':'justify-content:flex-start',
      'bottom-center':'justify-content:center',
    };
    const pos = SEAL_POSITIONS[dsl.seal.position ?? ''] || 'justify-content:flex-end';
    cssParts.push(`.diploma-seal-wrapper{display:flex;${pos};margin-top:1em}`);
  }

  const sig = getSignatureHtmlCss(dsl.signature?.style||'handwriting', dsl.signature?.name||'Mr Diploma', dsl.signature?.title, pc, typ.script, typ.heading);
  cssParts.push(sig.css);
  cssParts.push(`.diploma-footer{text-align:center;margin-top:1.5em;font-size:10px;color:${t.fnt}}.diploma-footer a{color:${t.fnt};text-decoration:none}.diploma-bottom-row{display:flex;align-items:flex-end;justify-content:space-between;margin-top:1.5em}.diploma-bottom-row.no-seal{justify-content:center}`);

  const cleanCustom = sanitizeCustomCss(dsl.customCss || '');
  if (cleanCustom) cssParts.push(cleanCustom);

  // Build HTML (all model/user-provided text is escaped)
  const hasSeal = !!seal.html && dsl.seal?.style !== 'none';
  const fields = (dsl.body?.additionalFields||[]).map(f=>`<div><span class="field-label">${esc(f.label)}:</span> ${esc(f.value)}</div>`).join('');
  const wrapperClasses = ['diploma-container', compClass, decoClasses].filter(Boolean).join(' ');

  const headerHtml = `<div class="diploma-header"><div class="institution">${esc(dsl.header?.institutionName||'Institution')}</div>${dsl.header?.subtitle?`<div class="subtitle">${esc(dsl.header.subtitle)}</div>`:''}</div>`;
  const bodyHtml = `<div class="diploma-body"><div class="diploma-title">${esc(dsl.body?.title||'Certificate')}</div>${dsl.body?.preText?`<div class="diploma-pretext">${esc(dsl.body.preText)}</div>`:''}<div class="diploma-recipient">${esc(dsl.body?.recipientName||'Recipient Name')}</div><div class="diploma-description">${esc(dsl.body?.description||'')}</div>${dsl.body?.courseOrProgram?`<div class="diploma-course">${esc(dsl.body.courseOrProgram)}</div>`:''}${fields?`<div class="diploma-fields">${fields}</div>`:''}${dsl.body?.date?`<div class="diploma-date">${esc(dsl.body.date)}</div>`:''}</div>`;
  const bottomHtml = `<div class="diploma-bottom-row${hasSeal?'':' no-seal'}">${sig.html}${hasSeal?`<div class="diploma-seal-wrapper">${seal.html}</div>`:''}</div>`;
  const verifyHref = /^https?:\/\//i.test(dsl.footer?.verificationUrl ?? '') ? esc(dsl.footer!.verificationUrl) : '';
  const footerHtml = dsl.footer?`<div class="diploma-footer">${dsl.footer.additionalText?`<div>${esc(dsl.footer.additionalText)}</div>`:''}${verifyHref?`<div><a href="${verifyHref}">Verify</a></div>`:''}</div>`:'';

  const inner = composition === 'split-horizontal'
    ? `${headerHtml}<div class="comp-split-content">${bodyHtml}${bottomHtml}${footerHtml}</div>`
    : `${headerHtml}${bodyHtml}${bottomHtml}${footerHtml}`;

  const html = `<div class="${wrapperClasses}"><div class="diploma-border">${inner}</div></div>`;

  return { html, css: cssParts.join('\n') };
}

export const PALETTE_IDS = Object.keys(PALETTES);
export const TYPOGRAPHY_IDS = Object.keys(TYPOGRAPHY);
