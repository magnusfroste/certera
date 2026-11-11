// A design made somewhere else (a design tool, by hand) brought in as a
// template. It is stored as it is: plain HTML + CSS with {{recipient_name}}
// where the name goes.
import { cleanName } from './publicApi.ts';
import { isDiplomaFormat, type DiplomaFormat } from './diplomaFormat.ts';

export const MAX_TEMPLATE_BYTES = 200_000;

export interface TemplateImport {
  title: string;
  html: string;
  css: string;
  institutionName: string | null;
  format: DiplomaFormat;
}

export type TemplateImportResult =
  | { ok: true; value: TemplateImport }
  | { ok: false; code: string; message: string };

const bad = (code: string, message: string): TemplateImportResult => ({ ok: false, code, message });

// A certificate is a static document. Anything that runs or loads a page is
// refused with a reason, rather than silently removed from someone's design.
const ACTIVE_CONTENT: [RegExp, string][] = [
  [/<\s*script\b/i, '<script> elements'],
  [/<\s*(iframe|object|embed|frame|frameset|applet)\b/i, 'embedded frames or objects'],
  [/<\s*(form|input|button|textarea|select)\b/i, 'form controls'],
  [/<\s*(meta|base|link)\b/i, '<meta>, <base> or <link> elements (put styles in css; fonts via @import)'],
  [/\son[a-z]+\s*=/i, 'event handler attributes such as onclick or onerror'],
  [/(?:href|src|action|xlink:href)\s*=\s*["']?\s*(?:javascript|vbscript|data:text\/html)/i, 'javascript: or data:text/html links'],
];

const bytes = (s: string) => new TextEncoder().encode(s).length;

export function validateTemplateImport(body: unknown): TemplateImportResult {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  const html = typeof b.html === 'string' ? b.html.trim() : '';
  if (!html) return bad('invalid_html', 'html is required: the certificate markup, with {{recipient_name}} where the name goes.');
  if (bytes(html) > MAX_TEMPLATE_BYTES) return bad('html_too_large', `html must be at most ${MAX_TEMPLATE_BYTES / 1000} kB. Link images by URL instead of embedding them.`);

  if (b.css !== undefined && b.css !== null && typeof b.css !== 'string') return bad('invalid_css', 'css must be a string.');
  const css = typeof b.css === 'string' ? b.css.trim() : '';
  if (bytes(css) > MAX_TEMPLATE_BYTES) return bad('css_too_large', `css must be at most ${MAX_TEMPLATE_BYTES / 1000} kB.`);
  if (/<\s*\/\s*style/i.test(css)) return bad('invalid_css', 'css must be plain CSS, without a closing </style> tag.');

  for (const [pattern, what] of ACTIVE_CONTENT) {
    if (pattern.test(html)) return bad('active_content', `A certificate must be a static document: remove ${what}.`);
  }
  if (/expression\s*\(|javascript\s*:/i.test(css)) return bad('active_content', 'A certificate must be a static document: remove scripts from the css.');

  const title = cleanName(b.title);
  if (!title) return bad('invalid_title', 'title is required (1–120 characters).');

  const blankInstitution = b.institution_name == null || (typeof b.institution_name === 'string' && !b.institution_name.trim());
  const institutionName = blankInstitution ? null : cleanName(b.institution_name);
  if (!blankInstitution && !institutionName) return bad('invalid_institution', 'institution_name must be 1–120 characters.');

  if (b.format != null && b.format !== '' && !isDiplomaFormat(b.format)) return bad('invalid_format', 'format must be "landscape" or "portrait".');
  const format: DiplomaFormat = isDiplomaFormat(b.format) ? b.format : 'landscape';

  return { ok: true, value: { title, html, css, institutionName, format } };
}
