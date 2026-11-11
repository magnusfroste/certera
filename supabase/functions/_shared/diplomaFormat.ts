// Page format of a diploma: A4, landscape or portrait.
//
// The renderer only caps the diploma's width (800px landscape, 620px
// portrait); its height follows the text. Everywhere a diploma is shown it is
// therefore placed on a "sheet" that gives it at least the height of an A4
// page of that width. The sheet lives in the display layer, never in the
// stored CSS, so a signed diploma's content hash is unaffected.

export type DiplomaFormat = 'landscape' | 'portrait';

export const SHEET_WIDTH: Record<DiplomaFormat, number> = { landscape: 800, portrait: 620 };
/** Height of an A4 page as a fraction of its width. */
export const SHEET_RATIO: Record<DiplomaFormat, number> = { landscape: 210 / 297, portrait: 297 / 210 };

export const isDiplomaFormat = (v: unknown): v is DiplomaFormat => v === 'landscape' || v === 'portrait';

const CONTAINER_WIDTH = /(\.diploma-container\s*\{[^}]*?max-width:\s*)(\d+)px/i;

/** Whether the CSS is renderer output that states its format. */
export const cssHasFormat = (css: string | null | undefined) => CONTAINER_WIDTH.test(css || '');

/** The format a rendered design was made in, read from its CSS. */
export function formatFromCss(css: string | null | undefined): DiplomaFormat {
  const width = Number((css || '').match(CONTAINER_WIDTH)?.[2]);
  return width > 0 && width <= 700 ? 'portrait' : 'landscape';
}

/** The same design in another format. CSS without a rendered container is returned unchanged. */
export function cssWithFormat(css: string, format: DiplomaFormat): string {
  return css.replace(CONTAINER_WIDTH, `$1${SHEET_WIDTH[format]}px`);
}

const PORTRAIT = '(?:portrait|upright|vertical|stående|staende|hochformat)';
const LANDSCAPE = '(?:landscape|horizontal|liggande|querformat)';
const PAGE = '(?:format|orientation|mode|layout|a4|page)';
// "portrait photography", "landscape architecture": the subject, not the page.
const SUBJECT = /\b(portrait|landscape)\s+(photo\w*|paint\w*|draw\w*|art\w*|architect\w*|design\w*|garden\w*|course|class|workshop)/g;

/**
 * The format a person asked for in their own words ("make it portrait",
 * "gör den liggande"), or null when the message does not clearly ask for one.
 * A long description only counts when it names the page ("portrait format").
 */
export function requestedFormat(text: string | null | undefined): DiplomaFormat | null {
  const t = (text || '').toLowerCase().replace(SUBJECT, ' ');
  const short = t.trim().split(/\s+/).length <= 12;
  const asks = (word: string) =>
    new RegExp(`\\b${word}\\s+${PAGE}\\b|\\b${PAGE}\\W{0,3}(?:is\\s+|to\\s+)?${word}`).test(t)
    || (short && new RegExp(`(?:^|[^\\p{L}])${word}(?:$|[^\\p{L}])`, 'u').test(t));
  const portrait = asks(PORTRAIT);
  const landscape = asks(LANDSCAPE);
  if (portrait === landscape) return null; // neither, or both: not a clear ask
  return portrait ? 'portrait' : 'landscape';
}

/** Only renderer output (a single .diploma-container root) is laid out on a sheet. */
export const fitsSheet = (html: string | null | undefined) => /^\s*<div\s+class="diploma-container[\s"]/i.test(html || '');

/**
 * CSS for an element with class `a4-sheet` whose child is the diploma. The
 * sheet is as wide as the format allows and at least as tall as an A4 page of
 * that width; a diploma with more text than fits simply grows.
 */
export function sheetCss(format: DiplomaFormat): string {
  const pct = (SHEET_RATIO[format] * 100).toFixed(3);
  return `
.a4-sheet{display:grid;align-content:start;width:100%;max-width:${SHEET_WIDTH[format]}px !important;margin-left:auto;margin-right:auto}
.a4-sheet::before{content:"";grid-area:1/1;padding-bottom:${pct}%;pointer-events:none}
.a4-sheet>.diploma-container{grid-area:1/1;width:100% !important;max-width:none !important;margin:0 !important;display:flex;flex-direction:column}
.a4-sheet>.diploma-container>.diploma-border{flex:1 1 auto}
.a4-sheet>.diploma-container:not(.comp-split)>.diploma-border{display:flex;flex-direction:column}
.a4-sheet>.diploma-container:not(.comp-split)>.diploma-border>.diploma-body{margin-top:auto;margin-bottom:auto}
`;
}

/** The same design description (DSL) in another format; anything that is not a DSL object is returned as is. */
export function dslWithFormat<T>(dsl: T, format: DiplomaFormat): T {
  if (!dsl || typeof dsl !== 'object' || Array.isArray(dsl)) return dsl;
  const d = dsl as Record<string, unknown>;
  const layout = d.layout && typeof d.layout === 'object' ? (d.layout as Record<string, unknown>) : {};
  return { ...d, layout: { ...layout, orientation: format } } as T;
}
