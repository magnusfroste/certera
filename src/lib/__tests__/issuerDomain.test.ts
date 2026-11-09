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

import { chooseIssuerDomain, dnsRecordName, dnsRecordValue, normalizeDomainInput, txtRecordsMatch } from '../../../supabase/functions/_shared/issuerDomain';

describe('DNS-verified issuer domains', () => {
  it('normalises what people paste as their domain', () => {
    expect(normalizeDomainInput('certera.ink')).toBe('certera.ink');
    expect(normalizeDomainInput(' https://www.Certera.ink/about?x=1 ')).toBe('certera.ink');
    expect(normalizeDomainInput('karin@nordlys.se')).toBe('nordlys.se');
    expect(normalizeDomainInput('nordlys.se:443')).toBe('nordlys.se');
    expect(normalizeDomainInput('hr.nordlys.se.')).toBe('hr.nordlys.se');
  });

  it('refuses personal providers and non-domains', () => {
    for (const d of ['gmail.com', 'https://www.hotmail.se', 'localhost', 'nordlys', '', 'a b.se', null]) {
      expect(normalizeDomainInput(d), String(d)).toBeNull();
    }
  });

  it('names the record and matches resolver answers, quoted or split', () => {
    expect(dnsRecordName('certera.ink')).toBe('_certera.certera.ink');
    expect(dnsRecordValue('abc')).toBe('certera-verify=abc');
    expect(txtRecordsMatch(['"certera-verify=abc"'], 'abc')).toBe(true);
    expect(txtRecordsMatch(['"v=spf1 -all"', '"certera-verify=" "abc"'], 'abc')).toBe(true);
    expect(txtRecordsMatch(['certera-verify=abc'], 'abc')).toBe(true);
    expect(txtRecordsMatch(['"certera-verify=abcd"', '"certera-verify=ab"'], 'abc')).toBe(false);
    expect(txtRecordsMatch([], 'abc')).toBe(false);
  });

  it('prefers a DNS-verified domain, else the work email domain', () => {
    expect(chooseIssuerDomain('certera.ink', 'magnus@gmail.com', true)).toBe('certera.ink');
    expect(chooseIssuerDomain('certera.ink', 'karin@nordlys.se', true)).toBe('certera.ink');
    expect(chooseIssuerDomain(null, 'karin@nordlys.se', true)).toBe('nordlys.se');
    expect(chooseIssuerDomain(undefined, 'magnus@gmail.com', true)).toBeNull();
  });
});
