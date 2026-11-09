import { describe, expect, it } from 'vitest';
import { isPersonalEmailDomain, issuerDomainFromEmail } from '../../../supabase/functions/_shared/issuerDomain';

describe('issuerDomainFromEmail', () => {
  it('gives the organisation domain of a confirmed work address', () => {
    expect(issuerDomainFromEmail('karin@nordlys.se', true)).toBe('nordlys.se');
    expect(issuerDomainFromEmail('  Karin@HR.Nordlys.SE ', true)).toBe('hr.nordlys.se');
    expect(issuerDomainFromEmail('a.b+tag@uni.example.ac.uk', true)).toBe('uni.example.ac.uk');
  });

  it('never verifies an unconfirmed address', () => {
    expect(issuerDomainFromEmail('karin@nordlys.se', false)).toBeNull();
  });

  it('never verifies personal mail providers', () => {
    for (const e of ['x@gmail.com', 'x@hotmail.se', 'x@outlook.com', 'x@live.se', 'x@yahoo.co.uk', 'x@icloud.com', 'x@telia.com', 'x@proton.me', 'x@gmx.de']) {
      expect(issuerDomainFromEmail(e, true), e).toBeNull();
    }
    expect(isPersonalEmailDomain('nordlys.se')).toBe(false);
  });

  it('rejects malformed input', () => {
    for (const e of [null, undefined, 42, '', 'no-at-sign', '@nordlys.se', 'x@localhost', 'x@nordlys', 'x@-bad-.se', 'x@a..se']) {
      expect(issuerDomainFromEmail(e, true), String(e)).toBeNull();
    }
  });
});
