import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pencil, Plus, Server, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
// The same validation the edge functions apply when they read this setting —
// anything the server would drop is refused here instead of vanishing silently.
import {
  CUSTOM_PROVIDERS_KEY,
  secretNameFor,
  validateCustomProvider,
  type CustomProvider,
} from '../../supabase/functions/_shared/customProviders';

const GARAGEAI_PRESET = {
  id: 'garageai',
  label: 'GarageAI',
  baseUrl: 'https://api.garageai.eu/v1',
  models: 'garageai/auto',
};

const EMPTY = { id: '', label: '', baseUrl: '', models: '' };

interface Props {
  providers: CustomProvider[];
  activeProvider: string;
  onSaved: (providers: CustomProvider[]) => void;
}

/** Add, edit, enable and remove OpenAI-compatible providers (app_settings.custom_providers). */
export const CustomProvidersEditor = ({ providers, activeProvider, onSaved }: Props) => {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const persist = async (next: CustomProvider[], success: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: CUSTOM_PROVIDERS_KEY, value: next as unknown as never, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) {
      toast.error(`Could not save providers: ${error.message}`);
      return false;
    }
    onSaved(next);
    toast.success(success);
    return true;
  };

  const submit = async () => {
    const { provider, error } = validateCustomProvider({
      ...form,
      models: form.models.split(/[\n,]/),
      enabled: editingId ? providers.find((p) => p.id === editingId)?.enabled ?? true : true,
    });
    if (!provider) {
      toast.error(error);
      return;
    }
    if (editingId && provider.id !== editingId) {
      toast.error('The id cannot be changed — it selects the secret name. Remove the provider and add it again.');
      return;
    }
    if (!editingId && providers.some((p) => p.id === provider.id)) {
      toast.error(`A provider with id "${provider.id}" already exists.`);
      return;
    }
    // The active provider must keep serving the model it is configured with.
    if (editingId === activeProvider) {
      const old = providers.find((p) => p.id === editingId);
      const dropped = old?.models.filter((m) => !provider.models.includes(m)) ?? [];
      if (dropped.length) toast.warning(`Removed model(s) ${dropped.join(', ')} — check the active model below.`);
    }
    const next = editingId
      ? providers.map((p) => (p.id === editingId ? provider : p))
      : [...providers, provider];
    if (await persist(next, editingId ? `Updated ${provider.label}` : `Added ${provider.label}`)) {
      setForm(EMPTY);
      setEditingId(null);
      setShowForm(false);
    }
  };

  const edit = (p: CustomProvider) => {
    setForm({ id: p.id, label: p.label, baseUrl: p.baseUrl, models: p.models.join('\n') });
    setEditingId(p.id);
    setShowForm(true);
  };

  const toggle = (p: CustomProvider, enabled: boolean) => {
    if (!enabled && p.id === activeProvider) {
      toast.error(`${p.label} is the active provider. Switch the active provider first.`);
      return;
    }
    persist(providers.map((x) => (x.id === p.id ? { ...x, enabled } : x)), `${p.label} ${enabled ? 'enabled' : 'disabled'}`);
  };

  const remove = (p: CustomProvider) => {
    if (p.id === activeProvider) {
      toast.error(`${p.label} is the active provider. Switch the active provider first.`);
      return;
    }
    if (!window.confirm(`Remove ${p.label}? Its Supabase secret is not deleted.`)) return;
    persist(providers.filter((x) => x.id !== p.id), `Removed ${p.label}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Server className="h-4 w-4" />
          Custom providers (OpenAI-compatible)
        </CardTitle>
        <CardDescription className="text-xs">
          Any endpoint that speaks the OpenAI chat completions API — a private gateway, a self-hosted model, GarageAI.
          The URL and model names live here; the API key is a Supabase secret named after the id.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No custom providers yet.</p>
        )}

        {providers.map((p) => (
          <div key={p.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{p.label}</span>
                  <code className="text-xs text-muted-foreground">{p.id}</code>
                  {p.id === activeProvider && <Badge className="text-xs">Active</Badge>}
                  {!p.enabled && <Badge variant="outline" className="text-xs">Disabled</Badge>}
                </div>
                <p className="text-xs text-muted-foreground font-mono break-all">{p.baseUrl}</p>
                <p className="text-xs text-muted-foreground">Models: {p.models.join(', ')}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={p.enabled}
                  onCheckedChange={(v) => toggle(p, v)}
                  disabled={saving}
                  aria-label={`${p.enabled ? 'Disable' : 'Enable'} ${p.label}`}
                />
                <Button size="icon" variant="ghost" onClick={() => edit(p)} disabled={saving} aria-label={`Edit ${p.label}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(p)} disabled={saving} aria-label={`Remove ${p.label}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              supabase secrets set {secretNameFor(p.id)}=your-key
            </pre>
          </div>
        ))}

        {showForm ? (
          <div className="rounded-md border border-primary/30 p-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cp-id">Id</Label>
                <Input
                  id="cp-id"
                  value={form.id}
                  disabled={!!editingId}
                  onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase() })}
                  placeholder="garageai"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-label">Name</Label>
                <Input id="cp-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="GarageAI" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cp-url">Base URL</Label>
              <Input
                id="cp-url"
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cp-models">Models (one per line — the first is the default)</Label>
              <Textarea
                id="cp-models"
                rows={3}
                value={form.models}
                onChange={(e) => setForm({ ...form, models: e.target.value })}
                placeholder="garageai/auto"
              />
            </div>
            {form.id && (
              <p className="text-xs text-muted-foreground">
                API key secret: <code className="bg-muted px-1 rounded">{secretNameFor(form.id.trim() || 'id')}</code>
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={submit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editingId ? 'Save changes' : 'Add provider'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setForm(EMPTY); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Add provider
            </Button>
            {!providers.some((p) => p.id === GARAGEAI_PRESET.id) && (
              <Button size="sm" variant="ghost" onClick={() => { setForm(GARAGEAI_PRESET); setShowForm(true); }}>
                Use GarageAI preset
              </Button>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          The key is sent to the URL above, so only change a URL you control. Keys are named{' '}
          <code className="bg-muted px-1 rounded">LLM_&lt;ID&gt;_API_KEY</code> on purpose: a custom provider can never be
          handed the key of a built-in provider such as OpenRouter.
        </p>
      </CardContent>
    </Card>
  );
};

export default CustomProvidersEditor;
