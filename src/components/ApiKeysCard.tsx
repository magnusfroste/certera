import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_KEY_PREFIX } from '../../supabase/functions/_shared/publicApi';

// Served by the Cloudflare Worker in cloudflare/api-worker, which forwards to the
// api edge function (the Supabase address keeps working too).
const API_BASE = 'https://api.certera.ink';

interface ApiKey { id: string; label: string; prefix: string; created_at: string; last_used_at: string | null }
interface Template { id: string; title: string }

const newKey = () =>
  API_KEY_PREFIX + Array.from(crypto.getRandomValues(new Uint8Array(20))).map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256Hex = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('');
const copy = (text: string) =>
  navigator.clipboard.writeText(text).then(() => toast.success('Copied'), () => toast.error('Could not copy'));

const Snippet = ({ label, code }: { label: string; code: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={() => copy(code)}>
        <Copy className="h-3 w-3" />Copy
      </Button>
    </div>
    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-2 text-xs leading-relaxed"><code>{code}</code></pre>
  </div>
);

/**
 * API keys for the public API (supabase/functions/api): sign certificates from
 * a saved design with one request, or from a course platform's webhook. The
 * key is generated here and only its SHA-256 is stored, so it is shown once.
 */
export const ApiKeysCard = () => {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [label, setLabel] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('api_keys')
      .select('id, label, prefix, created_at, last_used_at').order('created_at', { ascending: false });
    setKeys((data as ApiKey[] | null) ?? []);
  };
  useEffect(() => {
    load();
    supabase.from('diploma_sessions').select('id, title').order('updated_at', { ascending: false }).limit(20)
      .then(({ data }) => setTemplates((data as Template[] | null) ?? []));
  }, []);

  const create = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const key = newKey();
    const { error } = user
      ? await supabase.from('api_keys').insert({
          user_id: user.id, label: label.trim() || 'API key', token_hash: await sha256Hex(key), prefix: key.slice(0, 12),
        })
      : { error: { message: 'Not signed in' } };
    setBusy(false);
    if (error) { toast.error(`Could not create the key: ${error.message}`); return; }
    setFresh(key);
    setLabel('');
    load();
  };

  const remove = async (k: ApiKey) => {
    const { error } = await supabase.from('api_keys').delete().eq('id', k.id);
    if (error) toast.error(`Could not delete: ${error.message}`);
    else { toast.success(`Deleted "${k.label}" — it stops working immediately`); load(); }
  };

  const tpl = templates[0]?.id ?? 'YOUR_TEMPLATE_ID';
  const shownKey = fresh ?? 'cert_YOUR_KEY';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" />API</CardTitle>
        <CardDescription>
          Issue certificates from your own system: one request signs a certificate from one of your designs and returns
          its link. Or point your course platform's “course completed” webhook at certera and let it happen by itself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <div className="flex-1 space-y-1">
            <Label htmlFor="api-key-label">New key</Label>
            <Input id="api-key-label" placeholder="What is it for? e.g. Teachable" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="gap-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create key
          </Button>
        </form>

        {fresh && (
          <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3" role="status">
            <p className="text-sm font-medium">Copy your key now — it is not shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 break-all rounded-md border bg-background px-2 py-1.5 text-xs">{fresh}</code>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Copy API key" onClick={() => copy(fresh)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {keys === null ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : keys.length > 0 && (
          <ul className="divide-y rounded-md border text-sm">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-medium">{k.label}</span>
                <code className="text-xs text-muted-foreground">{k.prefix}…</code>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleDateString()}` : 'never used'}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Delete key ${k.label}`} onClick={() => remove(k)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Your designs</p>
          {templates.length === 0 ? (
            <p className="text-xs text-muted-foreground">Design a diploma in the studio first — each saved design is a template you can issue from.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {templates.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <code className="text-muted-foreground">{t.id}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Copy template id for ${t.title}`} onClick={() => copy(t.id)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Snippet
            label="Issue a certificate"
            code={`curl -X POST ${API_BASE}/v1/certificates \\\n  -H "Authorization: Bearer ${shownKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"template_id": "${tpl}", "recipient_name": "Ada Lovelace"}'`}
          />
          <Snippet
            label="Webhook URL for your course platform (“course completed”)"
            code={`${API_BASE}/v1/hooks/${tpl}?key=${shownKey}`}
          />
          <p className="text-xs text-muted-foreground">
            The response contains the certificate's <code>url</code> to send to the learner. The webhook reads the learner's name
            from the payload (add <code>&amp;name_field=path.to.name</code> if it is somewhere unusual). Repeated requests are safe:
            send an <code>Idempotency-Key</code> header, and webhook retries never sign twice. Certificates carry your
            Verified issuer stamp when your domain is verified above.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
