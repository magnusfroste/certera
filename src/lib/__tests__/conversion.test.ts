import { describe, expect, it } from 'vitest';
import { GUEST_DRAFT_KEY, GUEST_DRAFT_MAX_AGE_MS, clearGuestDraft, readGuestDraft, saveGuestDraft } from '../guestDraft';
import { metaForPath } from '../routeMeta';
import { campaignSource, cleanSource } from '../../../supabase/functions/_shared/campaignSource';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};
const draft = {
  html: '<div>Diploma</div>', css: '.a{}', dsl: { palette: 'ivory-navy' }, format: 'landscape' as const,
  messages: [{ id: '1', content: 'A certificate for Ada', isUser: true, timestamp: '2026-11-09T01:00:00.000Z' }],
};

describe('guest draft (survives sign-up)', () => {
  it('round-trips a design', () => {
    const s = memory();
    saveGuestDraft(draft, 1000, s);
    expect(readGuestDraft(2000, s)).toEqual({ ...draft, savedAt: 1000 });
  });

  it('ignores an empty design, expired, future-dated or malformed drafts', () => {
    const s = memory();
    saveGuestDraft({ ...draft, html: '' }, 1000, s);
    expect(s.m.size).toBe(0);
    saveGuestDraft(draft, 1000, s);
    expect(readGuestDraft(1000 + GUEST_DRAFT_MAX_AGE_MS + 1, s)).toBeNull();
    expect(readGuestDraft(1000 - 120_000, s)).toBeNull(); // saved "in the future" beyond clock skew
    s.setItem(GUEST_DRAFT_KEY, '{not json');
    expect(readGuestDraft(1000, s)).toBeNull();
    s.setItem(GUEST_DRAFT_KEY, JSON.stringify({ html: 5, css: '', savedAt: 1 }));
    expect(readGuestDraft(1000, s)).toBeNull();
  });

  it('drops malformed messages and defaults the format', () => {
    const s = memory();
    s.setItem(GUEST_DRAFT_KEY, JSON.stringify({ ...draft, format: 'square', messages: [draft.messages[0], { id: 2 }, null], savedAt: 1 }));
    const d = readGuestDraft(10, s)!;
    expect(d.format).toBe('portrait');
    expect(d.messages).toHaveLength(1);
  });

  it('never throws when storage does', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(() => saveGuestDraft(draft, 1, broken)).not.toThrow();
    expect(readGuestDraft(1, broken)).toBeNull();
    expect(() => clearGuestDraft(broken)).not.toThrow();
  });
});

describe('route metadata', () => {
  it('gives public pages their own canonical and indexes them', () => {
    expect(metaForPath('/')).toMatchObject({ canonical: 'https://www.certera.ink/', noindex: false });
    expect(metaForPath('/demo')).toMatchObject({ canonical: 'https://www.certera.ink/demo', noindex: false });
    expect(metaForPath('/verify/')).toMatchObject({ canonical: 'https://www.certera.ink/verify', noindex: false });
    expect(metaForPath('/demo').title).not.toBe(metaForPath('/').title);
  });

  it('keeps personal, private and unknown pages out of the index', () => {
    for (const p of ['/app', '/auth', '/profile', '/signed', '/admin', '/admin/dsl', '/diploma/DIP_x', '/embed/DIP_x', '/verify/DIP_x', '/health']) {
      expect(metaForPath(p).noindex, p).toBe(true);
    }
    expect(metaForPath('/kontakt')).toMatchObject({ noindex: true, title: expect.stringContaining('not found') });
  });
});

describe('campaign source', () => {
  it('reads utm_source/utm_campaign or ref from the landing URL', () => {
    expect(campaignSource('?utm_source=linkedin&utm_campaign=launch-nov')).toBe('linkedin/launch-nov');
    expect(campaignSource('?ref=diploma')).toBe('diploma');
    expect(campaignSource('?foo=bar')).toBe('');
  });

  it('stores only short lowercase tags', () => {
    expect(cleanSource('LinkedIn/Launch-Nov')).toBe('linkedin/launch-nov');
    expect(cleanSource('ada@example.com')).toBeNull();
    expect(cleanSource('a/b/c')).toBeNull();
    expect(cleanSource('x'.repeat(41))).toBeNull();
    expect(cleanSource('hello world')).toBeNull();
    expect(cleanSource(42)).toBeNull();
    expect(cleanSource('')).toBeNull();
  });
});
