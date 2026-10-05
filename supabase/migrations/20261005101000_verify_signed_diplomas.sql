-- Tidigare kunde vilken inloggad användare som helst skapa en rad i
-- signed_diplomas med egen hash, signatur och Hedera-uppgifter, som sedan
-- visades som verifierad. Nu registrerar edge-funktionen hedera-sign varje
-- lyckad Hedera-signering i hedera_signatures (bara service_role skriver),
-- och signed_diplomas godtar bara klientrader som matchar en registrering
-- och vars content_hash stämmer med innehållet.
create table if not exists public.hedera_signatures (
  diploma_id text primary key,
  issuer_id uuid not null,
  content_hash text not null,
  seal jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.hedera_signatures enable row level security;
drop policy if exists "Issuers can view their own signatures" on public.hedera_signatures;
create policy "Issuers can view their own signatures" on public.hedera_signatures
  for select to authenticated using (auth.uid() = issuer_id);

create or replace function public.verify_signed_diploma()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  recorded jsonb;
begin
  if current_user in ('anon', 'authenticated') then
    if new.content_hash is distinct from
       encode(sha256(convert_to(coalesce(new.diploma_html, '') || coalesce(new.diploma_css, ''), 'UTF8')), 'hex') then
      raise exception 'content_hash matchar inte diplomets innehåll';
    end if;
    select seal into recorded
      from public.hedera_signatures
     where diploma_id = new.blockchain_id
       and issuer_id = new.issuer_id
       and content_hash = new.content_hash;
    if recorded is null then
      raise exception 'Diplomet har inte signerats på Hedera';
    end if;
    new.diplomator_seal := recorded::text;
  end if;
  return new;
end;
$$;

drop trigger if exists verify_signed_diploma on public.signed_diplomas;
create trigger verify_signed_diploma
  before insert on public.signed_diplomas
  for each row execute function public.verify_signed_diploma();
