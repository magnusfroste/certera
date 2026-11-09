// ─────────────────────────────────────────────────────────────────
// Issuer domain: who stands behind a signed diploma
// ─────────────────────────────────────────────────────────────────
// Anyone can type any institution name when signing, so "Authentic diploma"
// only ever proved that a diploma is unchanged — not who issued it. The
// account's CONFIRMED email domain is evidence the issuer actually holds:
// karin@nordlys.se signing for "Nordlys Consulting AB" can only have done so
// with access to a nordlys.se mailbox. Personal mail providers prove nothing
// about an organisation, so they yield no domain.
//
// Computed server-side by hedera-sign from the authenticated user, written
// into the Hedera message and hedera_signatures; the database copies it into
// signed_diplomas (a client can never set it). The app also uses it to tell a
// signer up front what their diplomas will show.

// Providers where anyone can get an address. Matched on the whole domain, and
// on the provider label for families with many country domains (hotmail.se,
// yahoo.co.uk, …).
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'msn.com',
  'proton.me', 'protonmail.com', 'protonmail.ch', 'pm.me', 'tutanota.com', 'tutanota.de', 'tuta.io', 'tuta.com',
  'mail.com', 'email.com', 'zoho.com', 'zohomail.com', 'hey.com', 'fastmail.com', 'fastmail.fm', 'mailbox.org',
  'web.de', 'mail.ru', 'qq.com', '163.com', '126.com', 'naver.com',
  // Swedish ISPs and portals
  'telia.com', 'bredband.net', 'bredband2.com', 'spray.se', 'comhem.se', 'tele2.se', 'bahnhof.se',
  'passagen.se', 'home.se', 'swipnet.se', 'glocalnet.net', 'ownit.se', 'tiscali.se',
]);
const PERSONAL_FAMILIES = new Set(['hotmail', 'outlook', 'live', 'yahoo', 'ymail', 'gmx', 'yandex', 'rocketmail']);

const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** True for addresses anyone can sign up for (gmail.com, hotmail.se, …). */
export function isPersonalEmailDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  if (PERSONAL_DOMAINS.has(d)) return true;
  return PERSONAL_FAMILIES.has(d.split('.')[0]);
}

/**
 * The organisation domain an email address proves, or null: for a malformed
 * or unconfirmed address, and for personal mail providers.
 */
export function issuerDomainFromEmail(email: unknown, confirmed: boolean): string | null {
  if (!confirmed || typeof email !== 'string') return null;
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase().replace(/\.$/, '');
  if (!DOMAIN.test(domain)) return null;
  return isPersonalEmailDomain(domain) ? null : domain;
}

// ─────────────────────────────────────────────────────────────────
// DNS-verified domains (organisations without a mailbox on their domain)
// ─────────────────────────────────────────────────────────────────
// An account can prove control of a domain by publishing a TXT record:
//   _certera.<domain>  TXT  "certera-verify=<token>"
// The issuer-domain edge function hands out the token and checks the record;
// only it can mark a domain verified. A DNS-verified domain takes precedence
// over the email domain when signing, since verifying one is an explicit
// choice to issue as that organisation.

export const dnsRecordName = (domain: string) => `_certera.${domain}`;
export const dnsRecordValue = (token: string) => `certera-verify=${token}`;

/**
 * What someone typed as their domain ("https://www.Nordlys.se/about") as a
 * bare domain ("nordlys.se"), or null when it is not a domain an
 * organisation can own (malformed, or a personal mail provider).
 */
export function normalizeDomainInput(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let d = raw.trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');   // scheme
  d = d.split(/[/?#]/)[0];                         // path, query, fragment
  d = d.replace(/^[^@]*@/, '');                    // user@ (also pasted emails)
  d = d.replace(/:\d+$/, '').replace(/\.$/, '');   // port, trailing dot
  d = d.replace(/^www\./, '');
  if (!DOMAIN.test(d) || isPersonalEmailDomain(d)) return null;
  return d;
}

/**
 * Whether DNS TXT answers contain the expected value. Resolvers return each
 * record quoted, and long records as several quoted strings ("a" "b").
 */
export function txtRecordsMatch(answers: string[], token: string): boolean {
  const want = dnsRecordValue(token);
  return answers.some((raw) => {
    const parts = raw.match(/"((?:[^"\\]|\\.)*)"/g);
    const value = parts ? parts.map((p) => p.slice(1, -1)).join('') : raw;
    return value.trim() === want;
  });
}

/** The domain a signature carries: a DNS-verified domain first, else the confirmed email's. */
export function chooseIssuerDomain(
  dnsVerifiedDomain: string | null | undefined,
  email: unknown,
  emailConfirmed: boolean,
): string | null {
  return dnsVerifiedDomain || issuerDomainFromEmail(email, emailConfirmed);
}
