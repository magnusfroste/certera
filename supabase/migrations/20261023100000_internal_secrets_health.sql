-- Hemlig nyckel för interna hälsokontroller (hedera-health). Värdet skapas
-- i databasen och ska inte ligga i repot.
create table if not exists public.internal_secrets (name text primary key, value text not null, created_at timestamptz not null default now());
alter table public.internal_secrets enable row level security;
revoke all on public.internal_secrets from anon, authenticated;
insert into public.internal_secrets(name, value) values ('health_secret', encode(extensions.gen_random_bytes(32), 'hex')) on conflict (name) do nothing;
create or replace function public.is_valid_internal_secret(p_name text, p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.internal_secrets where name = p_name and value = p_secret and coalesce(p_secret,'') <> '')
$$;
revoke execute on function public.is_valid_internal_secret(text, text) from public, anon, authenticated;
grant execute on function public.is_valid_internal_secret(text, text) to service_role;
