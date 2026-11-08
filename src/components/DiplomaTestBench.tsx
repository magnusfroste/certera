import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Loader2 } from 'lucide-react';
import { DiplomaFrame } from '@/components/DiplomaFrame';

export interface BenchProvider {
  id: string;
  name: string;
  models: string[];
}

interface Run {
  provider: string;
  model: string;
  ms: number;
  ok: boolean;
  html?: string;
  css?: string;
  answeredModel?: string | null;
  design?: string;
  error?: string;
}

const DEFAULT_PROMPT =
  'A course completion certificate for Ada Lovelace in Applied Mathematics from the Royal Institute of Analytics, navy and gold, formal.';

/**
 * Generate a real diploma with any provider/model WITHOUT changing the active
 * provider for visitors. generate-diploma honours `providerOverride` only for
 * a verified admin and does not fall back, so a result always comes from the
 * provider under test. Runs are logged with phase "admin-test".
 */
export const DiplomaTestBench = ({ providers }: { providers: BenchProvider[] }) => {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [model, setModel] = useState(providers[0]?.models[0] ?? '');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);

  const current = providers.find((p) => p.id === providerId);

  const run = async () => {
    if (!current || !model) return;
    setRunning(true);
    const started = performance.now();
    const { data, error } = await supabase.functions.invoke('generate-diploma', {
      body: {
        messages: [{ role: 'user', content: prompt }],
        providerOverride: { provider: current.id, model },
      },
    });
    const ms = Math.round(performance.now() - started);
    let entry: Run;
    if (error || !data?.html) {
      // supabase-js hides a non-2xx body behind a generic message; read it.
      let detail = error?.message ?? 'No diploma returned';
      const ctx = (error as { context?: Response } | null)?.context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const body = await ctx.json();
          detail = body.error ?? body.message ?? detail;
        } catch { /* keep the generic message */ }
      }
      entry = { provider: current.id, model, ms, ok: false, error: detail };
    } else {
      const d = data.dsl ?? {};
      entry = {
        provider: data.provider,
        model: data.model,
        ms,
        ok: true,
        html: data.html,
        css: data.css,
        answeredModel: data.answeredModel,
        design: [d.palette, d.typography?.pair, d.layout?.composition, d.layout?.orientation].filter(Boolean).join(' · '),
      };
    }
    setRuns((prev) => [entry, ...prev].slice(0, 6));
    setRunning(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          Diploma test bench
        </CardTitle>
        <CardDescription className="text-xs">
          Generate a real diploma with any provider and model to compare quality and speed. Visitors keep using the
          active provider; a test never falls back to another one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={providerId}
            onValueChange={(v) => {
              setProviderId(v);
              setModel(providers.find((p) => p.id === v)?.models[0] ?? '');
            }}
          >
            <SelectTrigger className="w-full sm:w-[220px]" aria-label="Provider to test">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-full sm:flex-1" aria-label="Model to test">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {(current?.models ?? []).map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="bench-prompt">Prompt</Label>
          <Textarea id="bench-prompt" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        <Button onClick={run} disabled={running || !current || !model || !prompt.trim()} className="gap-1">
          {running && <Loader2 className="h-4 w-4 animate-spin" />}
          {running ? 'Generating…' : 'Generate test diploma'}
        </Button>

        {runs.map((r, i) => (
          <div key={`${r.provider}-${r.ms}-${i}`} className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-medium">{r.provider} / {r.model}</span>
              {r.answeredModel && r.answeredModel !== r.model && (
                <span className="text-muted-foreground">answered by {r.answeredModel}</span>
              )}
              <span className="text-muted-foreground">{(r.ms / 1000).toFixed(1)} s</span>
              {r.design && <span className="text-muted-foreground">{r.design}</span>}
            </div>
            {r.ok && r.html && r.css ? (
              <DiplomaFrame html={r.html} css={r.css} title={`Test diploma from ${r.provider}`} fitToWidth minHeight={200} />
            ) : (
              <p className="text-xs text-destructive font-mono break-all">{r.error}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DiplomaTestBench;
