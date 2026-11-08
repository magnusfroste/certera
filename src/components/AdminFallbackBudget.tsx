import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  FALLBACK_POLICY_KEY,
  MAX_FALLBACK_BUDGET_USD,
  isValidFallbackBudget,
  parseFallbackBudget,
} from '../../supabase/functions/_shared/fallbackBudget';

const describe = (budget: number | null) =>
  budget === null
    ? 'No cap: when the active provider fails, every request may fall back to a paid provider.'
    : budget === 0
      ? 'Best effort: never falls back to a paid provider. Visitors see "busy, try again" while the active provider is down.'
      : `Falls back to paid providers until about $${budget.toFixed(2)} has been spent today (UTC), then shows "busy, try again".`;

/** Daily cap on the paid fallback (app_settings.fallback_policy), enforced by generate-diploma. */
export const AdminFallbackBudget = () => {
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [limited, setLimited] = useState(false);
  const [draft, setDraft] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', FALLBACK_POLICY_KEY)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error('Could not load the fallback budget');
        const budget = parseFallbackBudget(data?.value);
        setSaved(budget);
        setLimited(budget !== null);
        setDraft(budget === null ? '0' : String(budget));
        setLoaded(true);
      });
  }, []);

  const parsed = Number(draft.trim());
  const valid = !limited || (draft.trim() !== '' && isValidFallbackBudget(parsed));
  const next = limited ? Math.round(parsed * 100) / 100 : null;
  const unchanged = next === saved;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: FALLBACK_POLICY_KEY, value: { dailyBudgetUsd: next }, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) {
      toast.error(`Could not save: ${error.message}`);
      return;
    }
    setSaved(next);
    toast.success(
      next === null ? 'Paid fallback is no longer capped' : next === 0 ? 'Best effort: no paid fallback' : `Paid fallback capped at $${next.toFixed(2)} per day`,
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Paid fallback
        </CardTitle>
        <CardDescription className="text-xs">
          When the active provider fails, generation falls back to the other providers that have a key. This caps what
          the paid ones (Anthropic, OpenAI, Gemini, OpenRouter) may cost per day. The active provider and your own
          custom providers are never capped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!loaded ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Switch id="fallback-limited" checked={limited} onCheckedChange={setLimited} />
              <Label htmlFor="fallback-limited">Limit paid fallback</Label>
            </div>
            <div className="flex items-end gap-2">
              {limited && (
                <div className="space-y-1">
                  <Label htmlFor="fallback-budget">Max USD per day</Label>
                  <Input
                    id="fallback-budget"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={MAX_FALLBACK_BUDGET_USD}
                    step={0.5}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-32"
                    aria-invalid={!valid}
                  />
                </div>
              )}
              <Button onClick={save} disabled={!valid || saving || unchanged} className="gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
            {!valid && (
              <p className="text-xs text-destructive">Enter an amount from 0 to {MAX_FALLBACK_BUDGET_USD}.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Now: {describe(saved)} 0 means best effort. Costs are estimates from the price table; the ops agent's{' '}
              <code>get_token_usage</code> shows today's fallback spend.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminFallbackBudget;
