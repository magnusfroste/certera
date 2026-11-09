// A guest's design, kept in this browser so it survives creating an account.
//
// A guest designs on /demo, then has to sign up to sign or share. Sign-up
// leaves the studio (and the email confirmation link may open a new tab), so
// the design lived only in memory and was lost — the visitor came back to an
// empty studio. The draft is written while the guest works and picked up by
// /app once they are signed in, then cleared.

export const GUEST_DRAFT_KEY = 'certera.guestDraft.v1';
export const GUEST_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// localStorage quotas are ~5MB per origin; a diploma is far below this, but
// never let a pathological design throw while writing.
const MAX_DRAFT_CHARS = 1_000_000;

export interface GuestDraftMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

export interface GuestDraft {
  html: string;
  css: string;
  dsl: unknown;
  format: 'portrait' | 'landscape';
  messages: GuestDraftMessage[];
  savedAt: number;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // blocked storage (privacy mode, sandboxed frames)
  }
}

export function saveGuestDraft(draft: Omit<GuestDraft, 'savedAt'>, now = Date.now(), store = storage()): void {
  if (!store || !draft.html) return;
  try {
    const raw = JSON.stringify({ ...draft, savedAt: now });
    if (raw.length > MAX_DRAFT_CHARS) return;
    store.setItem(GUEST_DRAFT_KEY, raw);
  } catch {
    /* quota or blocked storage: the draft is a convenience, never an error */
  }
}

/** The stored draft, or null when there is none, it is malformed, or older than a week. */
export function readGuestDraft(now = Date.now(), store = storage()): GuestDraft | null {
  if (!store) return null;
  let parsed: unknown;
  try {
    const raw = store.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const d = parsed as Partial<GuestDraft> | null;
  if (!d || typeof d.html !== 'string' || !d.html || typeof d.css !== 'string' || typeof d.savedAt !== 'number') return null;
  if (now - d.savedAt > GUEST_DRAFT_MAX_AGE_MS || d.savedAt > now + 60_000) return null;
  const messages = Array.isArray(d.messages)
    ? d.messages.filter(
        (m): m is GuestDraftMessage =>
          !!m && typeof m.id === 'string' && typeof m.content === 'string' && typeof m.isUser === 'boolean' && typeof m.timestamp === 'string',
      )
    : [];
  return {
    html: d.html,
    css: d.css,
    dsl: d.dsl ?? null,
    format: d.format === 'landscape' ? 'landscape' : 'portrait',
    messages,
    savedAt: d.savedAt,
  };
}

export function clearGuestDraft(store = storage()): void {
  try {
    store?.removeItem(GUEST_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
