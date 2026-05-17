UPDATE public.app_settings
SET value = '{"provider":"openrouter","model":"anthropic/claude-3.5-sonnet"}'::jsonb,
    updated_at = now()
WHERE key = 'ai_provider';