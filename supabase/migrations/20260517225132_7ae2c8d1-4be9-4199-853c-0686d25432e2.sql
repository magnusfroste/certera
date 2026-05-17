UPDATE public.app_settings
SET value = '{"provider":"openrouter","model":"openai/gpt-4o-mini"}'::jsonb,
    updated_at = now()
WHERE key = 'ai_provider';