import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Escape user/model-provided strings before interpolating into diploma HTML.
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Shared request/DSL types ──
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: string; media_type: string; data: string } };

interface AIMessage {
  role: string;
  content: string | ContentPart[];
}

interface DiplomaDSL {
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
const PALETTES: Record<string, { bg: string; primary: string; accent: string; text: string }> = {
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
const TYPOGRAPHY: Record<string, { heading: string; body: string; script: string; gfont: string }> = {
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
      return `.comp-corner{position:relative}.comp-corner::before{content:'';position:absolute;top:0;left:0;width:80px;height:80px;border-top:6px solid ${accent};border-left:6px solid ${accent}}.comp-corner::after{content:'';position:absolute;bottom:0;right:0;width:80px;height:80px;border-bottom:6px solid ${accent};border-right:6px solid ${accent}}`;
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
        out.push(`.deco-flourish{position:relative}.deco-flourish .diploma-border::before{content:'❦';position:absolute;top:6px;left:10px;color:${accent};font-size:22px;z-index:2}.deco-flourish .diploma-border::after{content:'❦';position:absolute;bottom:6px;right:10px;color:${accent};font-size:22px;transform:rotate(180deg);z-index:2}`);
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
        out.push(`.deco-laurel .diploma-body{position:relative;padding:0 60px}.deco-laurel .diploma-body::before,.deco-laurel .diploma-body::after{content:'❧';position:absolute;top:50%;transform:translateY(-50%);color:${accent};font-size:48px;opacity:.5}.deco-laurel .diploma-body::before{left:0;transform:translateY(-50%) scaleX(-1)}.deco-laurel .diploma-body::after{right:0}`);
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
const BG_STYLES: Record<string, string> = {
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
  const t = esc(text || 'VERIFIED');
  const map: Record<string, {html:string;css:string}> = {
    'classical-round': {css:`.diploma-seal{width:80px;height:80px;border:3px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}.diploma-seal::before{content:'';position:absolute;width:70px;height:70px;border:1px solid ${color}60;border-radius:50%}.diploma-seal .seal-text{font-size:9px;font-weight:bold;color:${color};letter-spacing:2px;text-transform:uppercase}`,html:`<div class="diploma-seal"><span class="seal-text">${t}</span></div>`},
    'star': {css:`.diploma-seal{width:80px;height:80px;background:${color};clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);display:flex;align-items:center;justify-content:center;color:white;font-size:20px}`,html:`<div class="diploma-seal">★</div>`},
    'shield': {css:`.diploma-seal{width:70px;height:85px;background:${color};clip-path:polygon(0% 0%,100% 0%,100% 70%,50% 100%,0% 70%);display:flex;align-items:center;justify-content:center;padding-bottom:10px}.diploma-seal .seal-text{color:white;font-size:8px;font-weight:bold;letter-spacing:1px;text-transform:uppercase}`,html:`<div class="diploma-seal"><span class="seal-text">${t}</span></div>`},
    'ribbon': {css:`.diploma-seal{background:${color};color:white;padding:6px 24px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;position:relative}.diploma-seal::before,.diploma-seal::after{content:'';position:absolute;bottom:-8px;border:8px solid ${color};border-bottom-color:transparent}.diploma-seal::before{left:0;border-left-color:transparent}.diploma-seal::after{right:0;border-right-color:transparent}`,html:`<div class="diploma-seal">CERTIFIED</div>`},
    'modern-circle': {css:`.diploma-seal{width:60px;height:60px;border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;color:${color}}`,html:`<div class="diploma-seal">✓</div>`},
    'rosette': {css:`.diploma-seal{width:80px;height:80px;background:radial-gradient(circle,${color} 30%,transparent 31%),conic-gradient(from 0deg,${color}20,${color}60,${color}20,${color}60,${color}20,${color}60,${color}20,${color}60,${color}20,${color}60,${color}20,${color}60);border-radius:50%;display:flex;align-items:center;justify-content:center}.diploma-seal .seal-text{color:white;font-size:9px;font-weight:bold;letter-spacing:1px}`,html:`<div class="diploma-seal"><span class="seal-text">AWARD</span></div>`},
    'compass': {css:`.diploma-seal{width:80px;height:80px;border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}.diploma-seal::before{content:'';position:absolute;width:60px;height:60px;border:1px solid ${color}40;transform:rotate(45deg)}.diploma-seal .seal-text{font-size:18px;font-weight:bold;color:${color}}`,html:`<div class="diploma-seal"><span class="seal-text">${t}</span></div>`},
    'laurel-wreath': {css:`.diploma-seal{width:90px;height:90px;display:flex;align-items:center;justify-content:center;position:relative}.diploma-seal::before{content:'❧';position:absolute;left:2px;top:50%;transform:translateY(-50%) scaleX(-1);color:${color};font-size:32px}.diploma-seal::after{content:'❧';position:absolute;right:2px;top:50%;transform:translateY(-50%);color:${color};font-size:32px}.diploma-seal .seal-text{font-size:9px;font-weight:bold;color:${color};letter-spacing:2px;text-transform:uppercase;border-top:1px solid ${color}40;border-bottom:1px solid ${color}40;padding:4px 0}`,html:`<div class="diploma-seal"><span class="seal-text">${t}</span></div>`},
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
function renderDSL(dsl: DiplomaDSL): {html:string;css:string} {
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

// ─────────────────────────────────────────────────────────────────
// 7b. DSL VALIDATION (design guardrails)
// ─────────────────────────────────────────────────────────────────
// Representative solid color per background style, for contrast checks
const BG_REPRESENTATIVE: Record<string, string> = {
  'parchment': '#eee2cd', 'clean-white': '#ffffff', 'ivory': '#fdfaf3',
  'gradient-warm': '#f8f1e8', 'gradient-cool': '#edf1f6', 'linen': '#faf0e6',
  'marble': '#f0f0f0', 'ocean-deep': '#c4dde9', 'cosmic-dark': '#16213e',
  'botanical-green': '#e8f2e2', 'vintage-sepia': '#eeddc3', 'watercolor-soft': '#f0e8f0',
  'royal-burgundy': '#f2d8d8',
};
const DARK_BGS = new Set(['cosmic-dark']);

function relativeLuminance(hex: string): number | null {
  const m = hex.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Fixes that don't need the model: drop overrides that would produce
// unreadable or mismatched designs, keep the curated palette instead.
function applyDeterministicFixes(dsl: DiplomaDSL): void {
  const palette = PALETTES[dsl.palette ?? ''] || PALETTES['ivory-navy'];
  const isLightText = palette.text === 'light';

  // A background override whose darkness doesn't match the palette's text
  // color would make body text unreadable — drop the override.
  if (dsl.background?.style && DARK_BGS.has(dsl.background.style) !== isLightText) {
    console.warn(`Dropping background override '${dsl.background.style}' (mismatches '${dsl.palette}' text color)`);
    delete dsl.background;
  }

  const bgKey = dsl.background?.style || palette.bg;
  const bgColor = BG_REPRESENTATIVE[bgKey] || '#ffffff';

  // Brand primary is used for headings/recipient: needs real contrast (WCAG
  // large-text threshold). Brand accent is decorative: a lower bar.
  if (dsl.brand?.primaryColor) {
    const ratio = contrastRatio(dsl.brand.primaryColor, bgColor);
    if (ratio !== null && ratio < 3) {
      console.warn(`Dropping brand.primaryColor ${dsl.brand.primaryColor} (contrast ${ratio.toFixed(2)}:1 on ${bgKey})`);
      delete dsl.brand.primaryColor;
    }
  }
  if (dsl.brand?.accentColor) {
    const ratio = contrastRatio(dsl.brand.accentColor, bgColor);
    if (ratio !== null && ratio < 1.6) {
      console.warn(`Dropping brand.accentColor ${dsl.brand.accentColor} (contrast ${ratio.toFixed(2)}:1 on ${bgKey})`);
      delete dsl.brand.accentColor;
    }
  }
}

// Issues the model should fix itself (content doesn't fit the layout).
// Returned strings are fed back to the model in one repair round.
function validateDsl(dsl: DiplomaDSL): string[] {
  const issues: string[] = [];
  const descLimit = dsl.layout?.composition === 'split-horizontal' ? 280 : 420;
  const desc = dsl.body?.description ?? '';
  if (desc.length > descLimit) {
    issues.push(`body.description is ${desc.length} characters but must be at most ${descLimit} for the '${dsl.layout?.composition || 'classic-stack'}' composition — shorten it or pick another composition`);
  }
  if ((dsl.body?.title ?? '').length > 60) issues.push('body.title must be at most 60 characters');
  if ((dsl.header?.institutionName ?? '').length > 60) issues.push('header.institutionName must be at most 60 characters');
  if ((dsl.header?.subtitle ?? '').length > 90) issues.push('header.subtitle must be at most 90 characters');
  if ((dsl.seal?.text ?? '').length > 20) issues.push('seal.text must be at most 20 characters');
  return issues;
}

// ─────────────────────────────────────────────────────────────────
// 8. JSON SCHEMA (used by all providers for structured output)
// ─────────────────────────────────────────────────────────────────
const PALETTE_IDS = Object.keys(PALETTES);
const TYPOGRAPHY_IDS = Object.keys(TYPOGRAPHY);

const DSL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    palette: { type: 'string', enum: PALETTE_IDS, description: 'Curated color palette (decides bg + primary + accent)' },
    typography: {
      type: 'object',
      properties: { pair: { type: 'string', enum: TYPOGRAPHY_IDS } },
      required: ['pair'],
    },
    layout: {
      type: 'object',
      properties: {
        orientation: { type: 'string', enum: ['landscape','portrait'] },
        padding: { type: 'string', enum: ['compact','normal','spacious'] },
        composition: { type: 'string', enum: ['classic-stack','banner-top','medallion-center','split-horizontal','corner-accent'] },
      },
      required: ['orientation','padding','composition'],
    },
    decorations: {
      type: 'array',
      items: { type: 'string', enum: ['corner-flourishes','watermark-monogram','ribbon-banner','guilloche-pattern','laurel-side','subtle-grid'] },
      maxItems: 2,
    },
    header: {
      type: 'object',
      properties: {
        style: { type: 'string', enum: ['serif-centered','modern-left','elegant-script','bold-caps','minimal','monumental'] },
        institutionName: { type: 'string' },
        subtitle: { type: 'string' },
      },
      required: ['style','institutionName'],
    },
    border: {
      type: 'object',
      properties: { style: { type: 'string', enum: ['ornamental','double-line','modern','minimal','classical','art-deco','wave','none'] } },
      required: ['style'],
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        preText: { type: 'string' },
        recipientName: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string' },
        courseOrProgram: { type: 'string' },
      },
      required: ['title','recipientName','description'],
    },
    seal: {
      type: 'object',
      properties: {
        style: { type: 'string', enum: ['classical-round','star','shield','ribbon','modern-circle','rosette','compass','laurel-wreath','none'] },
        position: { type: 'string', enum: ['bottom-right','bottom-left','bottom-center'] },
        text: { type: 'string' },
      },
      required: ['style','position'],
    },
    signature: {
      type: 'object',
      properties: {
        style: { type: 'string', enum: ['handwriting','formal','elegant','stamp','digital'] },
        name: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['style','name'],
    },
  },
  required: ['palette','typography','layout','header','border','body','seal','signature'],
};

// ─────────────────────────────────────────────────────────────────
// 9. PROMPTS
// ─────────────────────────────────────────────────────────────────
function dslSystemPrompt(variant: number): string {
  return `You are an expert diploma designer. Pick from predefined, pre-tested visual blocks.

DESIGN HEURISTIC:
- Choose ONE palette that matches the requested vibe. The palette determines bg + colors automatically.
- Choose ONE typography pair that fits the era/feel (serif-classic for formal, sans-modern for tech, display-editorial for premium, script-romantic for arts, mono-tech for dev, mixed-contrast for bold).
- Choose ONE composition: classic-stack (safe default), banner-top (modern enterprise), medallion-center (award-ceremony), split-horizontal (landscape modern), corner-accent (minimal premium).
- Pick 0–2 decorations max. They are overlays — do not pick more than 2 or it gets cluttered.

CONSTRAINTS:
- body.recipientName MUST be exactly "{{recipient_name}}" (literal placeholder).
- signature.name defaults to "Mr Diploma" unless user specifies.
- Do NOT include customCss unless absolutely required.
- Available palettes: ${PALETTE_IDS.join(', ')}.
- Available typography pairs: ${TYPOGRAPHY_IDS.join(', ')}.

VARIATION SEED: ${variant}/5 — when multiple valid choices exist, lean toward variation #${variant} so repeated prompts produce different designs.

Return ONLY the JSON object matching the schema.`;
}

const ITERATION_SYSTEM_PROMPT = `You are an expert diploma and certificate designer. You modify existing HTML/CSS diplomas.
You CAN add CSS animations, decorative pseudo-elements, modify layout/colors/fonts/spacing.
FORBIDDEN: QR codes, <img> tags, external images, markdown fences, JavaScript.
Format response as:
MESSAGE: [brief explanation]
HTML: [complete HTML]
CSS: [complete CSS]
Make ONLY the specific changes requested.`;

// DSL-native iteration: the model modifies the structured design instead of
// free-form HTML/CSS, so every change stays inside the design system.
function dslIterationSystemPrompt(currentDsl: DiplomaDSL): string {
  return `You are an expert diploma designer. You MODIFY an existing diploma design expressed as a DSL.

CURRENT DESIGN:
${JSON.stringify(currentDsl, null, 2)}

RULES:
- Apply ONLY the changes the user asks for. Keep every other field exactly as it is in the current design.
- Text changes (title, description, names, dates) go in the corresponding DSL fields.
- Style changes are made by picking different predefined blocks — never invent values outside the schema.
- Keep body.recipientName unchanged unless the user explicitly asks to change the recipient.
- Do NOT include customCss unless absolutely required.
- Available palettes: ${PALETTE_IDS.join(', ')}.
- Available typography pairs: ${TYPOGRAPHY_IDS.join(', ')}.

Return the COMPLETE updated design (all fields, not just the changed ones).`;
}

// ─────────────────────────────────────────────────────────────────
// 10. PROVIDER ADAPTERS (structured output, provider-agnostic)
// ─────────────────────────────────────────────────────────────────
interface AIResponse { text: string; json?: DiplomaDSL }

async function callAnthropic(systemPrompt: string, messages: AIMessage[], model: string, structured: boolean): Promise<AIResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const body: Record<string, unknown> = { model, max_tokens: 4000, system: systemPrompt, messages };
  if (structured) {
    body.tools = [{ name: 'emit_diploma_dsl', description: 'Emit the diploma DSL', input_schema: DSL_JSON_SCHEMA }];
    body.tool_choice = { type: 'tool', name: 'emit_diploma_dsl' };
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Anthropic API error ${r.status}: ${(await r.text()).substring(0,300)}`);
  const data = await r.json();

  if (structured) {
    const toolUse = (data.content || []).find((c: { type: string; input?: DiplomaDSL }) => c.type === 'tool_use');
    if (toolUse?.input) return { text: JSON.stringify(toolUse.input), json: toolUse.input };
  }
  return { text: data.content?.[0]?.text || '' };
}

function toOpenAIMessages(systemPrompt: string, messages: AIMessage[]): Array<{ role: string; content: unknown }> {
  const oaiMsgs: Array<{ role: string; content: unknown }> = [{ role: 'system', content: systemPrompt }];
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      const parts = msg.content.map((p) =>
        p.type === 'text' ? { type: 'text', text: p.text }
        : { type: 'image_url', image_url: { url: `data:${p.source.media_type};base64,${p.source.data}` } });
      oaiMsgs.push({ role: msg.role, content: parts });
    } else oaiMsgs.push({ role: msg.role, content: msg.content });
  }
  return oaiMsgs;
}

async function callOpenAI(systemPrompt: string, messages: AIMessage[], model: string, structured: boolean): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const body: Record<string, unknown> = { model, max_tokens: 4000, messages: toOpenAIMessages(systemPrompt, messages) };
  if (structured) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'diploma_dsl', schema: DSL_JSON_SCHEMA, strict: false },
    };
  }

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenAI API error ${r.status}: ${(await r.text()).substring(0,300)}`);
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text };
}

async function callGemini(systemPrompt: string, messages: AIMessage[], model: string, structured: boolean): Promise<AIResponse> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const allParts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [];
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const p of msg.content) {
        if (p.type === 'text') allParts.push({ text: p.text });
        else if (p.type === 'image') allParts.push({ inline_data: { mime_type: p.source.media_type, data: p.source.data } });
      }
    } else allParts.push({ text: msg.content });
  }

  const generationConfig: Record<string, unknown> = { maxOutputTokens: 4000 };
  if (structured) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = DSL_JSON_SCHEMA;
  }

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: allParts }],
      generationConfig,
    }),
  });
  if (!r.ok) throw new Error(`Gemini API error ${r.status}: ${(await r.text()).substring(0,300)}`);
  const data = await r.json();
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
}

