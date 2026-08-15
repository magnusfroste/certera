import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, KeyRound, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OpsToken {
  id: string;
  label: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

/** 32 random bytes, hex encoded, with a recognisable prefix. */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `ops_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ops-mcp`;

export const AdminOpsTokens = () => {
  const [tokens, setTokens] = useState<OpsToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [minting, setMinting] = useState(false);
  // Shown once, right after minting — the plaintext is never stored anywhere.
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('ops_tokens')
      .select('id, label, prefix, created_at, last_used_at')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Could not load ops keys');
    } else {
      setTokens((data ?? []) as OpsToken[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mint = async () => {
    const name = label.trim();
    if (!name) {
      toast.error('Give the key a name so you can tell it apart later');
      return;
    }
    setMinting(true);
    try {
      const token = generateToken();
      const { data: { user } } = await supabase.auth.getUser();
      // Only the hash leaves the browser — the server never sees the plaintext.
      const { error } = await supabase.from('ops_tokens').insert({
        label: name,
        token_hash: await sha256Hex(token),
        prefix: token.slice(0, 12),
        created_by: user?.id ?? null,
      });
      if (error) throw new Error(error.message);
      setFreshToken(token);
      setLabel('');
      await load();
      toast.success('Key created — copy it now, it is not shown again');
    } catch (e) {
      toast.error(`Could not create the key: ${(e as Error).message}`);
    } finally {
      setMinting(false);
    }
  };

  const revoke = async (id: string, name: string) => {
    const { error } = await supabase.from('ops_tokens').delete().eq('id', id);
    if (error) {
      toast.error(`Could not revoke ${name}: ${error.message}`);
      return;
    }
    toast.success(`Revoked ${name}`);
    load();
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Ops MCP keys
          </CardTitle>
          <CardDescription>
            Keys that grant access to the operations endpoint — traffic, sign-ups, diploma volume, token spend and
            provider health, plus changing the active AI provider. Treat them like production credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="ops-key-label">Key name</Label>
              <Input
                id="ops-key-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && mint()}
                placeholder="e.g. Magnus laptop, monitoring bot"
              />
            </div>
            <Button onClick={mint} disabled={minting}>
              {minting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create key'}
            </Button>
          </div>

          {freshToken && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Copy this key now — it is stored hashed and cannot be shown again.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono break-all">{freshToken}</code>
                <Button size="sm" variant="outline" onClick={() => copy(freshToken)} aria-label="Copy key">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">MCP client configuration</summary>
                <pre className="mt-2 bg-muted rounded p-3 overflow-x-auto">{`{
  "mcpServers": {
    "certera-ops": {
      "type": "http",
      "url": "${endpoint}",
      "headers": { "Authorization": "Bearer ${freshToken}" }
    }
  }
}`}</pre>
              </details>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No keys yet. Create one to connect an MCP client.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.label}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.prefix}…</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.last_used_at ? (
                        new Date(t.last_used_at).toLocaleString()
                      ) : (
                        <Badge variant="outline">Never used</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revoke(t.id, t.label)}
                        aria-label={`Revoke key ${t.label}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOpsTokens;
