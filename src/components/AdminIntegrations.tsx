import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Loader2, ExternalLink, Zap, Globe, Brain, Sparkles, Save, Network, Info } from 'lucide-react';
import { toast } from 'sonner';

interface IntegrationConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  secretName: string;
  getKeyUrl: string;
  getKeyInstructions: string;
  supabaseSecretCommand: string;
  models: { value: string; label: string }[];
}

const integrations: IntegrationConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    icon: <Brain className="h-5 w-5" />,
    description: 'Claude models for diploma generation. Default integration.',
    secretName: 'ANTHROPIC_API_KEY',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    getKeyInstructions: 'Create account at console.anthropic.com → Settings → API Keys → Create Key',
    supabaseSecretCommand: 'supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Latest)' },
      { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fast/Cheap)' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most capable)' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'GPT models as alternative AI provider.',
    secretName: 'OPENAI_API_KEY',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    getKeyInstructions: 'Sign in at platform.openai.com → API Keys → Create new secret key',
    supabaseSecretCommand: 'supabase secrets set OPENAI_API_KEY=sk-xxxxx',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast/Cheap)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Cheapest)' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: <Zap className="h-5 w-5" />,
    description: 'Google Gemini models with multimodal capabilities.',
    secretName: 'GEMINI_API_KEY',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    getKeyInstructions: 'Go to aistudio.google.com → Get API Key → Create API Key',
    supabaseSecretCommand: 'supabase secrets set GEMINI_API_KEY=AIzaxxxxx',
    models: [
      { value: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro (Latest)' },
      { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Cheapest)' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Multi-provider gateway)',
    icon: <Network className="h-5 w-5" />,
    description: 'Single API key to access 100+ models (OpenAI, Anthropic, Google, Mistral, Llama, etc.).',
    secretName: 'OPENROUTER_API_KEY',
    getKeyUrl: 'https://openrouter.ai/keys',
    getKeyInstructions: 'Sign in at openrouter.ai → Keys → Create Key. Add credits or use free-tier models.',
    supabaseSecretCommand: 'supabase secrets set OPENROUTER_API_KEY=sk-or-xxxxx',
    models: [
      { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Cheap, recommended)' },
      { value: 'openai/gpt-4o', label: 'GPT-4o' },
      { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
      { value: 'anthropic/claude-3.7-sonnet', label: 'Claude 3.7 Sonnet' },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
      { value: 'mistralai/mistral-large', label: 'Mistral Large' },
      { value: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek Chat (Cheap)' },
    ],
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl (Web Scraper)',
    icon: <Globe className="h-5 w-5" />,
    description: 'Web scraping to fetch branding data from websites.',
    secretName: 'FIRECRAWL_API_KEY',
    getKeyUrl: 'https://www.firecrawl.dev/app/api-keys',
    getKeyInstructions: 'Create account at firecrawl.dev → Dashboard → API Keys → Create API Key',
    supabaseSecretCommand: 'supabase secrets set FIRECRAWL_API_KEY=fc-xxxxx',
    models: [{ value: 'scrape', label: 'Scrape (Standard)' }],
  },
];

interface TestResult {
  success: boolean;
  message: string;
  model: string;
  latencyMs: number;
}

const AdminIntegrations = () => {
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [activeProvider, setActiveProvider] = useState('anthropic');
  const [activeModel, setActiveModel] = useState('claude-sonnet-4-20250514');
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ai_provider')
      .maybeSingle();

    if (error) {
      console.error('Failed to load AI provider setting:', error);
      toast.error('Could not load the current AI provider setting');
    }
    if (data?.value) {
      const val = data.value as { provider: string; model: string };
      setActiveProvider(val.provider);
      setActiveModel(val.model);
    }
    setLoadingSettings(false);
  };

  const saveActiveProvider = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .update({
        value: { provider: activeProvider, model: activeModel },
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'ai_provider');

    if (error) {
      toast.error('Failed to save setting');
    } else {
      toast.success(`Active provider: ${activeProvider} / ${activeModel}`);
    }
    setSaving(false);
  };

  const testIntegration = async (integration: IntegrationConfig) => {
    const model = selectedModels[integration.id] || integration.models[0].value;
    setTesting(integration.id);
    try {
      const { data, error } = await supabase.functions.invoke('test-integration', {
        body: { provider: integration.id, model },
      });
      if (error) {
        setResults(prev => ({ ...prev, [integration.id]: { success: false, message: error.message, model, latencyMs: 0 } }));
        toast.error(`${integration.name}: Test failed`);
      } else {
        setResults(prev => ({ ...prev, [integration.id]: data }));
        if (data.success) {
          toast.success(`${integration.name}: OK (${data.latencyMs}ms)`);
        } else {
          toast.error(`${integration.name}: ${data.message}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setResults(prev => ({ ...prev, [integration.id]: { success: false, message, model, latencyMs: 0 } }));
    } finally {
      setTesting(null);
    }
  };

  const activeIntegration = integrations.find(i => i.id === activeProvider);

  return (
    <div className="space-y-4">
      {/* Active provider selector */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Active AI Provider for Diploma Generation
          </CardTitle>
          <CardDescription>This provider is used for all diploma generations.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={activeProvider} onValueChange={(v) => {
                setActiveProvider(v);
                const integration = integrations.find(i => i.id === v);
                if (integration) setActiveModel(integration.models[0].value);
              }}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {integrations.filter(i => i.id !== 'firecrawl').map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeIntegration && (
                <Select value={activeModel} onValueChange={setActiveModel}>
                  <SelectTrigger className="w-full sm:flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activeIntegration.models.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button onClick={saveActiveProvider} disabled={saving} className="gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model requirements */}
      <Card className="border-dashed bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Model requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p>For the AI to produce valid diplomas, the model must support:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Structured JSON output</strong> (response_format / tool calling / responseSchema) — the DSL is locked to a JSON schema.</li>
            <li><strong>System prompts</strong> and a context window of at least <strong>16k tokens</strong>.</li>
            <li><strong>Instruction following</strong> at GPT-4 / Claude 3.5 / Gemini 1.5+ level — smaller models often break the schema.</li>
            <li><strong>Vision input</strong> (optional) only if you want image-inspired generation.</li>
          </ul>
          <p className="pt-1">Recommended: Claude Sonnet 4, GPT-4o, Gemini 2.5 Pro, or equivalent via OpenRouter.</p>
        </CardContent>
      </Card>

      {/* Self-hosting info */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🔧 Self-hosting / VPS Setup</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>certera.ink is open source. Configure API keys as Supabase secrets:</p>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`# Supabase CLI
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
supabase secrets set OPENAI_API_KEY=sk-xxxxx
supabase secrets set GEMINI_API_KEY=AIzaxxxxx
supabase secrets set OPENROUTER_API_KEY=sk-or-xxxxx
supabase secrets set FIRECRAWL_API_KEY=fc-xxxxx`}
          </pre>
        </CardContent>
      </Card>

      {/* Integration cards */}
      {integrations.map(integration => {
        const result = results[integration.id];
        const isTesting = testing === integration.id;
        const selectedModel = selectedModels[integration.id] || integration.models[0].value;
        const isActive = integration.id === activeProvider;

        return (
          <Card key={integration.id} className={isActive ? 'border-primary/50 bg-primary/5' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {integration.icon}
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {integration.name}
                      {isActive && <Badge variant="default" className="text-xs">Active</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs">{integration.description}</CardDescription>
                  </div>
                </div>
                {result && (
                  <Badge variant={result.success ? 'default' : 'destructive'} className="gap-1">
                    {result.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {result.success ? `OK ${result.latencyMs}ms` : 'Error'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {integration.models.length > 1 && (
                  <Select
                    value={selectedModel}
                    onValueChange={(v) => setSelectedModels(prev => ({ ...prev, [integration.id]: v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {integration.models.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={() => testIntegration(integration)} disabled={isTesting} size="sm">
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {isTesting ? 'Testing...' : 'Test'}
                </Button>
              </div>

              {result && (
                <div className={`text-xs p-2 rounded ${result.success ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                  <p className="font-mono break-all">{result.message}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Secret: <code className="bg-muted px-1 rounded">{integration.secretName}</code></span>
                <span>·</span>
                <a href={integration.getKeyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  Get API Key <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground">{integration.getKeyInstructions}</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{integration.supabaseSecretCommand}</pre>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminIntegrations;
