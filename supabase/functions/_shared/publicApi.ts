// ─────────────────────────────────────────────────────────────────
// Public API: rules shared by the api function, the app and the tests
// ─────────────────────────────────────────────────────────────────
// Keys look like cert_<40 hex>. Only their SHA-256 is stored (api_keys), so a
// key is shown once, when it is created in Profile.

export const API_KEY_PREFIX = 'cert_';
export const API_KEY_PATTERN = /^cert_[0-9a-f]{40}$/;
/** Certificates one account may sign through the API per UTC day. Each one costs the operator a Hedera fee. */
export const API_DAILY_LIMIT = 200;
export const MAX_NAME_LENGTH = 120;
export const SITE_URL = 'https://www.certera.ink';

/** A recipient or institution name as stored: trimmed, single-spaced, or null when unusable. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // deno-lint-ignore no-control-regex
  const s = raw.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim();
  return s.length >= 1 && s.length <= MAX_NAME_LENGTH ? s : null;
}

const at = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);

// Where course platforms put the learner's name in a "course completed"
// payload. Checked in order; first/last name pairs are joined.
const NAME_PATHS = [
  'recipient_name', 'name', 'full_name', 'fullName', 'student_name',
  'user.name', 'user.full_name', 'user.fullName', 'student.name', 'student.full_name',
  'member.name', 'customer.name', 'learner.name', 'contact.name',
  'data.name', 'data.full_name', 'data.user.name', 'data.user.full_name', 'data.student.name',
  'object.user.name', 'object.user.full_name', 'payload.user.name', 'payload.user.full_name',
];
const PAIR_ROOTS = ['', 'user', 'student', 'member', 'customer', 'learner', 'data', 'data.user', 'data.student', 'object.user', 'payload.user'];
const PAIRS: [string, string][] = [['first_name', 'last_name'], ['firstName', 'lastName'], ['firstname', 'lastname']];

/**
 * The learner's name from a webhook payload. `path` (e.g. "user.display_name")
 * says exactly where it is; without it, the usual places are tried.
 */
export function extractRecipientName(payload: unknown, path?: string | null): string | null {
  if (path) return cleanName(at(payload, path));
  for (const p of NAME_PATHS) {
    const v = cleanName(at(payload, p));
    if (v) return v;
  }
  for (const root of PAIR_ROOTS) {
    for (const [f, l] of PAIRS) {
      const first = at(payload, root ? `${root}.${f}` : f);
      const last = at(payload, root ? `${root}.${l}` : l);
      const v = cleanName([first, last].filter((x) => typeof x === 'string' && x.trim()).join(' '));
      if (v && typeof first === 'string' && first.trim()) return v;
    }
  }
  return null;
}

/** The institution a template was designed for (its DSL header), if any. */
export function institutionFromDsl(dsl: unknown): string | null {
  return cleanName(at(dsl, 'header.institutionName'));
}

/** New diploma id, same shape as the studio's. */
export function newDiplomaId(): string {
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 9);
  return `DIP_${Date.now().toString(36)}_${rand}`;
}
