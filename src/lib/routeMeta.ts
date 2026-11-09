// Per-route <head> metadata.
//
// The site is a client-rendered SPA: index.html ships one title, description
// and canonical (https://www.certera.ink/) for every URL, so search engines
// saw every page as a duplicate of the home page. RouteMeta applies these on
// navigation; Google renders JavaScript and picks them up. Private and
// per-person pages (studio, account, admin, individual diplomas) are noindex.

export const SITE_ORIGIN = 'https://www.certera.ink';
const SUFFIX = ' | certera.ink';

export interface RouteMeta {
  title: string;
  description: string;
  /** Absolute canonical URL. */
  canonical: string;
  noindex: boolean;
}

const DEFAULT_DESCRIPTION =
  'Design diplomas and certificates with AI in seconds, then issue them with a public verification link recorded on the Hedera blockchain. Free to try, no account needed.';

const PUBLIC: Record<string, Omit<RouteMeta, 'canonical' | 'noindex'>> = {
  '/': {
    title: 'certera.ink — AI diploma & certificate maker with blockchain verification',
    description: DEFAULT_DESCRIPTION,
  },
  '/demo': {
    title: 'Free AI certificate maker — design a diploma in seconds' + SUFFIX,
    description:
      'Describe the diploma or certificate you need, or start from a template, and the AI designs it for you. Free, no account needed to try.',
  },
  '/verify': {
    title: 'Verify a diploma or certificate' + SUFFIX,
    description:
      'Check that a certera.ink diploma is authentic: enter its ID to see the record registered on the Hedera blockchain. No account needed.',
  },
};

const PRIVATE: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === '/auth', title: 'Sign in or create an account' + SUFFIX },
  { match: (p) => p === '/app', title: 'Studio' + SUFFIX },
  { match: (p) => p === '/profile', title: 'Profile' + SUFFIX },
  { match: (p) => p === '/signed', title: 'Signed diplomas' + SUFFIX },
  { match: (p) => p === '/health', title: 'Status' + SUFFIX },
  { match: (p) => p === '/admin' || p.startsWith('/admin/'), title: 'Admin' + SUFFIX },
  { match: (p) => p.startsWith('/diploma/'), title: 'Verified diploma' + SUFFIX },
  { match: (p) => p.startsWith('/embed/'), title: 'Verified diploma' + SUFFIX },
  { match: (p) => p.startsWith('/verify/'), title: 'Diploma verification' + SUFFIX },
];

export function metaForPath(pathname: string): RouteMeta {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const pub = PUBLIC[path];
  if (pub) return { ...pub, canonical: SITE_ORIGIN + path, noindex: false };
  const priv = PRIVATE.find((r) => r.match(path));
  if (priv) {
    return { title: priv.title, description: DEFAULT_DESCRIPTION, canonical: SITE_ORIGIN + path, noindex: true };
  }
  return { title: 'Page not found' + SUFFIX, description: DEFAULT_DESCRIPTION, canonical: SITE_ORIGIN + '/', noindex: true };
}
