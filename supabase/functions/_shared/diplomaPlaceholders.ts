// ─────────────────────────────────────────────────────────────────
// Placeholders the app does not fill in
// ─────────────────────────────────────────────────────────────────
// The only placeholder the app substitutes is {{recipient_name}} (at
// generation when a name is given, and per copy at signing). Models —
// smaller ones especially — invent others such as {{completion_date}} or
// {{course_name}}, which would then be printed on the diploma verbatim.
// This removes them. A field left empty is simply not rendered — a date is
// not invented, because a template may be signed for recipients much later.

import type { DiplomaDSL } from './diplomaRenderer.ts';

const KEPT = '{{recipient_name}}';
const PLACEHOLDER = /\{\{\s*[^{}]*?\s*\}\}/g;

/** Text with every placeholder but {{recipient_name}} removed, whitespace tidied. */
export function stripUnknownPlaceholders(text: string): string {
  if (!text.includes('{{')) return text;
  return text
    .replace(PLACEHOLDER, (m) => (m.replace(/\s+/g, '') === KEPT ? KEPT : ''))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

/** Applies stripUnknownPlaceholders to every text field of the DSL, in place. Returns the placeholders removed. */
export function removeUnknownPlaceholders(dsl: DiplomaDSL): string[] {
  const removed: string[] = [];
  const clean = (v: unknown): unknown => {
    if (typeof v === 'string') {
      for (const m of v.match(PLACEHOLDER) ?? []) if (m.replace(/\s+/g, '') !== KEPT) removed.push(m);
      return stripUnknownPlaceholders(v);
    }
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object') {
      for (const [k, inner] of Object.entries(v)) (v as Record<string, unknown>)[k] = clean(inner);
    }
    return v;
  };
  for (const key of Object.keys(dsl) as (keyof DiplomaDSL)[]) {
    if (key === 'customCss') continue; // CSS has its own braces and is sanitised by the renderer
    (dsl as Record<string, unknown>)[key] = clean(dsl[key]);
  }
  if (dsl.body?.additionalFields) {
    dsl.body.additionalFields = dsl.body.additionalFields.filter((f) => (f.value ?? '').trim() !== '');
  }
  return removed;
}
