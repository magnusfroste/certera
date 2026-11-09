import { describe, expect, it } from 'vitest';
import { API_KEY_PATTERN, cleanName, extractRecipientName, institutionFromDsl, newDiplomaId } from '../../../supabase/functions/_shared/publicApi';
import { personalizeHtml } from '../recipient';

describe('public API rules', () => {
  it('accepts only well-formed keys', () => {
    expect(API_KEY_PATTERN.test('cert_' + 'a1'.repeat(20))).toBe(true);
    for (const k of ['', 'cert_', 'cert_' + 'a'.repeat(39), 'cert_' + 'A'.repeat(40), 'ops_' + 'a'.repeat(40), ' cert_' + 'a'.repeat(40)]) {
      expect(API_KEY_PATTERN.test(k), k).toBe(false);
    }
  });

  it('cleans names and rejects unusable ones', () => {
    expect(cleanName('  Elin   Fjällström \n')).toBe('Elin Fjällström');
    expect(cleanName('a\u0000b')).toBe('a b');
    expect(cleanName('')).toBeNull();
    expect(cleanName('   ')).toBeNull();
    expect(cleanName('x'.repeat(121))).toBeNull();
    expect(cleanName(42)).toBeNull();
  });

  it('finds the learner name in common webhook payloads', () => {
    expect(extractRecipientName({ name: 'Ada Lovelace' })).toBe('Ada Lovelace');
    expect(extractRecipientName({ user: { full_name: 'Ada Lovelace' } })).toBe('Ada Lovelace');
    expect(extractRecipientName({ data: { user: { name: 'Ada Lovelace' } } })).toBe('Ada Lovelace');
    expect(extractRecipientName({ object: { user: { name: 'Ada Lovelace' } } })).toBe('Ada Lovelace');
    expect(extractRecipientName({ user: { first_name: 'Ada', last_name: 'Lovelace' } })).toBe('Ada Lovelace');
    expect(extractRecipientName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
    expect(extractRecipientName({ student: { first_name: 'Ada' } })).toBe('Ada');
  });

  it('uses an explicit name_field and nothing else when given', () => {
    expect(extractRecipientName({ name: 'Wrong', learner: { display: 'Ada' } }, 'learner.display')).toBe('Ada');
    expect(extractRecipientName({ name: 'Ada' }, 'missing.path')).toBeNull();
  });

  it('gives null when there is no name (never a course title or an email)', () => {
    expect(extractRecipientName({ course: { name: 'Leadership' }, user: { email: 'a@b.se' } })).toBeNull();
    expect(extractRecipientName({ user: { last_name: 'Lovelace' } })).toBeNull();
    expect(extractRecipientName(null)).toBeNull();
    expect(extractRecipientName('text')).toBeNull();
  });

  it('reads the institution from a design and makes studio-shaped ids', () => {
    expect(institutionFromDsl({ header: { institutionName: ' Certera Academy ' } })).toBe('Certera Academy');
    expect(institutionFromDsl(null)).toBeNull();
    expect(newDiplomaId()).toMatch(/^DIP_[a-z0-9]+_[a-z0-9]{9}$/);
    expect(newDiplomaId()).not.toBe(newDiplomaId());
  });

  it('personalises through the shared module the API uses (escaped)', () => {
    expect(personalizeHtml('<p>{{ recipient_name }}</p>', '<i>Ada</i>')).toBe('<p>&lt;i&gt;Ada&lt;/i&gt;</p>');
  });
});
