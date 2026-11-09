import { BadgeCheck, CircleHelp } from 'lucide-react';

/**
 * Who stands behind a signed diploma (see supabase/functions/_shared/issuerDomain.ts).
 * A domain means the signer proved control of it: a confirmed address there
 * (the evidence LinkedIn uses for a workplace) or a DNS record. No domain
 * means neither (or a diploma signed before this existed): the institution
 * name is then only the issuer's own claim, and the page says so.
 */
export const IssuerStamp = ({ domain, institution }: { domain: string | null | undefined; institution: string }) =>
  domain ? (
    <p
      className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-foreground"
      title={`The issuer proved control of ${domain} — with a confirmed email address there or a DNS record.`}
    >
      <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
      Verified issuer · {domain}
    </p>
  ) : (
    <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
      <CircleHelp className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        Issuer not verified — “{institution}” is the issuer’s own description.
      </span>
    </p>
  );
