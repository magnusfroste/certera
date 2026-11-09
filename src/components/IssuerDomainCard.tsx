import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BadgeCheck, Copy, Globe, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface DomainStatus {
  domain: string | null;
  verified: boolean;
  lastCheckedAt?: string | null;
  record?: { type: string; name: string; value: string };
}

const call = async (action: string, domain?: string) => {
  const { data, error } = await supabase.functions.invoke('issuer-domain', { body: { action, domain } });
  // Errors come back with a friendly message in the body.
  const body = (data ?? (await (error as { context?: Response })?.context?.json?.().catch(() => null))) as
    (DomainStatus & { error?: string; found?: boolean; checked?: boolean }) | null;
  if (!body) throw new Error(error?.message || 'Request failed');
  return body;
};

const CopyField = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 break-all rounded-md border bg-muted/40 px-2 py-1.5 text-xs">{value}</code>
      <Button
        type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label={`Copy ${label}`}
        onClick={() => navigator.clipboard.writeText(value).then(() => toast.success('Copied'), () => toast.error('Could not copy'))}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

/**
 * Prove control of an organisation domain with a DNS TXT record, so signed
 * diplomas carry "Verified issuer · <domain>" even from a personal email
 * account. The check runs server-side (issuer-domain function).
 */
export const IssuerDomainCard = () => {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    call('status').then(setStatus).catch(() => setStatus({ domain: null, verified: false }));
  }, []);

  const run = async (action: string, domain?: string) => {
    setBusy(action);
    try {
      const res = await call(action, domain);
      if (res.error && action !== 'check') { toast.error(res.error); return; }
      setStatus(res);
      if (action === 'check') {
        if (res.error) toast.error(res.error);
        else if (res.found) toast.success(`${res.domain} is verified`);
        else toast.warning('Record not found yet. DNS changes can take a few minutes to appear — try again shortly.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" />Organisation domain</CardTitle>
        <CardDescription>
          Prove that you control your organisation's domain, and every diploma you sign shows
          <span className="font-medium text-foreground"> Verified issuer</span> with that domain — like a verified workplace on LinkedIn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status.verified && status.domain ? (
          <div className="space-y-3">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-sm font-medium">
              <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
              Verified issuer · {status.domain}
            </p>
            <p className="text-xs text-muted-foreground">Diplomas you sign from now on carry this stamp. Keep the DNS record in place.</p>
            <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => run('remove')}>Remove domain</Button>
          </div>
        ) : status.domain && status.record ? (
          <div className="space-y-3">
            <p className="text-sm">
              Add this record at your DNS provider for <span className="font-medium">{status.domain}</span>, then check:
            </p>
            <div className="grid gap-3 sm:grid-cols-[5rem_1fr]">
              <CopyField label="Type" value={status.record.type} />
              <CopyField label="Name / host" value={status.record.name} />
            </div>
            <CopyField label="Value" value={status.record.value} />
            <p className="text-xs text-muted-foreground">
              Some providers add the domain to the host automatically — then enter just <code>_certera</code>.
              {status.lastCheckedAt && ` Last checked ${new Date(status.lastCheckedAt).toLocaleTimeString()}.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!!busy} onClick={() => run('check')} className="gap-1">
                {busy === 'check' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Check DNS
              </Button>
              <Button variant="ghost" disabled={!!busy} onClick={() => run('remove')}>Use another domain</Button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => { e.preventDefault(); run('start', draft); }}
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="issuer-domain">Domain</Label>
              <Input id="issuer-domain" placeholder="nordlys.se" value={draft} onChange={(e) => setDraft(e.target.value)} />
            </div>
            <Button type="submit" disabled={!draft.trim() || !!busy}>
              {busy === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify domain'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
