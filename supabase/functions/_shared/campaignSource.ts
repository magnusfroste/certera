// Campaign attribution for page views (see the page_views_source migration).
// Shared by the PageTracker beacon (campaignSource) and the track function
// (cleanSource), which is the one that decides what gets stored.

/** "source" or "source/campaign" from a landing URL's query (?utm_source, ?utm_campaign, ?ref), or ''. */
export function campaignSource(search: string): string {
  const q = new URLSearchParams(search);
  const source = q.get('utm_source') || q.get('ref') || '';
  const campaign = q.get('utm_campaign') || '';
  return source ? (campaign ? `${source}/${campaign}` : source) : '';
}

/**
 * The tag as stored, e.g. "linkedin" or "linkedin/launch-nov". Only short
 * lowercase tags are kept: anything that does not look like a campaign name
 * (an email address, a long id, free text) is dropped rather than stored.
 */
export function cleanSource(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const parts = raw.toLowerCase().split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0 || parts.length > 2 || !parts.every((p) => /^[a-z0-9._-]{1,40}$/.test(p))) return null;
  return parts.join('/');
}
