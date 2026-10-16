-- Veckosvep 2026-10-17: ägarpolicyer för UPDATE saknade WITH CHECK, så en
-- användare kunde flytta sin rad till en annan användare (user_id/id ändras).
alter policy "Users can update their own sessions" on public.diploma_sessions with check (auth.uid() = user_id);
alter policy "Users can update their own profile" on public.profiles with check (auth.uid() = id);
