// "Add to LinkedIn": a link that opens LinkedIn's Licenses & certifications
// form already filled in, so a recipient adds their certificate in two clicks
// — and their network sees a certera link. The format is LinkedIn's own
// Add-to-Profile URL (addtoprofile.linkedin.com).

const decode = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');

/** Text of the first element with this class in rendered diploma HTML (read as text, never rendered). */
const textOfClass = (html: string, cls: string): string | null => {
  const m = html.match(new RegExp(`<([a-z0-9]+)[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`, 'i'));
  if (!m) return null;
  // Strip tags first, then decode, so an escaped "<" in the text is kept as text.
  const text = decode(m[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  return text || null;
};

/**
 * What the certificate is called on LinkedIn: the course or programme when the
 * design has one, else its title (unless that is only "Certificate of …"
 * boilerplate with nothing specific), else a name built from the institution.
 */
export function certificationName(html: string, institution: string): string {
  const course = textOfClass(html, 'diploma-course');
  if (course) return course.slice(0, 120);
  const title = textOfClass(html, 'diploma-title');
  const generic = /^(certificate|diploma|diplom|certifikat|intyg)(\s+of\s+(completion|achievement|excellence|participation|attendance))?$/i;
  if (title && !generic.test(title)) {
    // Titles are styled uppercase in the design but often typed that way too.
    const pretty = title === title.toUpperCase() ? title.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase()) : title;
    return pretty.slice(0, 120);
  }
  return `${title && title !== title.toUpperCase() ? title : 'Certificate'} — ${institution}`.slice(0, 120);
}

export function linkedInAddToProfileUrl(input: {
  name: string;
  organizationName: string;
  issuedAt: string;
  certUrl: string;
  certId: string;
}): string {
  const issued = new Date(input.issuedAt);
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: input.name,
    organizationName: input.organizationName,
    certUrl: input.certUrl,
    certId: input.certId,
  });
  if (!Number.isNaN(issued.getTime())) {
    params.set('issueYear', String(issued.getUTCFullYear()));
    params.set('issueMonth', String(issued.getUTCMonth() + 1));
  }
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
