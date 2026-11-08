import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CUSTOM_PROVIDERS_KEY, parseCustomProviders, secretNameFor, openAICompatibleChat, readChat, ProviderHttpError,
} from "../_shared/customProviders.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claims.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { provider, model } = await req.json();

    let result: { success: boolean; message: string; model: string; latencyMs: number };
    const start = Date.now();

    if (provider === 'anthropic') {
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!apiKey) {
        return new Response(JSON.stringify({ success: false, message: 'ANTHROPIC_API_KEY not configured. Add it as a Supabase secret.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 50,
          messages: [{ role: 'user', content: 'Say "Integration test OK" in exactly those words.' }],
        }),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const err = await response.text();
        result = { success: false, message: `API error ${response.status}: ${err.substring(0, 200)}`, model: model || 'claude-sonnet-4-20250514', latencyMs };
      } else {
        const data = await response.json();
        const text = data.content?.[0]?.text || 'No response';
        result = { success: true, message: text, model: model || 'claude-sonnet-4-20250514', latencyMs };
      }

    } else if (provider === 'openai') {
      const apiKey = Deno.env.get('OPENAI_API_KEY');
      if (!apiKey) {
        return new Response(JSON.stringify({ success: false, message: 'OPENAI_API_KEY not configured. Add it as a Supabase secret.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          max_tokens: 50,
          messages: [{ role: 'user', content: 'Say "Integration test OK" in exactly those words.' }],
        }),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const err = await response.text();
        result = { success: false, message: `API error ${response.status}: ${err.substring(0, 200)}`, model: model || 'gpt-4o-mini', latencyMs };
      } else {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || 'No response';
        result = { success: true, message: text, model: model || 'gpt-4o-mini', latencyMs };
      }

    } else if (provider === 'gemini') {
      const apiKey = Deno.env.get('GEMINI_API_KEY');
      if (!apiKey) {
        return new Response(JSON.stringify({ success: false, message: 'GEMINI_API_KEY not configured. Add it as a Supabase secret.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const selectedModel = model || 'gemini-2.0-flash';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "Integration test OK" in exactly those words.' }] }],
          generationConfig: { maxOutputTokens: 50 },
        }),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const err = await response.text();
        result = { success: false, message: `API error ${response.status}: ${err.substring(0, 200)}`, model: selectedModel, latencyMs };
      } else {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        result = { success: true, message: text, model: selectedModel, latencyMs };
      }

    } else if (provider === 'openrouter') {
      const apiKey = Deno.env.get('OPENROUTER_API_KEY');
      if (!apiKey) {
        return new Response(JSON.stringify({ success: false, message: 'OPENROUTER_API_KEY not configured. Add it as a Supabase secret.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const selectedModel = model || 'openai/gpt-4o-mini';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://certera.ink',
          'X-Title': 'Certera Diploma Generator',
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 50,
          messages: [{ role: 'user', content: 'Say "Integration test OK" in exactly those words.' }],
        }),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const err = await response.text();
        result = { success: false, message: `API error ${response.status}: ${err.substring(0, 200)}`, model: selectedModel, latencyMs };
      } else {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || 'No response';
        result = { success: true, message: text, model: selectedModel, latencyMs };
      }

    } else if (provider === 'firecrawl') {
      const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (!apiKey) {
        return new Response(JSON.stringify({ success: false, message: 'FIRECRAWL_API_KEY not configured. Add it as a Supabase secret.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://example.com',
          formats: ['markdown'],
          onlyMainContent: true,
        }),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const err = await response.text();
        result = { success: false, message: `API error ${response.status}: ${err.substring(0, 200)}`, model: 'scrape', latencyMs };
      } else {
        const data = await response.json();
        result = { success: data.success ?? true, message: data.success ? 'Scrape successful - Firecrawl is working!' : 'Scrape returned unexpected result', model: 'scrape', latencyMs };
      }

    } else {
      // A custom OpenAI-compatible provider registered in /admin.
      const { data: setting } = await supabase
        .from('app_settings').select('value').eq('key', CUSTOM_PROVIDERS_KEY).maybeSingle();
      const custom = parseCustomProviders(setting?.value).find((c) => c.id === provider);
      if (custom) {
        const secret = secretNameFor(custom.id);
        const apiKey = Deno.env.get(secret);
        if (!apiKey) {
          return new Response(JSON.stringify({ success: false, message: `${secret} not configured. Add it as a Supabase secret.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const selectedModel = model || custom.models[0];
        try {
          const { data } = await openAICompatibleChat(custom, apiKey, {
            model: selectedModel,
            max_tokens: 50,
            messages: [{ role: 'user', content: 'Say "Integration test OK" in exactly those words.' }],
          }, { timeoutMs: 45_000 });
          const { text, answeredModel } = readChat(data);
          // A router such as garageai/auto names the model that answered.
          const served = answeredModel && answeredModel !== selectedModel ? ` (answered by ${answeredModel})` : '';
          result = { success: true, message: (text || 'No response') + served, model: selectedModel, latencyMs: Date.now() - start };
        } catch (e) {
          const message = e instanceof ProviderHttpError
            ? `API error ${e.status}: ${e.body.substring(0, 200)}`
            : e instanceof Error ? e.message : String(e);
          result = { success: false, message, model: selectedModel, latencyMs: Date.now() - start };
        }
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: false, message: `Unknown provider: ${provider}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test integration error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