async function callOpenRouter(systemPrompt: string, messages: AIMessage[], model: string, structured: boolean): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const body: Record<string, unknown> = { model, max_tokens: 4000, messages: toOpenAIMessages(systemPrompt, messages) };
  if (structured) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'diploma_dsl', schema: DSL_JSON_SCHEMA, strict: false },
    };
  }

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://certera.ink',
      'X-Title': 'Certera Diploma Generator',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenRouter API error ${r.status}: ${(await r.text()).substring(0,300)}`);
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text };
}

// ─────────────────────────────────────────────────────────────────
// 11. JSON extraction fallback
// ─────────────────────────────────────────────────────────────────
function extractJson(text: string): DiplomaDSL {
  let cleaned = text.replace(/```(?:json)?\s*/gi,'').replace(/```\s*/g,'').trim();
  const s = cleaned.indexOf('{'); const e = cleaned.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON found');
  cleaned = cleaned.substring(s, e+1);
  try { return JSON.parse(cleaned); }
  catch {
    // eslint-disable-next-line no-control-regex -- intentionally strip control chars from malformed model JSON
    cleaned = cleaned.replace(/,\s*}/g,'}').replace(/,\s*]/g,']').replace(/[\x00-\x1F\x7F]/g,'');
    return JSON.parse(cleaned);
  }
}

// ─────────────────────────────────────────────────────────────────
// 12. Web scrape helpers
// ─────────────────────────────────────────────────────────────────
// Basic SSRF guard: only fetch public http(s) hosts, never IP literals or local names
const isSafePublicUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false; // IPv4 literal
    if (host.includes(':') || host.startsWith('[')) return false; // IPv6 literal
    return true;
  } catch {
    return false;
  }
};

interface BrandData { brandName: string; colors: string[]; fonts: string[] }

// Extract brand colors/fonts/name from raw HTML (+ optional pre-parsed metadata)
const extractBrandFromHtml = (
  html: string,
  url: string,
  meta?: { title?: string; siteName?: string },
): BrandData => {
  const colors = html.match(/#[0-9a-fA-F]{3,6}/g) || [];
  const fonts = new Set<string>();
  for (const m of html.matchAll(/font-family\s*:\s*([^;]+)/gi)) {
    const f = m[1].replace(/['"]/g, '').split(',')[0].trim();
    if (f && f !== 'inherit') fonts.add(f);
  }
  const title = meta?.title || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
  const siteName = meta?.siteName || html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"/i)?.[1] || '';
  return {
    brandName: siteName || title.split(/[-|–—]/)[0].trim() || new URL(url).hostname.replace('www.', ''),
    colors: [...new Set(colors)].slice(0, 5),
    fonts: [...fonts].slice(0, 3),
  };
};

// Scrape via Firecrawl (renders JS, cleaner metadata); returns null if unavailable/failed
const scrapeWithFirecrawl = async (url: string): Promise<BrandData | null> => {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;
  try {
    const r = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ url, formats: ['html'], onlyMainContent: false, timeout: 20000 }),
    });
    if (!r.ok) throw new Error(`Firecrawl HTTP ${r.status}: ${(await r.text()).substring(0, 200)}`);
    const data = await r.json();
    if (!data?.success || !data?.data) throw new Error('Firecrawl returned no data');
    const html: string = data.data.html || data.data.rawHtml || '';
    const md = data.data.metadata || {};
    return extractBrandFromHtml(html, url, {
      title: md.title || md.ogTitle,
      siteName: md.ogSiteName || md['og:site_name'],
    });
  } catch (e) {
    console.error('Firecrawl scrape failed, falling back:', e instanceof Error ? e.message : e);
    return null;
  }
};

// Direct fetch fallback (no JS rendering)
const scrapeDirect = async (url: string): Promise<BrandData | null> => {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiplomaBot/1.0)' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return extractBrandFromHtml(await r.text(), url);
  } catch (e) {
    console.error('Direct scrape failed:', e instanceof Error ? e.message : e);
    return null;
  }
};

const scrapeWebsiteData = async (url: string): Promise<BrandData | null> => {
  if (!isSafePublicUrl(url)) {
    console.error('Scrape: URL is not a public http(s) address');
    return null;
  }
  // Prefer Firecrawl when configured; fall back to a direct fetch.
  return (await scrapeWithFirecrawl(url)) || (await scrapeDirect(url));
};

// ─────────────────────────────────────────────────────────────────
// 13. MAIN HANDLER
// ─────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages, requestType, imageData, url, currentHtml, currentCss, currentDsl, userFullName } = await req.json();

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Derive identity from the token — never trust an isGuest flag from the body.
    const authHeader = req.headers.get('Authorization') ?? '';
    let isAuthenticated = false;
    if (authHeader.startsWith('Bearer ')) {
      const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
      isAuthenticated = !!user;
    }

    // Guests are allowed a limited number of generations per IP per day,
    // enforced server-side (the localStorage counter in the client is only UX).
    if (!isAuthenticated) {
      const GUEST_DAILY_LIMIT = 10;
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const ipHash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))),
      ).map((b) => b.toString(16).padStart(2, '0')).join('');

      const dayMs = 24 * 60 * 60 * 1000;
      const { data: usage } = await supabaseAdmin.from('guest_usage').select('*').eq('ip_hash', ipHash).maybeSingle();
      const windowExpired = !usage || Date.now() - new Date(usage.window_start).getTime() > dayMs;
      const count = windowExpired ? 0 : usage.count;

      if (count >= GUEST_DAILY_LIMIT) {
        return new Response(JSON.stringify({ error: 'Guest limit reached', message: 'You have used all free generations for today. Create an account for unlimited access!' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error: usageError } = await supabaseAdmin.from('guest_usage').upsert({
        ip_hash: ipHash,
        count: count + 1,
        window_start: windowExpired ? new Date().toISOString() : usage.window_start,
      });
      // If the table doesn't exist yet (migration not applied), log but don't block guests.
      if (usageError) console.error('guest_usage upsert failed:', usageError.message);
    }

    // Provider selection
    const { data: settingData } = await supabaseAdmin.from('app_settings').select('value').eq('key','ai_provider').single();
    const cfg = (settingData?.value as { provider: string; model: string }) || { provider: 'anthropic', model: 'claude-sonnet-4-20250514' };
    const { provider, model } = cfg;
    console.log(`Provider: ${provider}, model: ${model}`);

    const isIteration = !!(currentHtml && currentCss) && requestType !== 'image' && requestType !== 'url';
    // DSL-native iteration when the client still has the structured design;
    // legacy raw HTML/CSS iteration only for sessions without a DSL
    // (older sessions, or manually edited HTML/CSS).
    const dslIteration = isIteration && currentDsl && typeof currentDsl === 'object';
    const variant = Math.floor(Math.random() * 5) + 1; // 1..5 seed

    let systemPrompt: string;
    let aiMessages: AIMessage[];
    let structured = true;

    if (dslIteration) {
      systemPrompt = dslIterationSystemPrompt(currentDsl as DiplomaDSL);
      aiMessages = ((messages || []) as AIMessage[]).filter((m) => m.role !== 'system');
    } else if (isIteration) {
      systemPrompt = `${ITERATION_SYSTEM_PROMPT}\n\nCURRENT HTML:\n${currentHtml}\nCURRENT CSS:\n${currentCss}`;
      aiMessages = ((messages || []) as AIMessage[]).filter((m) => m.role !== 'system');
      structured = false;
    } else if (requestType === 'image') {
      systemPrompt = dslSystemPrompt(variant) + '\n\nAnalyze the image and choose blocks reflecting its style.';
      aiMessages = [{
        role: 'user',
        content: [
          { type: 'text', text: 'Design a diploma inspired by this image.' },
          { type: 'image', source: { type: 'base64', media_type: imageData.type, data: imageData.data } },
        ],
      }];
    } else if (requestType === 'url') {
      const ws = await scrapeWebsiteData(url);
      systemPrompt = dslSystemPrompt(variant) + (ws ? `\n\nBRAND: ${ws.brandName}\nColors: ${ws.colors.join(', ')}\nFonts: ${ws.fonts.join(', ')}` : '');
      aiMessages = [{ role: 'user', content: `Create a diploma for the brand at ${url}.` }];
    } else {
      systemPrompt = dslSystemPrompt(variant);
      aiMessages = ((messages || []) as AIMessage[]).filter((m) => m.role !== 'system');
    }

    // Call provider
    let result: AIResponse;
    const callProvider = async (p: string, m: string, msgs: AIMessage[] = aiMessages): Promise<AIResponse> => {
      switch (p) {
        case 'openai':     return callOpenAI(systemPrompt, msgs, m, structured);
        case 'gemini':     return callGemini(systemPrompt, msgs, m, structured);
        case 'openrouter': return callOpenRouter(systemPrompt, msgs, m, structured);
        case 'anthropic':
        default:           return callAnthropic(systemPrompt, msgs, m, structured);
      }
    };
    // Default model per provider (used in fallback)
    const defaultModelFor: Record<string, string> = {
      anthropic: 'claude-sonnet-4-20250514',
      openai: 'gpt-4o-mini',
      gemini: 'gemini-2.5-flash-preview-05-20',
      openrouter: 'openai/gpt-4o-mini',
    };
    // Build fallback chain: configured first, then any other provider with a key set
    const keyEnv: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      gemini: 'GEMINI_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
    };
    const chain: { p: string; m: string }[] = [{ p: provider, m: model }];
    for (const p of ['anthropic', 'openai', 'gemini', 'openrouter']) {
      if (p !== provider && Deno.env.get(keyEnv[p])) {
        chain.push({ p, m: defaultModelFor[p] });
      }
    }
    let lastErr: unknown;
    let usedProvider = provider;
    let usedModel = model;
    for (const step of chain) {
      try {
        result = await callProvider(step.p, step.m);
        usedProvider = step.p;
        usedModel = step.m;
        if (step.p !== provider) console.warn(`Fell back from ${provider} to ${step.p}`);
        break;
      } catch (e) {
        lastErr = e;
        console.error(`Provider ${step.p} failed:`, e instanceof Error ? e.message : e);
      }
    }
    if (!result!) throw lastErr || new Error('All providers failed');

    if (isIteration && !dslIteration) {
      const strip = (s: string) => s.replace(/```(?:html|css|)\s*/gi,'').replace(/```\s*/g,'').trim();
      const msg = result.text.match(/MESSAGE:\s*(.*?)(?=HTML:|$)/s)?.[1]?.trim() || "I've updated the diploma!";
      const htmlPart = strip(result.text.match(/HTML:\s*(.*?)(?=CSS:|$)/s)?.[1]?.trim() || '');
      const cssPart = strip(result.text.match(/CSS:\s*(.*?)$/s)?.[1]?.trim() || '');
      return new Response(JSON.stringify({ message: msg, html: htmlPart, css: cssPart, provider: usedProvider, model: usedModel }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let dsl: DiplomaDSL = result.json || extractJson(result.text);

    // Guardrails: content that doesn't fit the layout gets one repair round
    // with the model; readability problems are fixed deterministically.
    const issues = validateDsl(dsl);
    if (issues.length > 0) {
      console.warn('DSL validation issues, requesting repair:', issues);
      try {
        const repairMessages: AIMessage[] = [
          ...aiMessages,
          { role: 'assistant', content: JSON.stringify(dsl) },
          { role: 'user', content: `The design has problems that must be fixed:\n- ${issues.join('\n- ')}\nReturn the complete corrected design. Change as little as possible.` },
        ];
        const repaired = await callProvider(usedProvider, usedModel, repairMessages);
        const repairedDsl: DiplomaDSL = repaired.json || extractJson(repaired.text);
        const remaining = validateDsl(repairedDsl);
        if (remaining.length < issues.length) {
          dsl = repairedDsl;
        }
        if (remaining.length > 0) console.warn('DSL issues remaining after repair:', remaining);
      } catch (e) {
        console.error('DSL repair round failed, rendering original:', e instanceof Error ? e.message : e);
      }
    }
    applyDeterministicFixes(dsl);

    console.log('DSL palette:', dsl.palette, 'comp:', dsl.layout?.composition, 'decos:', dsl.decorations);
    const rendered = renderDSL(dsl);

    // Substitute the recipient placeholder the DSL prompt asks the model to emit
    const recipient = typeof userFullName === 'string' && userFullName.trim() ? userFullName.trim() : '';
    if (recipient) {
      rendered.html = rendered.html.replaceAll('{{recipient_name}}', esc(recipient));
    }

    const message = dslIteration
      ? "I've updated the diploma!"
      : `Designed using ${dsl.palette} palette · ${dsl.typography?.pair} typography · ${dsl.layout?.composition} layout (variant ${variant}).`;

    return new Response(JSON.stringify({
      message,
      html: rendered.html,
      css: rendered.css,
      provider: usedProvider,
      model: usedModel,
      dsl,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('generate-diploma error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, message: 'Sorry, an error occurred while generating your diploma. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
