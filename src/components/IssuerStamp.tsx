import { BadgeCheck, CircleHelp } from 'lucide-react';

/**
 * Who stands behind a signed diploma (see supabase/functions/_shared/issuerDomain.ts).
 * A domain means the signer held a confirmed address at that organisation —
 * the same evidence LinkedIn uses to verify a workplace. No domain means a
 * personal address (or a diploma signed before this existed): the institution
 * name is then only the issuer's own claim, and the page says so.
 */
export const IssuerStamp = ({ domain, institution }: { domain: string | null | undefined; institution: string }) =>
  domain ? (
    <p
      className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-foreground"
      title={`Signed by an account with a confirmed @${domain} email address.`}
    >
      <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
      Verified issuer · {domain}
    </p>
  ) : (
    <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
      <CircleHelp className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        Issuer not verified — signed with a personal email address, so “{institution}” is the issuer’s own description.
      </span>
    </p>
  );
